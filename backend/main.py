import json
import os
import sys
from datetime import datetime, timezone
from io import BytesIO
from typing import List

from fastapi import BackgroundTasks, Depends, FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pypdf import PdfReader

from backend.agents.vault_agent import check_nominee_health, extract_asset
from backend.agents.will_agent import generate_conflict_analysis, generate_will_pdf
from backend.db import (
    approve_obituary,
    calculate_score,
    create_asset,
    get_assets,
    get_escalation_state,
    get_monitor_logs,
    get_obituary,
    get_obituaries,
    get_queue_status,
    get_score_components,
    get_score_history,
    get_trusted_contacts,
    get_user,
    insert_score_history,
    on_assets_changed,
    reset_escalation,
    save_trusted_contacts,
    supabase,
    update_checkin,
    update_conflict_analysis,
)
from backend.scheduler import scheduler
from backend.omium_tracer import start_span, end_span, start_workflow, is_active as omium_is_active, discover_omium_api, get_trace_log, get_trace_stats
from backend.webhooks import router as webhooks_router
from backend.auth import router as auth_router, get_current_user_id, require_auth
from backend.utils import call_gemini_with_retry, call_gemini_json

app = FastAPI(title="GriefSync", version="0.1.0")

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhooks_router)
app.include_router(auth_router)


@app.on_event("startup")
async def startup():
    try:
        res = supabase.table("users").select("id").limit(1).execute()
        print("Supabase connected OK", flush=True)
    except Exception as e:
        print(f"Supabase connection error: {e}", flush=True)
    scheduler.start()
    print("Scheduler started (check_lifelines at 22:00 IST)", flush=True)
    if omium_is_active():
        print("Omium tracing: ACTIVE — dashboard at https://app.omium.ai/project/griefsync", flush=True)
        discover_omium_api()
    else:
        print("Omium tracing: DISABLED (set OMIUM_API_KEY to enable)", flush=True)


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# --- Vault Routes ---


async def _process_vault_upload(pdf_text: str, user_id: int):
    """Background task: extract asset from PDF text and run nominee health check."""
    wf_id = start_workflow(f"vault-{user_id}", "Vault upload")
    parsed = await extract_asset(pdf_text, user_id, workflow_id=wf_id)
    if not parsed:
        return

    # Check if extraction produced any meaningful data
    meaningful_fields = ["insurer_name", "policy_number", "nominee_name", "sum_assured", "asset_type"]
    has_data = any(
        parsed.get(f) and parsed.get(f) != "OTHER" and parsed.get(f) != "Unknown"
        for f in meaningful_fields
    )
    if not has_data:
        print(f"[vault] Extraction returned no meaningful data for user {user_id}, skipping asset creation", flush=True)
        return

    warnings = await check_nominee_health(parsed, workflow_id=wf_id)

    await create_asset(user_id, {
        "category": parsed.get("asset_type", "OTHER"),
        "label": parsed.get("insurer_name") or "Unknown",
        "policy_number": parsed.get("policy_number"),
        "nominee": parsed.get("nominee_name"),
        "nominee_relation": parsed.get("nominee_relation"),
        "expiry_date": parsed.get("expiry_date"),
        "sum_assured": parsed.get("sum_assured"),
        "raw_json": json.dumps(parsed),
        "warnings_json": json.dumps(warnings),
    })
    await on_assets_changed(user_id)


@app.post("/api/vault/upload", status_code=202)
async def vault_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    """Accepts PDF upload, extracts text, fires extraction pipeline in background."""
    contents = await file.read()
    try:
        reader = PdfReader(BytesIO(contents))
        pdf_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not pdf_text.strip() or len(pdf_text.strip()) < 20:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this document. It may be a scanned image or an unsupported format."
        )

    print(f"[vault_upload] Extracted {len(pdf_text)} chars from {file.filename} ({len(reader.pages)} pages)", flush=True)
    background_tasks.add_task(_process_vault_upload, pdf_text, user_id)
    return {"status": "accepted", "message": f"PDF queued for extraction ({len(reader.pages)} pages, {len(pdf_text)} chars)"}


class ManualAssetBody(BaseModel):
    asset_type: str = "OTHER"
    insurer_name: str = ""
    policy_number: str | None = None
    nominee_name: str | None = None
    nominee_relation: str | None = None
    expiry_date: str | None = None
    sum_assured: float | None = None


