# GriefSync

**AI-powered estate readiness for Indian families.**

GriefSync extracts assets from insurance and bank PDFs, detects legal conflicts between nominees and heirs under Indian succession law, generates a will template, and runs a lifeline check-in system that escalates to trusted contacts if the user stops responding — all autonomously, after initial setup.

---

## The Problem

Indian families lose significant wealth in unclaimed insurance policies and EPF accounts because estate documents are scattered, nominees are unaware, and there is no system that watches over readiness continuously. GriefSync solves this with an autonomous multi-agent pipeline that reads documents, detects legal conflicts, monitors user check-ins, and escalates — without requiring human intervention after setup.

---

## Features

- **PDF Vault** — Upload insurance/bank PDFs; Gemini extracts policy numbers, nominees, sums assured, and expiry dates into structured records
- **Conflict Analysis** — Detects mismatches between named nominees and legal heirs under the Hindu Succession Act and Indian Succession Act, with live Google Search grounding
- **Will Template** — Generates a downloadable PDF will template based on extracted assets and conflict findings
- **Lifeline Check-in** — A state machine that escalates through trusted contacts (Day 7 → 14 → 21 → 30) if the user misses check-ins
- **Estate Score** — A 0–100 completeness score with 30-day trend history and regression alerts
- **Obituary Drafts** — A daily agent drafts a first-person final message from the user to trusted contacts; sealed until the user approves
- **Monitor Agent** — Runs every 6 hours to detect and auto-correct orphaned assets, stale escalations, and data anomalies
- **Distributed Tracing** — Full causal span chains via Omium SDK (with Jaeger fallback for local dev)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, APScheduler |
| Database | Supabase (PostgreSQL) |
| LLM | Google Gemini 2.5 Flash (`google-generativeai`) |
| Email | Resend (verified domain `griefsync.codes`) |
| SMS | Brevo |
| PDF extraction | pypdf |
| PDF generation | ReportLab |
| Tracing | Omium SDK (primary) + OpenTelemetry/Jaeger (fallback) |
| Frontend | React + Vite (frontend-v2), Tailwind CSS, shadcn/ui, Three.js |

---

## Agent Architecture

Six agents, each with a single responsibility. Agents communicate only through the database — never by calling each other directly. This makes each agent independently testable and crash-isolated.

| Agent | Trigger | LLM | Reads | Writes |
|---|---|---|---|---|
| **Vault Agent** | PDF upload / manual entry | Gemini 2.5 Flash | PDF text | `assets` table |
| **Will Agent** | Analysis queue (every 5 min) | Gemini 2.5 Flash + Google Search | `assets` | `users.conflict_analysis` |
| **Lifeline Agent** | APScheduler nightly (22:00 IST) | Gemini 2.5 Flash | `escalation_state`, `trusted_contacts` | `escalation_state` |
| **Notify Agent** | Called by Lifeline/Monitor | None (pure dispatch) | Email/SMS payload | Resend, Brevo APIs |
| **Monitor Agent** | APScheduler every 6 hours | Gemini 2.5 Flash | All tables | `monitor_log` |
| **Obituary Agent** | APScheduler daily (9:00 IST) | Gemini 2.5 Flash | `assets`, `trusted_contacts` | `obituaries` |

### Multi-Agent Handoff Flow

```
PDF Upload
  → Vault Agent (extract + nominee check)
    → assets table → analysis_queue
      → [5min] Will Agent (conflict analysis + Google Search)
        → users.conflict_analysis

APScheduler nightly
  → Lifeline Agent (advance escalation state machine)
    → Notify Agent (email via Resend / SMS via Brevo)
      → trusted contact clicks JWT-signed webhook URL
        → /webhook/contact/response
          → Lifeline Agent (stage2_access)
            → Notify Agent (full estate summary email)

APScheduler every 6h   → Monitor Agent → auto-corrections → monitor_log
APScheduler daily 9am  → Obituary Agent → draft (pending user approval)
APScheduler daily 8am  → Score Tracker → score_history + regression alerts
```

---

## Project Structure

```
GriefSync/
├── backend/
│   ├── main.py              # FastAPI routes — no business logic, delegates to agents
│   ├── db.py                # Supabase query helpers
│   ├── scheduler.py         # APScheduler (5 cron/interval jobs)
│   ├── auth.py              # JWT helpers for signed webhook URLs
│   ├── omium_tracer.py      # Tracing wrapper (Omium + OTel fallback)
│   ├── webhooks.py          # Webhook router
│   ├── utils.py
│   └── agents/
│       ├── vault_agent.py       # PDF extraction + nominee health checks
│       ├── will_agent.py        # Conflict analysis + PDF generation
│       ├── lifeline_agent.py    # Escalation state machine
│       ├── notify_agent.py      # Email/SMS dispatch
│       ├── monitor_agent.py     # Anomaly detection + auto-correction
│       └── obituary_agent.py    # Final message drafting
├── frontend-v2/             # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── site/            # Landing page scenes (Hero, Vault, Monitoring, etc.)
│       │   ├── assistant/       # AI assistant panel
│       │   ├── three/           # Three.js visual components
│       │   └── ui/              # shadcn/ui primitives
├── docker-compose.yml       # Jaeger (local tracing only)
├── .env.example
└── seed_demo.py             # Seeds demo user Rahul Sharma
```

