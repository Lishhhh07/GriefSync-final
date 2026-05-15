# GriefSync

> AI-powered estate readiness for Indian families. Multi-agent autonomous pipeline
> that extracts assets from PDFs, detects legal conflicts, monitors check-ins, and
> escalates to trusted contacts — all without human intervention.

## Problem

Indian families lose lakhs in unclaimed insurance and EPF because nominees aren't notified in time. GriefSync autonomously manages estate readiness: it reads your documents, detects legal conflicts, and watches over you — alerting trusted contacts if you stop responding.

## Agent Architecture

- **Vault Agent** — Extracts structured asset data from insurance/bank PDFs using Gemini
- **Will Agent** — Detects nominee vs legal heir conflicts using Gemini + Google Search grounding
- **Lifeline Agent** — State machine that escalates through trusted contacts on check-in miss
- **Notify Agent** — Dispatches email via Resend; knows nothing about why it's sending
- **Monitor Agent** — Runs every 6h, detects and auto-corrects broken state
- **Obituary Agent** — Drafts a personal final message daily, sealed until user approves

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Supabase (PostgreSQL), APScheduler
- **Frontend**: Next.js 14 (pages router), CSS Modules
- **LLM**: Google Gemini 2.5 Flash via google-generativeai SDK (free tier)
- **Email**: Resend (free tier, verified domain)
- **Tracing**: Omium SDK (primary) + OpenTelemetry/Jaeger (fallback)
- **Scheduler**: APScheduler AsyncIOScheduler (5 automated jobs)

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free Google AI Studio API key (https://aistudio.google.com)
- A free Resend API key (https://resend.com)
- A free Supabase project (https://supabase.com)
- Optional: Omium SDK (provided by hackathon sponsor) for +10% bonus tracing.
  If not available, the system automatically uses OpenTelemetry + Jaeger.

### 1. Clone and install

```bash
git clone <repo-url>
cd GriefSync
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
GEMINI_API_KEY=your_key_here
RESEND_API_KEY=your_key_here
SECRET_KEY=any_random_string_32chars
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OMIUM_API_KEY=your_omium_key_here   # optional — for bonus tracing
```

### 2.5. Set up the database

1. Go to your Supabase project → SQL Editor
2. Open `supabase_schema.sql` from the project root
3. Paste the entire contents and click "Run"
4. Verify: Table Editor should show 8 tables:
   `users, assets, trusted_contacts, escalation_state, obituaries, monitor_log, analysis_queue, score_history`

### 3. Start the backend

```bash
set -a && source .env && set +a
uvicorn backend.main:app --reload --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://127.0.0.1:8000
Omium tracing: ACTIVE   <- only if OMIUM_API_KEY is set
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

### 5. Seed demo data

```bash
python backend/seed_demo.py
```

This creates a demo user (Rahul Sharma) with 3 assets and 2 trusted contacts.

### 6. Trigger the autonomous pipeline (demo run)

**Step 1 — Add a vault asset manually:**

```bash
curl -X POST http://localhost:8000/api/vault/manual \
  -H "Content-Type: application/json" \
  -d '{"asset_type":"LIC","insurer_name":"LIC of India","nominee_name":"Priya Sharma","nominee_relation":"wife","sum_assured":2500000}'
```

**Step 2 — Trigger Will Agent conflict analysis:**

```bash
curl -X POST http://localhost:8000/api/will/analyze
```

**Step 3 — Simulate a missed check-in (14 days overdue):**

```bash
python backend/override_checkin.py --user-id 1 --days-overdue 14
```

**Step 4 — Drain the analysis queue immediately:**

```bash
curl -X POST http://localhost:8000/api/queue/drain
```

**Step 5 — Check monitor log:**

```bash
curl http://localhost:8000/api/monitor/log
```

**Expected Omium trace chain:**

`vault.extract -> vault.nominee_check -> will.web_grounding -> will.conflict_check -> lifeline.escalation_run -> notify.email_dispatch`

## Omium Bonus Tracing

Set `OMIUM_API_KEY` in `.env`. On startup the backend logs:

```
Omium tracing: ACTIVE
[omium_tracer] Available Omium methods: [...]
```

Open the Omium dashboard during the demo to verify the live trace chain with causal links.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check + timestamp |
| POST | /api/vault/upload | PDF multipart -> extraction pipeline |
| POST | /api/vault/manual | JSON asset entry |
| GET | /api/vault/assets | All assets for user |
| POST | /api/will/analyze | Trigger conflict analysis |
| GET | /api/will/pdf | Download will template PDF |
| POST | /api/ask | AI Q&A with vault context |
| GET | /api/score | Estate completeness score 0-100 |
| GET | /api/score/history | 30-day score trend |
| GET | /api/onboarding/gaps | Actionable gap messages |
| POST | /api/checkin | Reset check-in timer |
| POST | /api/lifeline/contacts | Save trusted contacts |
| GET | /api/lifeline/status | Escalation status |
| GET | /api/obituary | Current obituary draft |
| POST | /api/obituary/approve | Approve draft |
| POST | /api/obituary/draft | Manually trigger draft |
| GET | /api/queue/status | Analysis queue stats |
| POST | /api/queue/drain | Immediately drain queue (demo) |
| GET | /api/monitor/log | Last 20 monitor entries |
| POST | /webhook/vault/upload-complete | Async extraction trigger |
| GET | /webhook/contact/response | Trusted contact click handler |

## Dependencies

See requirements.txt for the full list. Key packages:

- fastapi, uvicorn, supabase, apscheduler
- google-genai
- resend
- python-jose (JWT for webhook tokens)
- omium (optional, for bonus tracing)
- reportlab (will PDF generation)
- pypdf (PDF extraction)

## Demo Setup — Make webhooks reachable

If demoing with judges clicking real email links, expose the backend publicly:

**Option A — ngrok (recommended for hackathon):**

```bash
ngrok http 8000
# Copy the https URL from ngrok output (e.g. https://abc123.ngrok.io)
# Add to .env: BASE_URL=https://abc123.ngrok.io
# Restart backend
```

**Option B — demo-only override:**

Judges can verify the webhook fires by watching the backend console.
The JWT is valid; only the host needs to be reachable.

```bash
python backend/override_checkin.py --user-id 1 --days-overdue 14
# Watch backend logs for "lifeline.step_day14 → contact1_notified"
```

## Demo Video

<!-- TODO: Record and upload 5-minute demo video before submission -->
<!-- WARNING: This link MUST be filled before submitting -->
[5-minute walkthrough — RECORD BEFORE SUBMISSION]

The demo shows:
1. PDF upload triggering the Vault Agent extraction pipeline
2. Will Agent conflict analysis with live Google Search grounding
3. Lifeline escalation triggered by simulated missed check-in
4. Trusted contact webhook response halting escalation
5. Omium dashboard showing the complete causal trace chain