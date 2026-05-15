# GriefSync — Architecture

## System Layers

### Layer 1 — HTTP API (FastAPI / main.py)

All routes live here. Delegates to agents or DB, never contains business logic.

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check + timestamp |
| POST | /api/vault/upload | PDF multipart → extraction pipeline |
| POST | /api/vault/manual | JSON asset entry |
| GET | /api/vault/assets | All assets for user |
| POST | /api/will/analyze | Trigger conflict analysis |
| GET | /api/will/pdf | Download will template PDF |
| POST | /api/ask | AI Q&A with vault context |
| GET | /api/score | Estate completeness score 0–100 |
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

### Layer 2 — Agents (backend/agents/)

Each agent is a separate Python module with its own Gemini system prompt. Most agents communicate through the database — never by calling each other directly. The exception is Lifeline Agent, which directly dispatches to Notify Agent as a pure side-effect layer — Notify Agent has no state and is treated as a utility, not a peer agent.

| Agent | Trigger | LLM | Reads | Writes |
|---|---|---|---|---|
| Vault Agent | PDF upload / manual entry | Gemini 2.5 Flash | PDF text | assets table |
| Will Agent | Asset change / manual | Gemini 2.5 Flash + Google Search | assets table | users.conflict_analysis |
| Lifeline Agent | APScheduler nightly | Gemini 2.5 Flash | escalation_state, trusted_contacts | escalation_state |
| Notify Agent | Called by Lifeline/Monitor | None (pure dispatch) | Email/SMS payload | External: Resend, Brevo |
| Monitor Agent | APScheduler every 6h | Gemini 2.5 Flash | All tables | monitor_log |
| Obituary Agent | APScheduler daily 9am | Gemini 2.5 Flash | assets, trusted_contacts | obituaries |

### Layer 3 — Database (Supabase / PostgreSQL)

Hosted on Supabase free tier. All queries via `supabase-py` SDK with service_role key.

Tables:
- **users** (id, name, email, last_checkin_at, checkin_interval_days, conflict_analysis, stage2_unlocked)
- **assets** (id, user_id, category, label, policy_number, nominee, nominee_relation, expiry_date, sum_assured, status, warnings_json, raw_json)
- **trusted_contacts** (id, user_id, name, email, phone, confirmed, notified_at)
- **escalation_state** (user_id, current_day, last_action_at)
- **obituaries** (id, user_id, recipient_name, recipient_email, message_encrypted, delivered, draft_approved)
- **monitor_log** (id, checked_at, category, user_id, action_taken, detail_json)
- **analysis_queue** (id, user_id, queued_at, status)
- **score_history** (id, user_id, score, breakdown_json, recorded_at)

### Layer 4 — Scheduler (APScheduler / scheduler.py)

AsyncIOScheduler with 5 jobs:
- `check_lifelines` — cron 22:00 IST nightly
- `run_monitor` — interval every 6 hours
- `drain_analysis_queue` — interval every 5 minutes
- `auto_draft_obituaries` — cron 9:00 IST daily
- `record_daily_scores` — cron 8:00 IST daily

### Layer 5 — Tracing (Omium + OpenTelemetry/Jaeger)

**Primary:** Omium SDK (`omium` package). When `OMIUM_API_KEY` is set, all spans are recorded to the Omium dashboard for the +10% bonus evaluation.

**Fallback:** OpenTelemetry → Jaeger (localhost:4317). Used in local dev when no Omium key is available.

All tracing calls are wrapped in `backend/omium_tracer.py` — no raw SDK calls elsewhere.

## Multi-Agent Handoff Flow

```
PDF Upload
  → Vault Agent (extract + nominee check)
    → assets table
      → on_assets_changed() → analysis_queue
        → [5min] Will Agent (conflict analysis with Google Search)
          → users.conflict_analysis

APScheduler nightly
  → Lifeline Agent (advance_escalation state machine)
    → Notify Agent (email via Resend)
      → trusted_contact clicks webhook URL
        → /webhook/contact/response
          → Lifeline Agent (stage2_access)
            → Notify Agent (full estate summary email)

APScheduler every 6h
  → Monitor Agent (detect anomalies, auto-correct)
    → monitor_log

APScheduler daily 9am
  → Obituary Agent (auto-draft final message)
    → obituaries table (draft_approved=false until user approves)
```

## LLM

Google Gemini 2.5 Flash via `google-generativeai` SDK. Free tier, no credit card required.

- Vault Agent: JSON extraction with `response_mime_type="application/json"`
- Will Agent: Conflict analysis with `tools=[protos.Tool(google_search=protos.GoogleSearch())]` for live web grounding
- Lifeline Agent: Warm notification message generation
- Monitor Agent: Asset data quality review
- Obituary Agent: First-person final message drafting

## Tracing

Every Gemini API call and every agent action gets its own span via `backend/omium_tracer.py`.

Span naming convention: `"module.action"` — e.g. `vault.extract`, `will.conflict_check`, `lifeline.escalation_run`

Webhook handlers use `link_webhook()` to connect back to the workflow that triggered them, creating a complete causal chain visible in the Omium dashboard.