---

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+ / Bun
- A [Supabase](https://supabase.com) project (free tier)
- A [Google AI Studio](https://aistudio.google.com) API key (free, no credit card)
- A [Resend](https://resend.com) API key (free tier)
- A [Brevo](https://brevo.com) account for SMS (free credits)

### 1. Clone and configure

```bash
git clone <repo-url>
cd GriefSync
cp .env.example .env
# Fill in all values in .env
```

### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 3. Seed the database

```bash
python -m backend.seed_demo
```

This creates the demo user **Rahul Sharma** with 3 assets (LIC policy, EPF account, SBI savings) and 2 trusted contacts.

### 4. Run the backend

```bash
set -a && source .env && set +a
uvicorn backend.main:app --reload --port 8000
```

### 5. Run the frontend

```bash
cd frontend-v2
bun install      # or npm install
bun dev          # or npm run dev
```

Frontend runs at `http://localhost:3000`. Backend at `http://localhost:8000`.

### 6. (Optional) Local tracing with Jaeger

```bash
docker compose up -d
# Jaeger UI at http://localhost:16686
```

---

## Environment Variables

```env
# LLM
GEMINI_API_KEY=        # aistudio.google.com → free, no credit card

# Email
RESEND_API_KEY=        # resend.com → free tier

# SMS
BREVO_API_KEY=         # brevo.com → free credits

# Database
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...   # service_role key — keep secret, backend only

# App
SECRET_KEY=            # python -c "import secrets; print(secrets.token_hex(32))"
BASE_URL=http://localhost:8000   # Change to your public URL for webhooks
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Tracing
OMIUM_API_KEY=         # Optional — enables Omium dashboard tracing
JAEGER_ENDPOINT=http://localhost:4317   # Fallback local tracing

# Demo tuning
STAGE2_THRESHOLD=1     # Set to 2 for production; 1 makes demo reliable with one contact
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/vault/upload` | Upload PDF → extraction pipeline |
| POST | `/api/vault/manual` | Manual JSON asset entry |
| GET | `/api/vault/assets` | All assets for user |
| POST | `/api/will/analyze` | Trigger conflict analysis |
| GET | `/api/will/pdf` | Download will template PDF |
| POST | `/api/ask` | AI Q&A with vault context |
| GET | `/api/score` | Estate completeness score (0–100) |
| GET | `/api/score/history` | 30-day score trend |
| GET | `/api/onboarding/gaps` | Actionable gap messages |
| POST | `/api/checkin` | Reset check-in timer |
| POST | `/api/lifeline/contacts` | Save trusted contacts |
| GET | `/api/lifeline/status` | Current escalation status |
| GET | `/api/obituary` | Current obituary draft |
| POST | `/api/obituary/approve` | Approve draft for sending |
| POST | `/api/obituary/draft` | Manually trigger draft |
| GET | `/api/queue/status` | Analysis queue stats |
| POST | `/api/queue/drain` | Drain queue immediately (demo) |
| GET | `/api/monitor/log` | Last 20 monitor entries |
| POST | `/webhook/vault/upload-complete` | Async extraction trigger |
| GET | `/webhook/contact/response` | Trusted contact click handler |

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | User profile, last check-in timestamp, conflict analysis, stage2 flag |
| `assets` | Extracted asset records with nominee info and warnings |
| `trusted_contacts` | Contacts with confirmation status and notification timestamps |
| `escalation_state` | Current escalation day and last action timestamp per user |
| `obituaries` | Draft final messages, stored sealed until user approves |
| `monitor_log` | Monitor agent run history with detected issues and actions taken |
| `analysis_queue` | Async will-analysis jobs queued on asset change |
| `score_history` | Daily estate completeness scores with breakdown |

---

## Tracing

All Gemini calls and agent actions are traced as named spans using `backend/omium_tracer.py`. Span naming convention: `module.action` (e.g. `vault.extract`, `will.conflict_check`, `lifeline.escalation_run`).

Webhook handlers use `link_webhook()` to connect inbound responses back to the workflow that triggered them, creating a complete causal chain visible in the Omium dashboard.

When `OMIUM_API_KEY` is not set, spans are emitted to the local Jaeger instance at `JAEGER_ENDPOINT`.

---

## Built With

- [Kiro IDE](https://kiro.dev) with Claude Opus 4.6 as the agent
- [Google Gemini 2.5 Flash](https://aistudio.google.com) — LLM inference + Google Search grounding
- [Supabase](https://supabase.com) — hosted PostgreSQL
- [Resend](https://resend.com) — transactional email
- [Brevo](https://brevo.com) — SMS dispatch
- [Omium](https://omium.dev) — distributed tracing

---

## Demo Video


