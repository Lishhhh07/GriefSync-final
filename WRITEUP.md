# GriefSync — Hackathon Writeup

## 1. Problem

Indian families lose significant wealth in unclaimed insurance policies and EPF accounts because estate documents are scattered, nominees are unaware, and there is no system that watches over readiness continuously. GriefSync solves this with an autonomous multi-agent pipeline that reads documents, detects legal conflicts under Indian succession law, monitors user check-ins, and escalates to trusted contacts — without requiring human intervention after initial setup.

Target users: Indian families with insurance policies, EPF accounts, mutual funds, or property who want to ensure their nominees can claim assets without confusion.

## 2. Agent Architecture

GriefSync has six specialised agents, each with a single responsibility:

**Vault Agent** — Triggered by PDF upload or manual entry. Uses Gemini 2.5 Flash with `response_mime_type="application/json"` to extract structured asset data (policy number, nominee, sum assured, expiry) from unstructured insurance/bank documents. Writes to the `assets` table. On completion, enqueues a conflict analysis job.

**Will Agent** — Triggered by the analysis queue (polled every 5 minutes). Uses Gemini 2.5 Flash with live Google Search grounding (`tools=[protos.Tool(google_search=protos.GoogleSearch())]`) to detect conflicts between named nominees and legal heirs under the Hindu Succession Act and Indian Succession Act. Produces a plain-English conflict report and a downloadable will template PDF via ReportLab.

**Lifeline Agent** — Triggered nightly by APScheduler. Implements a state machine: Day 1 (reminder to user) → Day 7 (urgent reminder) → Day 14 (first contact notified via email) → Day 21 (second contact notified) → Day 30 (full estate access granted if both contacts confirm). Generates personalised notification messages via Gemini. Trusted contacts respond via a JWT-signed webhook URL.

**Notify Agent** — Pure dispatch layer. Accepts an email address, subject, and body. Sends via Resend API from verified domain griefsync.codes. Knows nothing about why it is sending — all business logic lives in the calling agent.

**Monitor Agent** — Runs every 6 hours. Queries all tables, detects orphaned assets, stale escalation states, nominee drift, and dead contacts. Auto-corrects where possible. Uses Gemini to run AI quality checks on asset data. Sends an admin alert email if critical issues are found.

**Obituary Agent** — Runs daily at 9am IST. Drafts a first-person final message from the user to their trusted contacts using Gemini, drawing on their asset list and contact names. Stored as a draft, sealed until the user explicitly approves. Never sent without human approval.

Agents communicate only through the database — never by calling each other directly. This makes each agent independently testable and crash-isolated.

## 3. Tool Surface & What Makes It Autonomous

**Tools used:**
- Google Gemini 2.5 Flash (LLM inference + Google Search grounding)
- Resend API (email dispatch with real side-effects via verified domain)
- Brevo SMS API (SMS dispatch to trusted contacts on Day 14/21 escalation)
- pypdf (PDF text extraction)
- ReportLab (will template PDF generation)
- APScheduler (5 cron/interval jobs running autonomously)
- JWT-signed webhooks (trusted contact response ingress)
- Supabase PostgreSQL (persistent state across restarts)
- Omium SDK (span-level tracing with causal links for bonus evaluation)

**What makes it autonomous in practice:**

Once a user uploads their documents and sets up trusted contacts, GriefSync runs indefinitely without human steering. The scheduler fires nightly regardless of whether the frontend is open. The analysis queue processes new assets within 5 minutes of entry. The lifeline escalation advances through stages automatically. The monitor self-heals broken state every 6 hours. The obituary drafts itself daily. The score tracker records history and alerts on regression. The only human decision point is the user's initial setup and their approval of the obituary draft.

The system handles failures gracefully: Gemini calls retry with exponential backoff (1s, 2s, 4s), scheduler jobs are wrapped in try/except so a single failure does not stop subsequent runs, and the Notify Agent has a fallback message if LLM generation fails. The Monitor Agent detects and auto-corrects data anomalies without human intervention.

**Multi-agent handoff (visible in Omium traces):**

```
PDF Upload → Vault Agent → assets table → analysis_queue
  → [5min] Will Agent (with Google Search) → conflict_analysis
APScheduler nightly → Lifeline Agent → Notify Agent → webhook response
APScheduler 6h → Monitor Agent → auto-corrections
APScheduler daily → Obituary Agent → draft for review
APScheduler daily → Score Tracker → regression alerts
```

Each handoff is traced as a parent-child span relationship in Omium, creating a complete causal chain visible in the dashboard during the demo.