@app.post("/api/vault/manual")
async def vault_manual(body: ManualAssetBody, user_id: int = Depends(get_current_user_id)):
    """Accepts JSON body with asset fields, writes to DB, runs nominee health check."""
    asset_dict = body.model_dump()
    warnings = await check_nominee_health(asset_dict)

    asset = await create_asset(user_id, {
        "category": asset_dict.get("asset_type", "OTHER"),
        "label": asset_dict.get("insurer_name", "Unknown"),
        "policy_number": asset_dict.get("policy_number"),
        "nominee": asset_dict.get("nominee_name"),
        "nominee_relation": asset_dict.get("nominee_relation"),
        "expiry_date": asset_dict.get("expiry_date"),
        "sum_assured": asset_dict.get("sum_assured"),
        "raw_json": json.dumps(asset_dict),
        "warnings_json": json.dumps(warnings),
    })
    await on_assets_changed(user_id)
    return {"asset_id": asset["id"], "warnings": warnings}


@app.get("/api/vault/assets")
async def vault_assets(user_id: int = Depends(get_current_user_id)):
    """Returns all assets for the authenticated user."""
    assets = await get_assets(user_id)
    # Parse warnings_json back to list
    for asset in assets:
        wj = asset.get("warnings_json")
        asset["warnings"] = json.loads(wj) if wj else []
    return {"assets": assets}


@app.delete("/api/vault/assets/{asset_id}")
async def delete_asset(asset_id: int, user_id: int = Depends(get_current_user_id)):
    """Delete an asset by ID (only if it belongs to the authenticated user)."""
    # Verify ownership
    assets = await get_assets(user_id)
    if not any(a.get("id") == asset_id for a in assets):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Asset not found")
    supabase.table("assets").delete().eq("id", asset_id).execute()
    return {"status": "deleted", "asset_id": asset_id}


# --- Will Routes ---


@app.post("/api/will/analyze")
async def will_analyze(user_id: int = Depends(get_current_user_id)):
    """Load assets, run conflict analysis via Gemini with Google Search grounding."""
    assets = await get_assets(user_id)
    if not assets:
        return {"analysis": "No assets found. Upload assets first.", "asset_count": 0}

    analysis, grounding_used = await generate_conflict_analysis(assets)
    await update_conflict_analysis(user_id, analysis)
    return {"analysis": analysis, "asset_count": len(assets), "grounding_used": grounding_used}


@app.get("/api/will/pdf")
async def will_pdf(user_id: int = Depends(get_current_user_id)):
    """Generate and download will PDF using stored analysis."""
    user = await get_user(user_id)
    if not user:
        return {"error": "User not found"}

    assets = await get_assets(user_id)
    analysis = user.get("conflict_analysis") or "No analysis available. Run /api/will/analyze first."

    pdf_bytes = await generate_will_pdf(user, assets, analysis)
    if not pdf_bytes:
        return {"error": "PDF generation failed"}

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=griefsync_will.pdf"},
    )


class WillPdfBody(BaseModel):
    analysis: str = ""


@app.post("/api/will/pdf")
async def will_pdf_custom(body: WillPdfBody, user_id: int = Depends(get_current_user_id)):
    """Generate will PDF with custom/edited analysis text."""
    user = await get_user(user_id)
    if not user:
        return {"error": "User not found"}

    assets = await get_assets(user_id)
    analysis = body.analysis or user.get("conflict_analysis") or "No analysis available."

    # Also save the custom analysis to DB so it persists
    if body.analysis:
        await update_conflict_analysis(user_id, body.analysis)

    pdf_bytes = await generate_will_pdf(user, assets, analysis)
    if not pdf_bytes:
        return {"error": "PDF generation failed"}

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=griefsync_will.pdf"},
    )


# --- Lifeline Routes ---


@app.post("/api/checkin")
async def checkin(user_id: int = Depends(get_current_user_id)):
    """Reset last_checkin_at to now and escalation state to day 0."""
    await update_checkin(user_id)
    await reset_escalation(user_id)
    return {"status": "checked_in", "timestamp": datetime.now(timezone.utc).isoformat()}


class ContactBody(BaseModel):
    name: str
    email: str
    phone: str | None = None


@app.get("/api/lifeline/contacts")
async def get_lifeline_contacts(user_id: int = Depends(get_current_user_id)):
    """Return trusted contacts for the authenticated user."""
    contacts = await get_trusted_contacts(user_id)
    return {"contacts": contacts}


@app.post("/api/lifeline/contacts")
async def lifeline_contacts(contacts: List[ContactBody], user_id: int = Depends(get_current_user_id)):
    """Save up to 2 trusted contacts."""
    contact_dicts = [c.model_dump() for c in contacts[:2]]
    await save_trusted_contacts(user_id, contact_dicts)
    return {"status": "saved", "count": len(contact_dicts)}


