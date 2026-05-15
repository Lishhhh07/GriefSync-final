"""Demo tool: manually trigger escalation for testing."""

import asyncio
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.agents.lifeline_agent import advance_escalation

parser = argparse.ArgumentParser(description="Trigger lifeline escalation for testing")
parser.add_argument("--user-id", type=int, default=1,
                    help="User ID to simulate (default: 1 = demo user Rahul)")
parser.add_argument("--days-overdue", type=int, default=14,
                    help="How many days overdue to simulate (1/7/14/21/30)")
args = parser.parse_args()

print(f"[demo] Triggering escalation for user_id={args.user_id} at days_overdue={args.days_overdue}")
print(f"[demo] This simulates: day 1=reminder, day 7=urgent, day 14=contact1, day 21=contact2, day 30=stage2")

asyncio.run(advance_escalation(args.user_id, args.days_overdue))
print(f"Done — triggered escalation for user {args.user_id} at days_overdue={args.days_overdue}")
