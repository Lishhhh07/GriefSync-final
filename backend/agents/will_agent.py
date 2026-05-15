"""Will Agent — detects nominee vs legal heir conflicts, generates will PDF."""

import io
import sys
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from backend.omium_tracer import start_span, end_span
from backend.utils import call_gemini_with_search, call_gemini_with_retry

SYSTEM_INSTRUCTION = (
    "You are an Indian estate planning information assistant. "
    "Your task is to identify conflicts between nominees "
    "listed on the user's assets and their likely legal heirs under the Hindu Succession Act "
    "and EPF Act. For each conflict: name the asset, name the nominee, explain the conflict "
    "in plain language. Always say 'consult a qualified lawyer' for specific situations. "
    "You provide information, not legal advice."
)


async def generate_conflict_analysis(assets: list[dict]) -> tuple:
    """Analyse assets for nominee vs legal heir conflicts using Gemini with live Google Search grounding.
    Returns: (analysis_text: str, grounding_used: bool)
    """
    wf_span = start_span("will-analysis", "will.conflict_check")
    grounding_span = start_span("will-analysis", "will.web_grounding", wf_span)
    try:
        # Build asset summary table
        lines = ["Asset Type | Nominee | Relation | Sum Assured"]
        lines.append("--- | --- | --- | ---")
        for a in assets:
            asset_type = a.get("category") or a.get("asset_type") or "Unknown"
            nominee = a.get("nominee") or a.get("nominee_name") or "None"
            relation = a.get("nominee_relation") or "Unknown"
            amount = a.get("sum_assured") or "N/A"
            lines.append(f"{asset_type} | {nominee} | {relation} | {amount}")

        asset_table = "\n".join(lines)
        prompt = (
            f"{SYSTEM_INSTRUCTION}\n\n"
            f"Here are the user's assets and nominees:\n\n{asset_table}\n\n"
            "Identify any conflicts between the listed nominees and the likely legal heirs "
            "under the Hindu Succession Act 1956 and Indian Succession Act 1925. "
            "For EPF assets, check EPF Act nominee rules. "
            "Explain each conflict in plain language. "
            "If no conflicts exist, say so clearly."
        )

        # Use Google Search grounding for live legal information
        response = call_gemini_with_search(prompt)

        # Check if grounding actually fired
        grounding_used = False
        sources = []
        try:
            if hasattr(response, 'candidates') and response.candidates:
                grounding_metadata = getattr(response.candidates[0], 'grounding_metadata', None)
                grounding_used = grounding_metadata is not None
        except Exception:
            pass

        if grounding_used:
            print(
                f"[will_agent] \u2713 Google Search grounding FIRED — "
                f"live web sources used for conflict analysis",
                flush=True,
            )
            # Extract grounding sources if available
            try:
                for chunk in response.candidates[0].grounding_metadata.grounding_chunks:
                    if hasattr(chunk, 'web') and chunk.web.uri:
                        sources.append(chunk.web.uri)
                if sources:
                    print(f"[will_agent] Sources: {sources[:3]}", flush=True)
            except Exception:
                pass
            end_span(grounding_span, output={"grounded": "True", "sources_found": len(sources)})
        else:
            print(
                f"[will_agent] \u26a0 Google Search grounding did NOT fire — "
                f"using model knowledge only",
                flush=True,
            )
            end_span(grounding_span, output={"grounded": "False", "reason": "no_metadata"})

        end_span(wf_span, output={"analysis_length": len(response.text)})
        return response.text, grounding_used
    except Exception as e:
        print(f"[will_agent] generate_conflict_analysis error: {e}", file=sys.stderr)
        # Fallback: retry without grounding
        try:
            response = call_gemini_with_retry(prompt)
            print(
                f"[will_agent] \u26a0 Fallback: no grounding, used model knowledge only",
                flush=True,
            )
            end_span(grounding_span, output={"grounded": "False", "fallback": "no_grounding"})
            end_span(wf_span, output={"analysis_length": len(response.text)})
            return response.text, False
        except Exception as e2:
            end_span(grounding_span, error=str(e2))
            end_span(wf_span, error=str(e2))
            return f"Analysis could not be completed: {e2}", False


async def generate_will_pdf(user: dict, assets: list[dict], analysis: str) -> bytes:
    """Generate will PDF from assets + conflict analysis using ReportLab."""
    span_id = start_span("will-pdf", "will.pdf_generate")
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=2 * cm, rightMargin=2 * cm,
            topMargin=2 * cm, bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        elements = []

        title_style = ParagraphStyle("WillTitle", parent=styles["Title"],
            fontName="Helvetica-Bold", fontSize=20, alignment=1, spaceAfter=6)
        elements.append(Paragraph("TESTAMENT AND WILL", title_style))

        subtitle_style = ParagraphStyle("WillSubtitle", parent=styles["Normal"],
            fontSize=12, alignment=1, spaceAfter=20)
        user_name = user.get("name", "Unknown")
        today = date.today().strftime("%d %B %Y")
        elements.append(Paragraph(f"Prepared for {user_name} — {today}", subtitle_style))

        elements.append(Spacer(1, 12))
        line_table = Table([[""]], colWidths=[doc.width])
        line_table.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 1, colors.black)]))
        elements.append(line_table)
        elements.append(Spacer(1, 20))

        section_style = ParagraphStyle("SectionHeader", parent=styles["Heading2"],
            fontName="Helvetica-Bold", fontSize=14, spaceAfter=10)
        elements.append(Paragraph("ASSETS AND NOMINEES", section_style))

        table_data = [["Asset Type", "Policy/ID", "Nominee", "Sum Assured"]]
        for a in assets:
            asset_type = a.get("category") or a.get("asset_type") or "Unknown"
            policy = a.get("policy_number") or "N/A"
            nominee = a.get("nominee") or a.get("nominee_name") or "None"
            amount = a.get("sum_assured")
            amount_str = f"₹{amount:,.0f}" if amount else "N/A"
            table_data.append([asset_type, policy, nominee, amount_str])

        asset_table = Table(table_data, colWidths=[3.5*cm, 4*cm, 4.5*cm, 3.5*cm])
        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.85, 0.85, 0.85)),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                t_style.append(("BACKGROUND", (0, i), (-1, i), colors.Color(0.95, 0.95, 0.95)))
        asset_table.setStyle(TableStyle(t_style))
        elements.append(asset_table)
        elements.append(Spacer(1, 24))

        elements.append(Paragraph("ESTATE PLANNING NOTES", section_style))
        body_style = ParagraphStyle("BodyText11", parent=styles["Normal"], fontSize=11, leading=15, spaceAfter=6)
        for para in analysis.split("\n"):
            para = para.strip()
            if para:
                para = para.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                elements.append(Paragraph(para, body_style))
        elements.append(Spacer(1, 24))

        elements.append(Paragraph("LEGAL DISCLAIMER", section_style))
        disclaimer_style = ParagraphStyle("Disclaimer", parent=styles["Normal"],
            fontSize=10, leading=14, borderWidth=1, borderColor=colors.black,
            borderPadding=8, backColor=colors.Color(0.97, 0.97, 0.97))
        elements.append(Paragraph(
            "This document is an AI-generated template with no legal standing. "
            "It must be reviewed, signed by you, witnessed by two adults, and "
            "notarised by a qualified lawyer before it has any legal effect.",
            disclaimer_style))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        end_span(span_id, output={"pdf_size_bytes": len(pdf_bytes)})
        return pdf_bytes
    except Exception as e:
        print(f"[will_agent] generate_will_pdf error: {e}", file=sys.stderr)
        end_span(span_id, error=str(e))
        return b""
