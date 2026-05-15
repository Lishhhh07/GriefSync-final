import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client
from datetime import datetime

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")  # service role key for backend
supabase: Client = create_client(url, key)


# --- Users ---


async def get_user(user_id: int) -> dict | None:
    res = supabase.table("users").select("*").eq("id", user_id).single().execute()
    return res.data


async def get_all_users() -> list[dict]:
    res = supabase.table("users").select("*").execute()
    return res.data or []


async def create_user(name: str, email: str, checkin_interval_days: int = 7) -> dict:
    res = supabase.table("users").insert({
        "name": name,
        "email": email,
        "checkin_interval_days": checkin_interval_days,
        "last_checkin_at": datetime.utcnow().isoformat()
    }).execute()
    return res.data[0]


async def update_checkin(user_id: int):
    supabase.table("users").update({
        "last_checkin_at": datetime.utcnow().isoformat()
    }).eq("id", user_id).execute()


async def update_conflict_analysis(user_id: int, analysis: str):
    supabase.table("users").update({
        "conflict_analysis": analysis
    }).eq("id", user_id).execute()


async def set_stage2_unlocked(user_id: int):
    supabase.table("users").update({
        "stage2_unlocked": True
    }).eq("id", user_id).execute()


# --- Assets ---


async def get_assets(user_id: int) -> list[dict]:
    res = supabase.table("assets").select("*").eq("user_id", user_id).execute()
    return res.data or []


async def create_asset(user_id: int, asset_data: dict) -> dict:
    payload = {"user_id": user_id, **asset_data}
    res = supabase.table("assets").insert(payload).execute()
    return res.data[0]


async def get_asset_by_id(asset_id: int) -> dict | None:
    res = supabase.table("assets").select("*").eq("id", asset_id).single().execute()
    return res.data


async def update_asset_warnings(asset_id: int, warnings_json: str):
    supabase.table("assets").update({
        "warnings_json": warnings_json
    }).eq("id", asset_id).execute()


# --- Trusted Contacts ---


async def get_trusted_contacts(user_id: int) -> list[dict]:
    res = supabase.table("trusted_contacts").select("*").eq("user_id", user_id).order("id").execute()
    return res.data or []


async def get_confirmed_contacts(user_id: int) -> list[dict]:
    res = supabase.table("trusted_contacts").select("*").eq("user_id", user_id).eq("confirmed", True).execute()
    return res.data or []


async def save_trusted_contacts(user_id: int, contacts: list[dict]):
    # Delete existing and reinsert (simple upsert for demo)
    supabase.table("trusted_contacts").delete().eq("user_id", user_id).execute()
    for c in contacts:
        supabase.table("trusted_contacts").insert({"user_id": user_id, **c}).execute()


async def confirm_contact(contact_id: int):
    supabase.table("trusted_contacts").update({
        "confirmed": True,
        "notified_at": datetime.utcnow().isoformat()
    }).eq("id", contact_id).execute()


# --- Escalation State ---


async def get_escalation_state(user_id: int) -> dict | None:
    res = supabase.table("escalation_state").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None


async def upsert_escalation_state(user_id: int, current_day: int):
    supabase.table("escalation_state").upsert({
        "user_id": user_id,
        "current_day": current_day,
        "last_action_at": datetime.utcnow().isoformat()
    }).execute()


async def reset_escalation(user_id: int):
    await upsert_escalation_state(user_id, 0)


# --- Obituaries ---


async def get_obituaries(user_id: int) -> list[dict]:
    res = supabase.table("obituaries").select("*").eq("user_id", user_id).execute()
    return res.data or []


async def get_obituary(user_id: int) -> dict | None:
    """Get the first obituary draft for a user (if any)."""
    res = supabase.table("obituaries").select("*").eq("user_id", user_id).limit(1).execute()
    return res.data[0] if res.data else None


async def create_obituary(user_id: int, recipient_name: str, recipient_email: str, message: str):
    supabase.table("obituaries").insert({
        "user_id": user_id,
        "recipient_name": recipient_name,
        "recipient_email": recipient_email,
        "message_encrypted": message,
        "delivered": False
    }).execute()


