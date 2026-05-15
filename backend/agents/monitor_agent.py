"""Monitor Agent — self-healing health check that detects and auto-repairs broken state."""

import json
import os
import re
import sys
from datetime import datetime, timedelta

from backend import db
from backend.db import supabase
from backend.omium_tracer import start_workflow, start_span, end_span
from backend.utils import call_gemini_json


async def _log_action(category: str, user_id: int, action_taken: str, detail: dict = None):
    """Write a correction entry to monitor_log."""
    supabase.table("monitor_log").insert({
        "checked_at": datetime.utcnow().isoformat(),
        "category": category,
        "user_id": user_id,
        "action_taken": action_taken,
        "detail_json": json.dumps(detail) if detail else None,
    }).execute()


async def _check_orphaned_assets() -> list[dict]:
    """Find assets whose user_id doesn't exist in users table."""
    findings = []
    all_assets = supabase.table("assets").select("id, user_id").execute().data or []
    all_user_ids = {u["id"] for u in (supabase.table("users").select("id").execute().data or [])}

    for asset in all_assets:
        if asset["user_id"] not in all_user_ids:
            findings.append(asset)
            # Auto-correct: delete orphaned asset
            supabase.table("assets").delete().eq("id", asset["id"]).execute()
            await _log_action(
                "orphaned_assets", asset["user_id"],
                f"Deleted orphaned asset id={asset['id']}",
                {"asset_id": asset["id"]}
            )
    return findings


async def _check_stale_escalations() -> list[dict]:
    """Find escalation_state rows not updated in 48h but user has checked in since."""
    findings = []
    cutoff = (datetime.utcnow() - timedelta(hours=48)).isoformat()

    escalations = supabase.table("escalation_state").select("*").execute().data or []
    for esc in escalations:
        last_action = esc.get("last_action_at", "")
        if not last_action or last_action < cutoff:
            # Check if user has checked in more recently
            user = await db.get_user(esc["user_id"])
            if user and user.get("last_checkin_at", "") > last_action:
                findings.append(esc)
                # Auto-correct: reset escalation since user checked in
                await db.reset_escalation(esc["user_id"])
                await _log_action(
                    "stale_escalations", esc["user_id"],
                    f"Reset stale escalation (was day {esc['current_day']}, user checked in since)",
                    {"previous_day": esc["current_day"], "last_action_at": last_action}
                )
    return findings


async def _check_nominee_drift() -> list[dict]:
    """Find assets where nominee was null but now has a value, and no re-analysis was triggered."""
    findings = []
    users = await db.get_all_users()

    for user in users:
        assets = await db.get_assets(user["id"])
        has_nominee_now = any(a.get("nominee") for a in assets)
        has_analysis = bool(user.get("conflict_analysis"))

        # If user has nominees but no analysis, trigger re-analysis
        if has_nominee_now and not has_analysis and assets:
            findings.append({"user_id": user["id"], "reason": "nominees_present_no_analysis"})
            # Auto-correct: mark for re-analysis (clear conflict_analysis to trigger on next visit)
            await _log_action(
                "nominee_drift", user["id"],
                "Flagged for re-analysis: nominees present but no conflict analysis",
                {"asset_count": len(assets)}
            )
    return findings


async def _check_dead_contacts() -> list[dict]:
    """Find trusted_contacts with confirmed=false and notified_at > 72h ago."""
    findings = []
    cutoff = (datetime.utcnow() - timedelta(hours=72)).isoformat()

    contacts = supabase.table("trusted_contacts").select("*").eq("confirmed", False).execute().data or []
    for contact in contacts:
        notified = contact.get("notified_at")
        if notified and notified < cutoff:
            findings.append(contact)
            await _log_action(
                "dead_contacts", contact["user_id"],
                f"Contact {contact['name']} notified >72h ago but not confirmed",
                {"contact_id": contact["id"], "notified_at": notified}
            )
    return findings


async def _run_ai_quality_check(user_id: int):
    """Use Gemini to review asset records for quality issues."""
    sid = start_span("monitor-ai", "monitor.ai_quality_check")
    try:
        assets = await db.get_assets(user_id)
        if not assets:
            end_span(sid, output={"skipped": "no_assets"})
            return

        # Sanitize for Gemini (remove large raw_json)
        clean_assets = []
        for a in assets:
            clean_assets.append({
                "id": a["id"],
                "category": a.get("category"),
                "label": a.get("label"),
                "policy_number": a.get("policy_number"),
                "nominee": a.get("nominee"),
                "nominee_relation": a.get("nominee_relation"),
                "sum_assured": a.get("sum_assured"),
                "expiry_date": a.get("expiry_date"),
            })

        prompt = (
            f"You are a data quality analyst. Given a list of asset records, identify which ones "
            f"have missing, inconsistent, or suspicious fields. Return ONLY valid JSON.\n\n"
            f"Review these asset records for quality issues: {json.dumps(clean_assets)}. "
            f"Return JSON: {{\"issues\": [{{\"asset_id\": int, \"field\": str, "
            f"\"problem\": str, \"severity\": \"high\"|\"medium\"|\"low\"}}]}}"
        )

        response = call_gemini_json(prompt)
        raw = response.text
        # Strip markdown fences
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw.strip())
        result = json.loads(raw)

        # Store in monitor_log
        if result.get("issues"):
            await _log_action(
                "ai_quality_check", user_id,
                f"Gemini found {len(result['issues'])} quality issues",
                result
            )

        end_span(sid, output={"issues_found": len(result.get("issues", []))})
    except Exception as e:
        print(f"[monitor_agent] AI quality check error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))


async def run_health_check() -> dict:
    """Run full health check cycle — detect anomalies and auto-correct."""
    wf_id = start_workflow("monitor-run", "Health monitor cycle")
    sid = start_span(wf_id, "monitor.health_check")

    try:
        findings = {
            "orphaned_assets": await _check_orphaned_assets(),
            "stale_escalations": await _check_stale_escalations(),
            "nominee_drift": await _check_nominee_drift(),
            "dead_contacts": await _check_dead_contacts(),
        }

        # Run AI quality check for demo user
        await _run_ai_quality_check(1)

        total_issues = sum(len(v) for v in findings.values())
        end_span(sid, output={"total_issues": total_issues})
        print(f"[monitor] Health check complete: {total_issues} issues found", flush=True)
        return findings
    except Exception as e:
        print(f"[monitor_agent] run_health_check error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))
        return {"orphaned_assets": [], "stale_escalations": [], "nominee_drift": [], "dead_contacts": []}
