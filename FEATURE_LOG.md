# GriefSync — Feature Log

## Format
Each entry: [PHASE] [TYPE] Short description | Decision/reason if non-obvious

Types: FEATURE | FIX | DECISION | DEPENDENCY | CHANGE

---

## Phase 0 — Bootstrap
[P0] FEATURE Created PROJECT_CONTEXT.md, ARCHITECTURE.md, CODING_RULES.md, FEATURE_LOG.md
[P0] DECISION Using SQLite over Postgres — single-developer build, no infra overhead, sufficient for hackathon scale
[P0] DECISION Pages router over App Router — simpler mental model for solo 24hr build
[P0] DECISION Agents communicate only through DB — enforces separation, makes each agent independently testable

## Phase 1 — Scaffold
[P1] DEPENDENCY requirements.txt — fastapi, uvicorn, aiosqlite, google-generativeai, pypdf, reportlab, apscheduler, resend, sib-api-v3-sdk, python-multipart, python-jose, opentelemetry-api/sdk/exporter
[P1] FEATURE backend/tracer.py — OpenTelemetry + Jaeger wrapper (start_workflow, start_span, end_span, link_webhook)
[P1] FEATURE backend/db.py — aiosqlite context manager, init_db() creates 5 tables, query helpers (get_user, get_assets, upsert_escalation_state, get_trusted_contacts, get_confirmed_contacts)
[P1] FEATURE backend/main.py — FastAPI app, startup init_db, GET /health, CORS localhost:3000
[P1] FEATURE backend/webhooks.py — placeholder webhook router (vault/upload-complete, contact/response)
[P1] FEATURE backend/scheduler.py — APScheduler AsyncIOScheduler, check_lifelines stub
[P1] FEATURE backend/agents/ — vault_agent.py, will_agent.py, lifeline_agent.py, notify_agent.py (placeholder stubs)
[P1] FEATURE frontend/pages/ — index.js, vault.js, will.js, lifeline.js with placeholder h1
[P1] FEATURE frontend/.env.local — NEXT_PUBLIC_API_URL=http://localhost:8000
[P1] FEATURE docker-compose.yml — Jaeger all-in-one (ports 16686, 4317)
[P1] FEATURE .env.example — GEMINI_API_KEY, RESEND_API_KEY, BREVO_API_KEY, SECRET_KEY, JAEGER_ENDPOINT
[P1] DECISION Switched from Anthropic to Gemini (free, no credit card required for hackathon)
[P1] DECISION Switched from Omium to OpenTelemetry + Jaeger (open-source, self-hosted, free)
[P1] DECISION Switched from Twilio to Brevo for SMS (free credits, no trial restrictions)