@app.get("/api/lifeline/status")
async def lifeline_status(user_id: int = Depends(get_current_user_id)):
    """Return current escalation status."""
    user = await get_user(user_id)
    if not user:
        return {"error": "User not found"}

    state = await get_escalation_state(user_id)
    current_day = state["current_day"] if state else 0

    last = user["last_checkin_at"]
    last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
    days_since = (datetime.now(timezone.utc) - last_dt).days
    days_overdue = days_since - user["checkin_interval_days"]

    # Determine next action
    if current_day >= 30:
        next_action = "Stage 2 access granted"
    elif current_day >= 21:
        next_action = "Waiting for both contacts to confirm (day 30 → stage 2)"
    elif current_day >= 14:
        next_action = "Contact 2 will be notified at day 21"
    elif current_day >= 7:
        next_action = "Contact 1 will be notified at day 14"
    elif current_day >= 1:
        next_action = "Urgent reminder at day 7"
    else:
        next_action = "Reminder email at day 1" if days_overdue > 0 else "No action needed"

    contacts = await get_trusted_contacts(user_id)

    return {
        "current_day": current_day,
        "days_overdue": max(0, days_overdue),
        "days_since_checkin": days_since,
        "next_action": next_action,
        "trusted_contacts": len(contacts),
    }


# --- AI Q&A ---


class AskBody(BaseModel):
    question: str
    conversation_history: list = []


ASSISTANT_SYSTEM_PROMPT = """You are GriefSync's estate planning assistant for Indian families. You ONLY help with:
- Their insurance policies, EPF accounts, mutual funds, and property assets
- Indian succession law: Hindu Succession Act 1956, Indian Succession Act 1925, EPF Act nominee rules
- How to add nominees, resolve conflicts between nominees and legal heirs
- What the GriefSync app features do (vault, will analysis, lifeline check-in, trusted contacts, obituary)
- How to interpret their estate score and what each gap means
- General estate planning, wills, and nominee-related questions for Indian families

IMPORTANT: If the user asks about anything unrelated to estate planning, succession law, nominees, assets, wills, or GriefSync features — politely decline and redirect them. Say: "I can only help with estate planning, Indian succession law, and GriefSync features. How can I help you with your estate?"

Always be warm, clear, and non-alarming. Recommend consulting a qualified lawyer for specific legal decisions.
Never invent legal facts — stick to well-established Indian succession law principles.
Keep responses under 200 words unless the user asks for detail.

After your answer, on a new line write "FOLLOW_UPS:" followed by exactly 3 short follow-up questions the user might ask next, separated by "|". Example:
FOLLOW_UPS: What is a Class I heir?|How do I update my LIC nominee?|What happens after 30 days of no check-in?"""


