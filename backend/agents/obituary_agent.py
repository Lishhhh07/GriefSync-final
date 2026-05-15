"""Obituary Agent — auto-drafts warm final messages for user review. Never sends without approval."""

import sys

from backend import db
from backend.omium_tracer import start_span, end_span
from backend.utils import call_gemini_with_retry


async def draft_obituary(user_id: int) -> str:
    """Draft a warm final message using Gemini, store as unapproved draft."""
    sid = start_span(f"obituary-{user_id}", "obituary.draft")
    try:
        user = await db.get_user(user_id)
        if not user:
            end_span(sid, error="user_not_found")
            return ""

        assets = await db.get_assets(user_id)
        contacts = await db.get_trusted_contacts(user_id)

        # Build context
        asset_lines = []
        for a in assets:
            asset_lines.append(f"{a.get('category', 'Unknown')}: {a.get('label', 'N/A')}")
        asset_summary = ", ".join(asset_lines) if asset_lines else "no recorded assets"

        contact_names = ", ".join(c["name"] for c in contacts) if contacts else "their family"

        prompt = (
            f"You write warm, dignified final messages from a person to their loved ones. "
            f"You write in first person as the user. Keep it under 150 words. No platitudes. "
            f"Personal and specific to the asset and relationship context provided.\n\n"
            f"Draft a warm final message from {user['name']} to their family. "
            f"Context: they have {len(assets)} financial assets including {asset_summary}. "
            f"Their trusted contacts are {contact_names}. "
            f"Write as if {user['name']} wrote this themselves, to be delivered only if "
            f"they stop responding."
        )

        response = call_gemini_with_retry(prompt)
        draft = response.text

        # Store in obituaries table with delivered=False, draft_approved=False
        await db.create_obituary_draft(
            user_id=user_id,
            message=draft,
        )

        end_span(sid, output={"draft_length": len(draft)})
        return draft
    except Exception as e:
        print(f"[obituary_agent] draft_obituary error: {e}", file=sys.stderr)
        end_span(sid, error=str(e))
        return ""