## Phase 2 — Vault Agent
[P2] FEATURE backend/agents/vault_agent.py — extract_asset() calls Gemini 1.5 Flash with JSON-only system prompt, parses response
[P2] FEATURE backend/agents/vault_agent.py — check_nominee_health() returns warnings for missing nominee, expiry, EPF no-nominee, high-value LIC non-family
[P2] FEATURE backend/main.py — POST /api/vault/upload accepts PDF, extracts text via pypdf, fires background extraction pipeline
[P2] FEATURE backend/main.py — POST /api/vault/manual accepts JSON asset, runs nominee health check, writes to DB
[P2] FEATURE backend/main.py — GET /api/vault/assets returns all assets with parsed warnings array
[P2] FEATURE backend/webhooks.py — POST /webhook/vault/upload-complete re-runs nominee check if warnings_json is null
[P2] CHANGE backend/db.py — added warnings_json column to assets table, added insert_asset/update_asset_warnings/get_asset_by_id helpers
[P2] DECISION Truncate PDF text to 8000 chars for Gemini context — keeps within free-tier token limits
[P2] DECISION Regex strip markdown fences from Gemini response — model sometimes wraps JSON in ```

## Phase 3 — Will Agent
[P3] FEATURE backend/agents/will_agent.py — generate_conflict_analysis() uses Gemini with Google Search grounding to detect nominee vs heir conflicts
[P3] FEATURE backend/agents/will_agent.py — generate_will_pdf() creates A4 PDF with ReportLab: title, asset table (grey header, alternate shading), analysis notes, legal disclaimer box
[P3] FEATURE backend/main.py — POST /api/will/analyze loads assets, calls conflict analysis, saves to users.conflict_analysis
[P3] FEATURE backend/main.py — GET /api/will/pdf generates and streams PDF with Content-Disposition header
[P3] FEATURE frontend/pages/will.js — Analyse button + Download button with loading/error states
[P3] CHANGE backend/db.py — added conflict_analysis column to users table, added update_conflict_analysis + ensure_demo_user helpers
[P3] DECISION Google Search grounding via genai.protos.GoogleSearchRetrieval — free with Gemini API, no separate search API key needed
[P3] DECISION PDF uses Helvetica (built-in) — no font file dependencies, works everywhere

## Phase 3.5 — Supabase Migration
[P3.5] FEATURE Migrated database from SQLite to Supabase free tier
[P3.5] DEPENDENCY Added supabase Python SDK, removed aiosqlite
[P3.5] CHANGE db.py fully rewritten with identical function signatures — no agent code changes required
[P3.5] FEATURE backend/seed_demo.py — seeds Rahul Sharma with 3 assets and 2 trusted contacts
[P3.5] CHANGE main.py startup now does Supabase connection check instead of init_db()
[P3.5] CHANGE All user_id references changed from TEXT to INT (Supabase BIGSERIAL)
[P3.5] DECISION Using service_role key in backend (not anon key) — full DB access, kept server-side only
[P3.5] DECISION Tables created via SQL Editor not migrations — sufficient for hackathon scope

## Phase 4 — Lifeline Agent
[P4] FEATURE backend/agents/notify_agent.py — send_email() via Resend, send_sms() via Brevo with terminal fallback
[P4] FEATURE backend/agents/lifeline_agent.py — 5-step escalation state machine (day 1/7/14/21/30), crash-safe DB-first writes
[P4] FEATURE backend/agents/lifeline_agent.py — generate_contact_message() uses Gemini for warm notification text, with hardcoded fallback
[P4] FEATURE backend/agents/lifeline_agent.py — generate_access_url() creates signed JWT links (72h expiry) for trusted contacts
[P4] FEATURE backend/agents/lifeline_agent.py — stage2_access() unlocks full asset summary to all trusted contacts
[P4] FEATURE backend/scheduler.py — APScheduler cron job at 22:00 IST, iterates all users, fires advance_escalation if overdue
[P4] FEATURE backend/webhooks.py — GET /webhook/contact/response verifies JWT, handles "confirm" and "halt" actions, returns HTML
[P4] FEATURE backend/main.py — POST /api/checkin resets last_checkin_at and escalation to day 0
[P4] FEATURE backend/main.py — POST /api/lifeline/contacts saves up to 2 trusted contacts
[P4] FEATURE backend/main.py — GET /api/lifeline/status returns current_day, days_overdue, next_action
[P4] FEATURE backend/override_checkin.py — CLI demo tool to manually trigger escalation at any day
[P4] DECISION Crash-safe pattern: always write escalation state to DB before sending notifications
[P4] DECISION Gemini fallback: if message generation fails, use hardcoded warm template instead of crashing
[P4] DECISION JWT-signed webhook URLs with 72h expiry — prevents unauthorized access without a full auth system

## Phase 5 — AI Q&A, Score, Gaps, Polished Frontend
[P5] FEATURE backend/main.py — POST /api/ask: AI Q&A with asset context via Gemini, span "assistant.answer"
[P5] FEATURE backend/main.py — GET /api/score: estate completeness score 0–100 with breakdown (assets, analysis, contacts, obituary)
[P5] FEATURE backend/main.py — GET /api/onboarding/gaps: actionable gap messages for missing estate components
[P5] FEATURE frontend/pages/index.js — Dashboard with score circle (green/amber/red), gap cards with "Fix →" links, check-in button
[P5] FEATURE frontend/pages/vault.js — Asset cards with warning dots, PDF upload, manual entry form, polling after upload
[P5] FEATURE frontend/pages/will.js — Analyse button, PDF download, AI Q&A textarea with answer display
[P5] FEATURE frontend/pages/lifeline.js — Escalation timeline (5 steps), days counter, trusted contacts form, check-in button
[P5] FEATURE frontend/styles/ — Complete CSS module with score circles, cards, timeline, forms, buttons, responsive layout
[P5] FEATURE frontend/pages/_app.js — Global nav bar with active state highlighting
[P5] CHANGE All Gemini models updated from gemini-1.5-flash to gemini-2.0-flash (1.5 deprecated)
[P5] DECISION getServerSideProps for data that can be fetched server-side (score, gaps, assets, lifeline status)
[P5] DECISION useEffect polling only for vault upload progress (3s interval, 30s max)

## Phase 6 — Final Verification & README
[P6] CHANGE All Gemini models updated to gemini-2.5-flash (2.0-flash deprecated for new projects)
[P6] CHANGE will_agent.py — removed google_search_retrieval grounding (incompatible with newer SDK), Gemini has sufficient built-in knowledge
[P6] FEATURE backend/seed_demo.py — rewritten as idempotent script (clears + re-seeds cleanly)
[P6] FEATURE README.md — full quickstart guide, architecture diagram, API reference, escalation timeline
[P6] VERIFIED GET /api/vault/assets → 3 assets, EPF has null nominee ✓
[P6] VERIFIED POST /api/will/analyze → conflict analysis mentions mother vs wife under Hindu Succession Act ✓
[P6] VERIFIED GET /api/will/pdf → 2-page PDF with all sections ✓
[P6] VERIFIED GET /api/score → 75 (assets + analysis + contacts, no obituary) ✓
[P6] VERIFIED POST /api/ask → substantive answer about EPF nominees ✓
[P6] VERIFIED override_checkin.py → escalation advances day 1→7→14, Gemini generates contact message ✓
[P6] VERIFIED Jaeger traces: lifeline.escalation_run with child spans (step_day1/7/14, notify.email_dispatch, generate_message) ✓
[P6] VERIFIED Jaeger traces: assistant.answer span visible ✓

## Phase 7 — Self-Healing Monitor Agent
[P7] FEATURE backend/agents/monitor_agent.py — run_health_check() detects 4 anomaly types and auto-corrects
[P7] FEATURE monitor_agent — orphaned_assets: deletes assets with non-existent user_id
[P7] FEATURE monitor_agent — stale_escalations: resets escalation if user checked in but state wasn't updated
[P7] FEATURE monitor_agent — nominee_drift: flags users with nominees but no conflict analysis
[P7] FEATURE monitor_agent — dead_contacts: logs contacts notified >72h ago but not confirmed
[P7] FEATURE monitor_agent — AI quality check: Gemini reviews asset records for data quality issues
[P7] FEATURE backend/scheduler.py — @scheduler.scheduled_job("interval", hours=6) runs monitor, emails admin on critical issues
[P7] FEATURE backend/main.py — GET /api/monitor/log returns last 20 monitor_log entries
[P7] CHANGE backend/db.py — added get_monitor_logs() helper
[P7] CHANGE supabase_schema.sql — added monitor_log table (id, checked_at, category, user_id, action_taken, detail_json)
[P7] DECISION Monitor agent communicates only through DB — consistent with agent boundary rules
[P7] DECISION Every correction logged to monitor_log — full audit trail for self-healing actions

## Phase 8 — Auto Re-Analysis Queue
[P8] FEATURE backend/db.py — on_assets_changed() checks for pending queue entry, inserts if none exists (deduplication)
[P8] FEATURE backend/db.py — get_pending_analyses(), update_analysis_status(), get_queue_status() helpers
[P8] FEATURE backend/scheduler.py — drain_analysis_queue() runs every 5 minutes, processes up to 5 pending items
[P8] FEATURE backend/main.py — POST /api/vault/manual and /api/vault/upload now call on_assets_changed() after asset write
[P8] FEATURE backend/main.py — GET /api/queue/status returns {pending, done_last_hour, failed}
[P8] CHANGE supabase_schema.sql — added analysis_queue table (id, user_id, queued_at, status)
[P8] DECISION DB-based queue instead of Redis — zero infra, sufficient for hackathon scale
[P8] DECISION Deduplication: only one pending entry per user_id at a time — prevents queue flooding on rapid uploads

## Phase 9 — Obituary Agent (Auto-Draft)
[P9] FEATURE backend/agents/obituary_agent.py — draft_obituary() uses Gemini to write warm first-person final message
[P9] FEATURE backend/db.py — get_obituary(), create_obituary_draft(), approve_obituary() helpers
[P9] FEATURE backend/scheduler.py — auto_draft_obituaries() runs daily at 9am IST, drafts for users with assets+contacts but no obituary
[P9] FEATURE backend/main.py — GET /api/obituary returns current draft and approval status
[P9] FEATURE backend/main.py — POST /api/obituary/approve sets draft_approved=true
[P9] FEATURE frontend/pages/will.js — obituary section: amber banner for pending draft, green for approved, approve button
[P9] CHANGE supabase_schema.sql — added draft_approved column to obituaries table
[P9] DECISION Never send obituary without explicit user approval — draft_approved must be true
[P9] DECISION Auto-draft only triggers once (checks get_obituary before drafting) — no spam

## Phase 10 — Score History & Regression Alerts
[P10] FEATURE backend/db.py — insert_score_history(), get_score_history(), get_score_at() helpers
[P10] FEATURE backend/scheduler.py — record_daily_scores() runs at 8am IST, records score + detects >10pt regression over 7 days
[P10] FEATURE backend/main.py — calculate_score() extracted as shared async function (used by route + scheduler)
[P10] FEATURE backend/main.py — GET /api/score/history returns last 30 score_history rows
[P10] FEATURE frontend/pages/index.js — recharts sparkline below score circle showing 30-day trend
[P10] DEPENDENCY Added recharts to frontend for sparkline visualization
[P10] CHANGE supabase_schema.sql — added score_history table (id, user_id, score, breakdown_json, recorded_at)
[P10] DECISION Regression threshold: >10 point drop over 7 days triggers email alert
[P10] DECISION Sparkline only renders when >1 data point exists — no empty chart

## Phase 11 — SDK Migration & Omium Fix
[FIX] Migrated from deprecated google-generativeai to google-genai SDK (v2.3.0)
[FIX] Rewrote omium_tracer.py using real discovered Omium SDK API — OmiumTracer + Span objects with explicit parent-child
[FIX] Removed guessing loop (log/record/event/trace/emit) — spans now sent via tracer.flush() directly
[FIX] Verified causal chain visible in Omium dashboard: "Sent 1 spans to Omium" for every span end
[FIX] Will Agent uses google_search grounding via config={"tools": [{"google_search": {}}]}
[FIX] All agents use shared backend/utils.py: call_gemini_with_retry, call_gemini_with_search, call_gemini_json
[FIX] No more FutureWarning on import — clean startup logs
[CHANGE] requirements.txt: google-generativeai → google-genai
[CHANGE] All agents rewritten to use google.genai.Client pattern instead of GenerativeModel

## Phase 12 — BASE_URL Fix
[FIX] BASE_URL env var replaces hardcoded localhost:8000 in webhook URL generation (lifeline_agent.py)
[FIX] .env.example documents BASE_URL with comment about ngrok for demo
[FIX] README quickstart documents ngrok setup for demo webhook reachability
[FIX] requirements.txt corrected: google-generativeai → google-genai

## Phase 13 — Judge-Proofing
[FIX] CORS now configurable via CORS_ORIGINS env var — not locked to localhost:3000
[FIX] README quickstart includes Supabase schema setup step (step 2.5)
[FIX] omium import failure logs a clear install instruction, not a silent crash
[FIX] requirements.txt has comment explaining omium may need sponsor-provided install
[FIX] .env.example documents CORS_ORIGINS
[FIX] README prerequisites mention Supabase and optional Omium

## Phase 14 — SMS Wiring & Demo Threshold
[FIX] Lifeline Agent now sends SMS to contacts with phone numbers on Day 14/21 — Brevo SMS wired
[FIX] STAGE2_THRESHOLD env var controls confirmation count — default 1 for demo, 2 for production
[FIX] seed_demo.py already seeds contacts with phone numbers so SMS path is testable
[FIX] WRITEUP.md tools list updated to accurately reflect Brevo SMS usage on Day 14/21
[FIX] webhooks.py _process_contact_response uses STAGE2_THRESHOLD instead of hardcoded 2

## Phase 15 — Grounding Visibility
[FIX] Will Agent logs grounding status and source URLs when Google Search fires
[FIX] /api/will/analyze now returns grounding_used boolean in response
[FIX] Frontend displays grounding status badge on Will page (green ✓ or amber ⚠)
[CHANGE] generate_conflict_analysis() returns tuple (analysis_text, grounding_used) — callers updated