@app.post("/api/ask")
async def ask(body: AskBody, user_id: int = Depends(require_auth)):
    """AI Q&A with rich estate context — requires authentication."""
    sid = start_span("qa", "assistant.answer")
    try:
        # Build rich context
        assets = await get_assets(user_id)
        user = await get_user(user_id)
        score_data = await calculate_score(user_id)
        contacts = await get_trusted_contacts(user_id)
        state = await get_escalation_state(user_id)

        asset_lines = []
        for a in assets:
            line = f"{a.get('category', 'Unknown')}: {a.get('label', 'N/A')}"
            if a.get("nominee"):
                line += f" | Nominee: {a['nominee']}"
            if a.get("sum_assured"):
                line += f" | ₹{a['sum_assured']:,.0f}"
            asset_lines.append(line)
        assets_summary = "\n".join(asset_lines) if asset_lines else "No assets recorded."

        context = (
            f"USER CONTEXT:\n"
            f"Name: {user.get('name', 'Unknown') if user else 'Unknown'}\n"
            f"Estate Score: {score_data['score']}/100\n"
            f"Score Breakdown: Assets={score_data['breakdown'].get('assets')}, "
            f"Analysis={score_data['breakdown'].get('analysis')}, "
            f"Contacts={score_data['breakdown'].get('contacts')}, "
            f"Obituary={score_data['breakdown'].get('obituary')}\n"
            f"Trusted Contacts: {len(contacts)}\n"
            f"Escalation Day: {state['current_day'] if state else 0}\n"
            f"Conflict Analysis: {'Done' if user and user.get('conflict_analysis') else 'Not yet run'}\n\n"
            f"ASSETS:\n{assets_summary}"
        )

        # Build conversation
        history_text = ""
        for msg in body.conversation_history[-6:]:  # last 6 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_text += f"\n{role.upper()}: {content}"

        prompt = (
            f"{ASSISTANT_SYSTEM_PROMPT}\n\n"
            f"{context}\n\n"
            f"CONVERSATION HISTORY:{history_text}\n\n"
            f"USER: {body.question}\n\nASSISTANT:"
        )

        response = call_gemini_with_retry(prompt)
        full_text = response.text

        # Parse follow-ups
        answer = full_text
        suggested_follow_ups = []
        if "FOLLOW_UPS:" in full_text:
            parts = full_text.split("FOLLOW_UPS:")
            answer = parts[0].strip()
            if len(parts) > 1:
                suggested_follow_ups = [q.strip() for q in parts[1].strip().split("|") if q.strip()][:3]

        end_span(sid, output={"question_length": len(body.question)})
        return {"answer": answer, "suggested_follow_ups": suggested_follow_ups}
    except Exception as e:
        print(f"[ask] error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))
        return {"answer": f"Sorry, I couldn't process your question: {e}", "suggested_follow_ups": []}


# --- Estate Score ---


@app.get("/api/score")
async def score(user_id: int = Depends(get_current_user_id)):
    """Estate completeness score 0–100."""
    return await calculate_score(user_id)


@app.get("/api/score/history")
async def score_history(user_id: int = Depends(get_current_user_id)):
    """Last 30 score_history rows."""
    history = await get_score_history(user_id, limit=30)
    return {"history": history}


# --- Onboarding Gaps ---


@app.get("/api/onboarding/gaps")
async def onboarding_gaps(user_id: int = Depends(get_current_user_id)):
    """Check for onboarding gaps and return actionable messages."""
    user = await get_user(user_id)
    assets = await get_assets(user_id)
    contacts = await get_trusted_contacts(user_id)
    obituaries = await get_obituaries(user_id)

    gaps = []

    if not assets:
        gaps.append("No insurance or financial assets recorded — your family has no roadmap")

    if assets and any(not a.get("nominee") for a in assets):
        gaps.append("One or more assets have no nominee — funds could be disputed for years")

    if not user or not user.get("conflict_analysis"):
        gaps.append("Estate conflicts unreviewed — your nominees may contradict Indian succession law")

    if len(contacts) < 2:
        gaps.append("No trusted contacts set — no one will know to check if you stop responding")

    if not obituaries:
        gaps.append("No final message written — the people you love will have nothing from you")

    return {"gaps": gaps}


# --- AI Conflict Resolution ---


class ConflictResolutionBody(BaseModel):
    action: str = "analyze"  # "analyze" or "apply"
    recommendation_id: str | None = None


@app.post("/api/conflicts/analyze")
async def analyze_conflicts(user_id: int = Depends(get_current_user_id)):
    """Detect conflicts across all assets and return actionable recommendations."""
    assets = await get_assets(user_id)
    contacts = await get_trusted_contacts(user_id)
    user = await get_user(user_id)
    
    if not assets:
        return {"conflicts": [], "recommendations": []}
    
    # Build context for AI
    asset_summary = []
    for a in assets:
        entry = f"- {a.get('category', 'Unknown')}: {a.get('label', 'N/A')}"
        if a.get('nominee'):
            entry += f" | Nominee: {a['nominee']} ({a.get('nominee_relation', 'unknown')})"
        else:
            entry += " | NO NOMINEE"
        if a.get('sum_assured'):
            entry += f" | ₹{a['sum_assured']:,.0f}"
        asset_summary.append(entry)
    
    prompt = f"""You are an Indian estate conflict detection engine. Analyze these assets for conflicts.

USER: {user.get('name', 'Unknown') if user else 'Unknown'}
TRUSTED CONTACTS: {len(contacts)}
ASSETS:
{chr(10).join(asset_summary)}

Detect ALL of these conflict types:
1. Missing nominee on any asset
2. Nominee differs from likely legal heir (under Hindu Succession Act)
3. Same person nominated across all assets (concentration risk)
4. High-value asset with non-immediate-family nominee
5. No executor designated
6. Contradictory allocations

For each conflict found, provide:
- id: unique short id like "conflict-1"
- severity: "high", "medium", or "low"
- type: conflict type name
- asset: which asset is affected
- description: clear explanation
- legal_basis: relevant Indian law
- recommendations: array of 2-3 actionable fixes, each with:
  - id: like "rec-1a"
  - action: short action label
  - description: what it does
  - impact: what changes

Return ONLY valid JSON with this structure:
{{"conflicts": [...], "summary": "brief overall assessment"}}"""

    try:
        response = call_gemini_json(prompt)
        raw = response.text
        import re as _re
        raw = _re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = _re.sub(r"\s*```$", "", raw.strip())
        result = json.loads(raw)
        return result
    except Exception as e:
        return {"conflicts": [], "summary": f"Analysis failed: {e}"}


@app.post("/api/will/edit")
async def will_edit(body: AskBody, user_id: int = Depends(require_auth)):
    """AI-powered will editing — takes natural language instructions and returns structured changes."""
    assets = await get_assets(user_id)
    user = await get_user(user_id)
    current_analysis = user.get("conflict_analysis", "") if user else ""
    
    asset_lines = []
    for a in assets:
        line = f"- {a.get('category', 'Unknown')}: {a.get('label', 'N/A')}"
        if a.get('nominee'):
            line += f" → {a['nominee']} ({a.get('nominee_relation', '')})"
        if a.get('sum_assured'):
            line += f" [₹{a['sum_assured']:,.0f}]"
        asset_lines.append(line)
    
    prompt = f"""You are an AI will editor for Indian estate planning. The user wants to modify their will/estate plan.

CURRENT ASSETS AND ALLOCATIONS:
{chr(10).join(asset_lines)}

CURRENT WILL ANALYSIS:
{current_analysis[:2000] if current_analysis else "No analysis yet."}

USER REQUEST: {body.question}

Based on the user's request:
1. Explain what changes you recommend
2. List specific modifications to make
3. Flag any legal concerns under Indian succession law
4. Provide the updated allocation structure

Keep response under 300 words. Be specific about which assets and beneficiaries are affected.

After your answer, on a new line write "FOLLOW_UPS:" followed by exactly 3 short follow-up questions separated by "|"."""

    try:
        response = call_gemini_with_retry(prompt)
        full_text = response.text
        answer = full_text
        suggested_follow_ups = []
        if "FOLLOW_UPS:" in full_text:
            parts = full_text.split("FOLLOW_UPS:")
            answer = parts[0].strip()
            if len(parts) > 1:
                suggested_follow_ups = [q.strip() for q in parts[1].strip().split("|") if q.strip()][:3]
        return {"answer": answer, "suggested_follow_ups": suggested_follow_ups}
    except Exception as e:
        return {"answer": f"Could not process: {e}", "suggested_follow_ups": []}


# --- Monitor ---


@app.get("/api/monitor/log")
async def monitor_log():
    """Returns last 20 monitor_log entries."""
    logs = await get_monitor_logs(20)
    return {"logs": logs}


# --- Trace / Observability ---


@app.get("/api/trace/log")
async def trace_log():
    """Returns recent trace entries from Omium for frontend display."""
    entries = get_trace_log(50)
    return {"entries": entries}


@app.get("/api/trace/stats")
async def trace_stats():
    """Returns aggregate trace stats (error rates, agent performance)."""
    stats = get_trace_stats()
    stats["omium_active"] = omium_is_active()
    return stats


# --- Queue Status ---


@app.get("/api/queue/status")
async def queue_status():
    """Returns analysis queue stats."""
    status = await get_queue_status()
    return status


@app.post("/api/queue/drain")
async def drain_queue_now():
    """Demo: immediately drain the analysis queue instead of waiting 5 minutes."""
    from backend.scheduler import drain_analysis_queue
    await drain_analysis_queue()
    return {"status": "drained"}


# --- Obituary ---


@app.get("/api/obituary")
async def get_obituary_route(user_id: int = Depends(get_current_user_id)):
    """Returns current obituary draft (approved or not) for the authenticated user."""
    obit = await get_obituary(user_id)
    if not obit:
        return {"draft": None, "draft_approved": False}
    return {
        "draft": obit.get("message_encrypted"),
        "draft_approved": obit.get("draft_approved", False),
        "id": obit.get("id"),
    }


@app.post("/api/obituary/approve")
async def approve_obituary_route(user_id: int = Depends(get_current_user_id)):
    """Mark the user's obituary draft as approved."""
    await approve_obituary(user_id)
    return {"status": "approved"}


@app.post("/api/obituary/draft")
async def draft_obituary_route(user_id: int = Depends(get_current_user_id)):
    """Manually trigger obituary draft for the authenticated user."""
    from backend.agents.obituary_agent import draft_obituary
    draft = await draft_obituary(user_id)
    if draft:
        return {"status": "drafted", "preview": draft[:150]}
    return {"status": "no_draft", "message": "Add assets and contacts first"}
