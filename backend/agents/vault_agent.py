"""Vault Agent — extracts structured asset data from Indian insurance/bank PDFs."""

import json
import re
import sys
from datetime import datetime, timedelta

from backend.omium_tracer import start_span, end_span
from backend.utils import call_gemini_json

EXTRACT_SYSTEM = (
    "You are a document extraction specialist for Indian estate documents. "
    "Extract structured fields from insurance policies, bank documents, property deeds, "
    "sale deeds, and other financial/legal documents. "
    "The document may be in Hindi, English, or mixed. "
    "Hindi documents may use Kruti Dev encoding where Devanagari appears as Latin characters "
    "(e.g., 'foØ;&i=' means 'विक्रय-पत्र', 'dksey dqekjh' means 'कोमल कुमारी'). "
    "Decode such text mentally and extract the information. "
    "Return ONLY valid JSON with exactly these keys: policy_number, nominee_name, "
    "nominee_relation, expiry_date (YYYY-MM-DD or null), sum_assured (number or null), "
    "insurer_name, asset_type. "
    "asset_type must be one of: LIC, TERM_INSURANCE, EPF, PPF, BANK_ACCOUNT, "
    "MUTUAL_FUND, PROPERTY, OTHER. "
    "For property/sale deeds: use insurer_name for property description, "
    "policy_number for registration/deed number, nominee_name for buyer name, "
    "sum_assured for sale price. "
    "Use null for missing fields. No explanation, no markdown, only JSON."
)


async def extract_asset(pdf_text: str, user_id: int, workflow_id: str = None) -> dict:
    """Extract asset fields from PDF text using Gemini and write to DB."""
    span_id = start_span(workflow_id or f"vault-{user_id}", "vault.extract")
    try:
        if not pdf_text or len(pdf_text.strip()) < 20:
            print(f"[vault_agent] PDF text too short ({len(pdf_text)} chars), skipping", flush=True)
            end_span(span_id, error="pdf_text_too_short")
            return {}

        prompt = f"{EXTRACT_SYSTEM}\n\nExtract fields from this document:\n\n{pdf_text[:8000]}"
        response = call_gemini_json(prompt)
        raw = response.text
        print(f"[vault_agent] Gemini response ({len(raw)} chars): {raw[:200]}", flush=True)

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw.strip())
        parsed = json.loads(raw)
        end_span(span_id, output={"asset_type": parsed.get("asset_type", "UNKNOWN")})
        return parsed
    except Exception as e:
        print(f"[vault_agent] extract_asset error: {e}", file=sys.stderr)
        end_span(span_id, error=str(e))
        return {}


async def check_nominee_health(asset: dict, workflow_id: str = None) -> list[str]:
    """Run nominee health checks and return warning strings."""
    span_id = start_span(workflow_id or "vault-health", "vault.nominee_check")
    try:
        warnings = []

        nominee_name = asset.get("nominee_name") or ""
        expiry_date = asset.get("expiry_date")
        asset_type = asset.get("asset_type", "")
        sum_assured = asset.get("sum_assured") or 0
        nominee_relation = (asset.get("nominee_relation") or "").lower()

        if not nominee_name.strip():
            warnings.append("No nominee on record — this asset could be disputed")

        if expiry_date:
            try:
                exp = datetime.strptime(expiry_date, "%Y-%m-%d")
                if exp - datetime.now() <= timedelta(days=60):
                    warnings.append("Policy expires soon — renew urgently")
            except ValueError:
                pass

        if asset_type == "EPF" and not nominee_name.strip():
            warnings.append("EPF has no nominee — provident fund payout will require court process")

        immediate_family = {"spouse", "child", "parent", "wife", "husband", "son", "daughter", "mother", "father"}
        if (
            asset_type == "LIC"
            and sum_assured > 1_000_000
            and nominee_relation not in immediate_family
        ):
            warnings.append(
                "High-value LIC nominee is not immediate family — "
                "conflict risk under Hindu Succession Act"
            )

        end_span(span_id, output={"warning_count": len(warnings)})
        return warnings
    except Exception as e:
        print(f"[vault_agent] check_nominee_health error: {e}", file=sys.stderr)
        end_span(span_id, error=str(e))
        return []
