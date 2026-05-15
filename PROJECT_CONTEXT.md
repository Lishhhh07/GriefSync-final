# GriefSync — Project Context

## What It Is
GriefSync is an AI-powered estate readiness app for Indian families. It extracts assets from insurance/bank PDFs, detects legal conflicts between nominees and heirs under Indian succession law, generates a will template, and runs a lifeline check-in system that escalates to trusted contacts if the user stops responding.

## Tech Stack
- Backend: Python 3.11 + FastAPI + Supabase (PostgreSQL) + APScheduler
- Frontend: Next.js 14 (pages router) + plain CSS modules
- LLM: Google Gemini 2.5 Flash via google-generativeai SDK (free tier, no credit card required)
- Email: Resend (free tier, verified domain griefsync.codes)
- SMS: Brevo (free credits)
- PDF generation: ReportLab
- PDF extraction: pypdf
- Tracing: Omium SDK (primary) + OpenTelemetry/Jaeger (fallback)
- Scheduler: APScheduler AsyncIOScheduler

## IDE
Kiro (with Claude Opus 4.6 as the agent)

## Key Agents
1. Vault Agent — extracts structured asset data from Indian insurance/bank PDFs
2. Will Agent — detects nominee vs legal heir conflicts, generates will PDF
3. Lifeline Agent — state machine that escalates through trusted contacts on check-in miss
4. Notify Agent — dispatches email/SMS, knows nothing about why it's sending

## Folder Structure
griefsync/
├── backend/
│   ├── main.py
│   ├── db.py
│   ├── scheduler.py
│   ├── omium_tracer.py
│   ├── webhooks.py
│   └── agents/
│       ├── vault_agent.py
│       ├── will_agent.py
│       ├── lifeline_agent.py
│       └── notify_agent.py
└── frontend/
    ├── pages/
    │   ├── index.js
    │   ├── vault.js
    │   ├── will.js
    │   └── lifeline.js
    └── components/

## Environment Variables Required
GEMINI_API_KEY= (Google AI Studio — free tier)
RESEND_API_KEY=
BREVO_API_KEY=
OMIUM_API_KEY=
SECRET_KEY= (for signed URLs)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

## Demo User
Name: Rahul Sharma
Assets: LIC policy, EPF account, SBI savings account
Trusted contacts: 2 (wife + brother)
Check-in interval: 7 days
