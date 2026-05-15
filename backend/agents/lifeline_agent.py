"""Lifeline Agent — state machine that escalates through trusted contacts on check-in miss."""

import os
import sys
from datetime import datetime, timedelta

from jose import jwt

from backend import db
from backend.agents import notify_agent
from backend.omium_tracer import start_workflow, start_span, end_span
from backend.utils import call_gemini_with_retry


async def generate_contact_message(
    contact_name: str, user_name: str, days: int, access_url: str
) -> str:
    """Generate a warm notification message for a trusted contact."""
    sid = start_span("lifeline-msg", "lifeline.generate_message")
    try:
        prompt = (
            f"Write warm, non-alarming notification messages for a check-in safety system. "
            f"Keep messages under 100 words. Plain text only, no markdown.\n\n"
            f"Write a message to {contact_name}. Their friend {user_name} set up a "
            f"check-in system and has not responded in {days} days. Include this link "
            f"for more information: {access_url}. Be warm and non-alarming — this may "
            f"be a technical issue."
        )
        response = call_gemini_with_retry(prompt)
        end_span(sid, output={"length": len(response.text)})
        return response.text
    except Exception as e:
        print(f"[lifeline_agent] generate_contact_message error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))
        # Fallback message if Gemini fails
        return (
            f"Hi {contact_name}, this is an automated message from GriefSync. "
            f"{user_name} has not checked in for {days} days. This may be a technical "
            f"issue. Please visit {access_url} for more information."
        )


def generate_access_url(user_id: int, contact_id: int) -> str:
    """Generate a signed JWT URL for trusted contact response."""
    token = jwt.encode(
        {
            "user_id": user_id,
            "contact_id": contact_id,
            "exp": datetime.utcnow() + timedelta(hours=72),
        },
        os.getenv("SECRET_KEY"),
        algorithm="HS256",
    )
    base_url = os.getenv("BASE_URL", "http://localhost:8000")
    return f"{base_url}/webhook/contact/response?token={token}&action=confirm"


async def stage2_access(user_id: int):
    """Unlock stage 2 — send full asset summary to all trusted contacts."""
    sid = start_span(f"lifeline-{user_id}", "lifeline.stage2_access")
    try:
        await db.set_stage2_unlocked(user_id)
        user = await db.get_user(user_id)
        contacts = await db.get_trusted_contacts(user_id)
        assets = await db.get_assets(user_id)

        # Build asset summary
        asset_lines = []
        for a in assets:
            line = f"• {a.get('category', 'Unknown')}: {a.get('label', 'N/A')}"
            if a.get("nominee"):
                line += f" (Nominee: {a['nominee']})"
            if a.get("sum_assured"):
                line += f" — ₹{a['sum_assured']:,.0f}"
            asset_lines.append(line)
        asset_summary = "<br>".join(asset_lines)

        body = (
            f"This is an automated message from GriefSync.<br><br>"
            f"{user['name']}'s estate information is now accessible to trusted contacts.<br><br>"
            f"<strong>Assets on record:</strong><br>{asset_summary}<br><br>"
            f"Please consult a qualified lawyer for next steps."
        )

        for contact in contacts:
            await notify_agent.send_email(
                contact["email"],
                f"GriefSync — Estate information for {user['name']}",
                body,
                sid,
            )
        end_span(sid, output={"contacts_notified": len(contacts)})
    except Exception as e:
        print(f"[lifeline_agent] stage2_access error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))


async def advance_escalation(user_id: int, days_overdue: int):
    """
    Advance the escalation state machine.
    CRITICAL PATTERN: write to DB first, then notify. Never the reverse.
    """
    wf_id = start_workflow(f"lifeline-{user_id}", "Escalation run")
    s_parent = start_span(wf_id, "lifeline.escalation_run")

    try:
        user = await db.get_user(user_id)
        if not user:
            end_span(s_parent, error="user_not_found")
            return

        state = await db.get_escalation_state(user_id)
        current_day = state["current_day"] if state else 0

        # Day 1: Reminder email to user
        if days_overdue >= 1 and current_day < 1:
            s = start_span(wf_id, "lifeline.step_day1", s_parent)
            await db.upsert_escalation_state(user_id, 1)  # write DB first
            await notify_agent.send_email(
                user["email"],
                "GriefSync Check-in Reminder",
                "You haven't checked in recently. Tap your GriefSync app to check in "
                "and keep your family protected.",
                s,
            )
            end_span(s, output={"step": "day1", "action": "reminder_email"})

        # Day 7: Urgent email to user
        if days_overdue >= 7 and current_day < 7:
            s = start_span(wf_id, "lifeline.step_day7", s_parent)
            await db.upsert_escalation_state(user_id, 7)
            await notify_agent.send_email(
                user["email"],
                "GriefSync — Urgent Check-in Required",
                "7 days since your last check-in. Your trusted contacts will be notified "
                "soon. Please open GriefSync.",
                s,
            )
            end_span(s, output={"step": "day7", "action": "urgent_email"})

        # Day 14: Notify first trusted contact
        if days_overdue >= 14 and current_day < 14:
            s = start_span(wf_id, "lifeline.step_day14", s_parent)
            contacts = await db.get_trusted_contacts(user_id)
            if contacts:
                contact1 = contacts[0]
                access_url = generate_access_url(user_id, contact1["id"])
                msg = await generate_contact_message(
                    contact1["name"], user["name"], 14, access_url
                )
                await db.upsert_escalation_state(user_id, 14)
                await notify_agent.send_email(
                    contact1["email"],
                    f"A note about {user['name']}",
                    msg,
                    s,
                )
                # SMS to contact if phone on file
                if contact1.get("phone"):
                    sms_body = (
                        f"Hi {contact1['name']}, {user['name']} hasn't checked in for 14 days. "
                        f"Please check your email from GriefSync for details."
                    )
                    await notify_agent.send_sms(contact1["phone"], sms_body, s)
                    print(f"[lifeline] SMS sent to contact1 phone={contact1['phone']}", flush=True)
            end_span(s, output={"step": "day14", "action": "contact1_notified"})

        # Day 21: Notify second trusted contact
        if days_overdue >= 21 and current_day < 21:
            s = start_span(wf_id, "lifeline.step_day21", s_parent)
            contacts = await db.get_trusted_contacts(user_id)
            if len(contacts) >= 2:
                contact2 = contacts[1]
                access_url = generate_access_url(user_id, contact2["id"])
                msg = await generate_contact_message(
                    contact2["name"], user["name"], 21, access_url
                )
                await db.upsert_escalation_state(user_id, 21)
                await notify_agent.send_email(
                    contact2["email"],
                    f"A note about {user['name']}",
                    msg,
                    s,
                )
                # SMS to contact if phone on file
                if contact2.get("phone"):
                    sms_body = (
                        f"Hi {contact2['name']}, {user['name']} hasn't checked in for 21 days. "
                        f"Please check your email from GriefSync for details."
                    )
                    await notify_agent.send_sms(contact2["phone"], sms_body, s)
                    print(f"[lifeline] SMS sent to contact2 phone={contact2['phone']}", flush=True)
            end_span(s, output={"step": "day21", "action": "contact2_notified"})

        # Day 30: Stage 2 access (contacts must have confirmed)
        if days_overdue >= 30 and current_day < 30:
            s = start_span(wf_id, "lifeline.step_day30", s_parent)
            confirmed = await db.get_confirmed_contacts(user_id)
            STAGE2_THRESHOLD = int(os.getenv("STAGE2_THRESHOLD", "1"))
            if len(confirmed) >= STAGE2_THRESHOLD:
                await db.upsert_escalation_state(user_id, 30)
                await stage2_access(user_id)
            end_span(s, output={"step": "day30", "action": "stage2_triggered"})

        end_span(s_parent, output={"final_day": current_day, "days_overdue": days_overdue})
    except Exception as e:
        print(f"[lifeline_agent] advance_escalation error: {e}", file=sys.stderr)
        end_span(s_parent, error=str(e))
