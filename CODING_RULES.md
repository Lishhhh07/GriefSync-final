# GriefSync — Coding Rules

## Python (Backend)
- All async: use `async def` everywhere in FastAPI and agents
- DB calls via aiosqlite, always use context managers
- Never import one agent from another — agents communicate only through DB
- Agent functions: snake_case, verb_noun format e.g. `extract_asset`, `advance_escalation` 
- Error handling: every Claude API call wrapped in try/except, log full error to stderr
- No secrets in code: all keys from environment variables via os.getenv()
- Omium: every Claude call must have a span. Span opened before call, closed in finally block
- State machine transitions: write new state to DB FIRST, then call external service
- Webhooks: always return 200 immediately, process async in background task

## JavaScript (Frontend)
- Pages router only (no App Router)
- Plain CSS modules — no Tailwind, no styled-components
- Fetch calls to /api/* only — no direct DB access
- Component filenames: PascalCase e.g. AssetCard.js
- Page filenames: lowercase e.g. vault.js
- No useEffect for data that can be fetched server-side via getServerSideProps
- Error states and loading states required on every page

## Naming Conventions
- DB columns: snake_case
- API routes: /api/noun/verb or /api/noun (REST-ish)
- Webhook routes: /webhook/domain/event e.g. /webhook/contact/response
- Omium spans: "module.action" e.g. "vault.extract", "lifeline.escalation_run"
- Environment variables: SCREAMING_SNAKE_CASE

## File Organisation
- One agent per file in backend/agents/
- All webhook handlers in backend/webhooks.py
- All DB queries in backend/db.py (no inline SQL in agents)
- All Omium calls in backend/omium_tracer.py (no raw SDK calls elsewhere)

## Git Commits
- Format: [phase] short description
- Example: [phase2] vault agent extracts LIC fields from PDF

## What Not To Do
- Never call Claude from a webhook handler synchronously (use BackgroundTasks)
- Never store raw PDF bytes in SQLite (store path or extracted text only)
- Never hardcode user IDs (always parameterised queries)
- Never skip Omium spans on Claude calls (tracing is a judging criterion)