async def create_obituary_draft(user_id: int, message: str):
    """Create an unapproved draft obituary."""
    supabase.table("obituaries").insert({
        "user_id": user_id,
        "recipient_name": "Family",
        "recipient_email": None,
        "message_encrypted": message,
        "delivered": False,
        "draft_approved": False,
    }).execute()


async def approve_obituary(user_id: int):
    """Mark the user's obituary draft as approved."""
    supabase.table("obituaries").update({
        "draft_approved": True
    }).eq("user_id", user_id).execute()


# --- Score helpers ---


async def get_score_components(user_id: int) -> dict:
    assets = await get_assets(user_id)
    user = await get_user(user_id)
    contacts = await get_trusted_contacts(user_id)
    obituaries = await get_obituaries(user_id)
    return {
        "assets": any(a.get("nominee") for a in assets),
        "analysis": bool(user and user.get("conflict_analysis")),
        "contacts": len(contacts) >= 2,
        "obituary": len(obituaries) > 0
    }


async def calculate_score(user_id: int) -> dict:
    """Shared score calculation — used by route and scheduler."""
    components = await get_score_components(user_id)
    total = 0
    if components["assets"]:
        total += 25
    if components["analysis"]:
        total += 25
    if components["contacts"]:
        total += 25
    if components["obituary"]:
        total += 25
    return {"score": total, "breakdown": components}


# --- Monitor Log ---


async def get_monitor_logs(limit: int = 20) -> list[dict]:
    res = supabase.table("monitor_log").select("*").order("checked_at", desc=True).limit(limit).execute()
    return res.data or []


# --- Analysis Queue ---


async def on_assets_changed(user_id: int):
    """Called after any asset INSERT/UPDATE. Enqueues re-analysis if stale."""
    user = await get_user(user_id)
    if not user:
        return

    # Check if analysis was run in the last hour
    # If conflict_analysis is null or user has no recent analysis, enqueue
    # For simplicity: always enqueue, the drain job deduplicates by checking pending
    existing = supabase.table("analysis_queue").select("id").eq("user_id", user_id).eq("status", "pending").execute()
    if existing.data:
        return  # already pending, don't duplicate

    supabase.table("analysis_queue").insert({
        "user_id": user_id,
        "queued_at": datetime.utcnow().isoformat(),
        "status": "pending",
    }).execute()


async def get_pending_analyses(limit: int = 5) -> list[dict]:
    res = supabase.table("analysis_queue").select("*").eq("status", "pending").order("queued_at").limit(limit).execute()
    return res.data or []


async def update_analysis_status(queue_id: int, status: str):
    supabase.table("analysis_queue").update({"status": status}).eq("id", queue_id).execute()


async def get_queue_status() -> dict:
    """Return queue stats: pending, done in last hour, failed."""
    pending = supabase.table("analysis_queue").select("id", count="exact").eq("status", "pending").execute()
    from datetime import timedelta
    one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    done = supabase.table("analysis_queue").select("id", count="exact").eq("status", "done").gte("queued_at", one_hour_ago).execute()
    failed = supabase.table("analysis_queue").select("id", count="exact").eq("status", "failed").execute()
    return {
        "pending": pending.count or 0,
        "done_last_hour": done.count or 0,
        "failed": failed.count or 0,
    }


# --- Score History ---


async def insert_score_history(user_id: int, score: int, breakdown: dict):
    import json
    supabase.table("score_history").insert({
        "user_id": user_id,
        "score": score,
        "breakdown_json": json.dumps(breakdown),
        "recorded_at": datetime.utcnow().isoformat(),
    }).execute()


async def get_score_history(user_id: int, limit: int = 30) -> list[dict]:
    res = supabase.table("score_history").select("*").eq("user_id", user_id).order("recorded_at", desc=True).limit(limit).execute()
    return res.data or []


async def get_score_at(user_id: int, days_ago: int = 7) -> dict | None:
    """Get the score recorded closest to N days ago."""
    from datetime import timedelta
    target = (datetime.utcnow() - timedelta(days=days_ago)).isoformat()
    res = supabase.table("score_history").select("*").eq("user_id", user_id).lte("recorded_at", target).order("recorded_at", desc=True).limit(1).execute()
    return res.data[0] if res.data else None
