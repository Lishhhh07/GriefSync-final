"""APScheduler — lifeline nightly, monitor every 6h, analysis queue every 5min."""

import sys
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from backend import db
from backend.agents import lifeline_agent
from backend.agents import monitor_agent
from backend.agents import notify_agent
from backend.agents import obituary_agent
from backend.agents.will_agent import generate_conflict_analysis
from backend.omium_tracer import start_workflow, start_span, end_span

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


@scheduler.scheduled_job("cron", hour=22, minute=0)
async def check_lifelines():
    """Check all users for missed check-ins and advance escalation."""
    try:
        users = await db.get_all_users()
        for user in users:
            last = user["last_checkin_at"]  # ISO string
            interval = user["checkin_interval_days"]
            last_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            days_overdue = (datetime.utcnow() - last_dt.replace(tzinfo=None)).days - interval
            if days_overdue > 0:
                await lifeline_agent.advance_escalation(user["id"], days_overdue)
    except Exception as e:
        print(f"[scheduler] check_lifelines failed: {e}", file=sys.stderr)


@scheduler.scheduled_job("interval", hours=6)
async def run_monitor():
    """Self-healing monitor — detect and auto-repair broken state."""
    try:
        findings = await monitor_agent.run_health_check()
        if any(findings.values()):
            critical = findings["orphaned_assets"] + findings["stale_escalations"]
            if critical:
                await notify_agent.send_email(
                    "admin@demo.in",
                    "GriefSync: Automated Health Alert",
                    f"Monitor found {len(critical)} issues and auto-corrected them. "
                    f"Check monitor_log table for details.",
                )
    except Exception as e:
        print(f"[scheduler] run_monitor failed: {e}", file=sys.stderr)


@scheduler.scheduled_job("interval", minutes=5)
async def drain_analysis_queue():
    """Process pending conflict analysis requests from the queue."""
    try:
        wf_id = start_workflow("queue-drain", "Analysis queue drain")
        sid = start_span(wf_id, "queue.drain")

        pending = await db.get_pending_analyses()
        if not pending:
            end_span(sid, output={"processed": 0})
            return

        processed = 0
        for row in pending:
            await db.update_analysis_status(row["id"], "running")
            try:
                assets = await db.get_assets(row["user_id"])
                if assets:
                    result, _grounding = await generate_conflict_analysis(assets)
                    await db.update_conflict_analysis(row["user_id"], result)
                await db.update_analysis_status(row["id"], "done")
                processed += 1
                print(f"[queue] Analysed user_id={row['user_id']} — done", flush=True)
            except Exception as e:
                print(f"[queue] Failed for user_id={row['user_id']}: {e}", file=sys.stderr)
                await db.update_analysis_status(row["id"], "failed")

        end_span(sid, output={"processed": processed, "total_pending": len(pending)})
    except Exception as e:
        print(f"[scheduler] drain_analysis_queue failed: {e}", file=sys.stderr)


@scheduler.scheduled_job("cron", hour=9, minute=0)
async def auto_draft_obituaries():
    """Auto-draft obituaries for users with assets + contacts but no obituary yet."""
    try:
        users = await db.get_all_users()
        for user in users:
            has_assets = len(await db.get_assets(user["id"])) > 0
            has_contacts = len(await db.get_trusted_contacts(user["id"])) >= 1
            has_obituary = await db.get_obituary(user["id"])

            # Only draft if: has assets, has contacts, no obituary yet
            if has_assets and has_contacts and not has_obituary:
                draft = await obituary_agent.draft_obituary(user["id"])
                if draft:
                    await notify_agent.send_email(
                        user["email"],
                        "GriefSync: Your final message is ready to review",
                        f"We've drafted a message for your loved ones. Log in to review "
                        f"and approve it before it's stored.<br><br>"
                        f"<em>Preview: {draft[:100]}...</em>",
                    )
                    print(f"[obituary] Drafted for user_id={user['id']}", flush=True)
    except Exception as e:
        print(f"[scheduler] auto_draft_obituaries failed: {e}", file=sys.stderr)


@scheduler.scheduled_job("cron", hour=8, minute=0)
async def record_daily_scores():
    """Record daily scores and alert on regression (>10 point drop in 7 days)."""
    try:
        users = await db.get_all_users()
        for user in users:
            score_data = await db.calculate_score(user["id"])
            await db.insert_score_history(user["id"], score_data["score"], score_data["breakdown"])

            # Regression detection: compare to score 7 days ago
            week_ago = await db.get_score_at(user["id"], days_ago=7)
            if week_ago and score_data["score"] < week_ago["score"] - 10:
                drop = week_ago["score"] - score_data["score"]
                await notify_agent.send_email(
                    user["email"],
                    f"GriefSync: Your estate readiness dropped {drop} points",
                    f"Your score fell from {week_ago['score']} to {score_data['score']} "
                    f"in the last 7 days. Log in to see what changed.",
                )
                print(f"[score] Regression alert for user_id={user['id']}: {week_ago['score']} -> {score_data['score']}", flush=True)
    except Exception as e:
        print(f"[scheduler] record_daily_scores failed: {e}", file=sys.stderr)
