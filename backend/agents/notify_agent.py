"""Notify Agent — dispatches email/SMS, knows nothing about why it's sending."""

import os
import sys

import resend
from twilio.rest import Client as TwilioClient

from backend.omium_tracer import start_span, end_span

resend.api_key = os.getenv("RESEND_API_KEY")


async def send_email(to_email: str, subject: str, body: str, span_id: str = None) -> bool:
    """Send email via Resend."""
    sid = start_span(span_id or "root", "notify.email_dispatch")
    try:
        resend.Emails.send({
            "from": "GriefSync <noreply@griefsync.codes>",
            "to": to_email,
            "subject": subject,
            "html": f"<p style='font-family:sans-serif;line-height:1.6'>{body}</p>"
        })
        end_span(sid, output={"to": to_email, "status": "sent"})
        return True
    except Exception as e:
        print(f"[notify_agent] send_email error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))
        return False


async def send_sms(to_phone: str, body: str, span_id: str = None) -> bool:
    """Send SMS via Twilio."""
    sid = start_span(span_id or "root", "notify.sms_dispatch")
    try:
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_FROM_NUMBER")

        if not all([account_sid, auth_token, from_number]):
            print(f"[notify_agent] Twilio not configured — SMS skipped", file=sys.stderr)
            print(f"[SMS fallback] To {to_phone}: {body}", flush=True)
            end_span(sid, output={"to": to_phone, "status": "skipped_no_config"})
            return False

        client = TwilioClient(account_sid, auth_token)
        message = client.messages.create(
            body=body[:160],
            from_=from_number,
            to=to_phone,
        )
        print(f"[notify_agent] SMS sent: sid={message.sid} to={to_phone}", flush=True)
        end_span(sid, output={"to": to_phone, "status": "sent", "sid": message.sid})
        return True
    except Exception as e:
        print(f"[notify_agent] send_sms error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))
        print(f"[SMS fallback] To {to_phone}: {body}", flush=True)
        return False
