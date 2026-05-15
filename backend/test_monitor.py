"""Test the monitor agent by inserting a stale escalation and running health check."""

import asyncio
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.db import supabase
from backend.agents.monitor_agent import run_health_check


async def test():
    print("=== Setting up test: inserting stale escalation ===")

    # Insert a stale escalation_state row (last_action_at 3 days ago)
    # but user checked in recently (via seed_demo which set 15 days ago — still stale)
    stale_time = (datetime.utcnow() - timedelta(days=3)).isoformat()
    supabase.table("escalation_state").upsert({
        "user_id": 1,
        "current_day": 7,
        "last_action_at": stale_time,
    }).execute()
    print(f"  Inserted stale escalation: current_day=7, last_action_at={stale_time}")

    print("\n=== Running health check ===")
    findings = await run_health_check()

    print(f"\n=== Results ===")
    print(f"  Orphaned assets: {len(findings['orphaned_assets'])}")
    print(f"  Stale escalations: {len(findings['stale_escalations'])}")
    print(f"  Nominee drift: {len(findings['nominee_drift'])}")
    print(f"  Dead contacts: {len(findings['dead_contacts'])}")

    print("\n=== Checking monitor_log ===")
    logs = supabase.table("monitor_log").select("*").order("checked_at", desc=True).limit(5).execute()
    for log in (logs.data or []):
        print(f"  [{log['category']}] {log['action_taken']}")

    print("\nDone.")


asyncio.run(test())
