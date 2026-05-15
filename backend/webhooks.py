"""Webhook handlers for GriefSync."""

import json
import os

from fastapi import APIRouter, BackgroundTasks, Query
from fastapi.responses import HTMLResponse
from jose import jwt, JWTError
from pydantic import BaseModel

from backend import db
from backend.agents.vault_agent import check_nominee_health
from backend.agents import notify_agent
from backend.omium_tracer import link_webhook, start_span, end_span

router = APIRouter(prefix="/webhook")


# --- Vault Webhooks ---


class VaultUploadCompleteBody(BaseModel):
    user_id: int
    asset_id: int


async def _recheck_nominee(asset_id: int):
    """Re-run nominee health check if warnings_json is null."""
    asset = await db.get_asset_by_id(asset_id)
    if not asset:
        return
    if asset.get("warnings_json") is not None:
        return

    raw = asset.get("raw_json")
    if not raw:
        return
    asset_dict = json.loads(raw)
    warnings = await check_nominee_health(asset_dict)
    await db.update_asset_warnings(asset_id, json.dumps(warnings))


@router.post("/vault/upload-complete")
async def vault_upload_complete(
    body: VaultUploadCompleteBody,
    background_tasks: BackgroundTasks,
):
    """Async extraction trigger — returns 200 immediately."""
    span_id = start_span(f"vault-{body.user_id}", "webhook.vault_upload_complete")
    link_webhook(span_id, f"vault-{body.user_id}", "vault/upload-complete")
    end_span(span_id)

    background_tasks.add_task(_recheck_nominee, body.asset_id)
    return {"status": "accepted"}


# --- Contact Response Webhook ---


async def _process_contact_response(user_id: int, contact_id: int, action: str):
    """Process trusted contact response in background."""
    span_id = start_span(f"lifeline-{user_id}", "webhook.contact_response")
    link_webhook(span_id, f"lifeline-{user_id}", "trusted_contact_confirmed")

    try:
        if action == "halt":
            # Contact says user is fine — reset escalation
            await db.reset_escalation(user_id)
            user = await db.get_user(user_id)
            if user:
                await notify_agent.send_email(
                    user["email"],
                    "GriefSync — Escalation halted",
                    "A trusted contact has confirmed you are safe. Your escalation has been reset. "
                    "Please check in when you can.",
                    span_id,
                )
            end_span(span_id, output={"action": "halt", "escalation_reset": True})

        elif action == "confirm":
            # Contact confirms they are aware — mark as confirmed
            await db.confirm_contact(contact_id)
            # Check if enough contacts confirmed → trigger stage2
            confirmed = await db.get_confirmed_contacts(user_id)
            STAGE2_THRESHOLD = int(os.getenv("STAGE2_THRESHOLD", "1"))
            if len(confirmed) >= STAGE2_THRESHOLD:
                from backend.agents.lifeline_agent import stage2_access
                await stage2_access(user_id)
            end_span(span_id, output={"action": "confirm", "confirmed_count": len(confirmed)})
        else:
            end_span(span_id, error=f"unknown_action: {action}")
    except Exception as e:
        end_span(span_id, error=str(e))


@router.get("/contact/response", response_class=HTMLResponse)
async def contact_response(
    background_tasks: BackgroundTasks,
    token: str = Query(...),
    action: str = Query(default="confirm"),
):
    """Trusted contact click handler — verify JWT, process in background, return HTML."""
    secret = os.getenv("SECRET_KEY")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        user_id = payload["user_id"]
        contact_id = payload["contact_id"]
    except JWTError:
        return HTMLResponse(
            "<html><body><h2>Invalid or expired link.</h2></body></html>",
            status_code=400,
        )

    background_tasks.add_task(_process_contact_response, user_id, contact_id, action)
    return HTMLResponse(
        "<html><body><h2>Thank you. Your response has been recorded.</h2></body></html>"
    )
