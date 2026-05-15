"""Seed demo data for GriefSync — idempotent, safe to re-run."""

import asyncio
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend import db
from backend.db import supabase


async def seed():
    print("Seeding demo user...")

    # Clear existing demo data for clean re-seed
    supabase.table("trusted_contacts").delete().eq("user_id", 1).execute()
    supabase.table("assets").delete().eq("user_id", 1).execute()
    supabase.table("escalation_state").delete().eq("user_id", 1).execute()
    supabase.table("obituaries").delete().eq("user_id", 1).execute()
    supabase.table("users").delete().eq("id", 1).execute()

    # Create user with last_checkin_at 15 days ago
    supabase.table("users").insert({
        "id": 1,
        "name": "Rahul Sharma",
        "email": "rahul@demo.in",
        "checkin_interval_days": 7,
        "last_checkin_at": (datetime.utcnow() - timedelta(days=15)).isoformat(),
    }).execute()
    print("  Created user: Rahul Sharma (id=1, 15 days since check-in)")

    # Asset 1: LIC
    await db.create_asset(1, {
        "category": "LIC",
        "label": "LIC Endowment Policy",
        "policy_number": "LIC-2024-MH-887231",
        "nominee": "Geeta Sharma",
        "nominee_relation": "mother",
        "sum_assured": 5000000,
    })

    # Asset 2: EPF — intentional no nominee
    await db.create_asset(1, {
        "category": "EPF",
        "label": "Provident Fund",
        "policy_number": "UAN-100823456",
        "nominee": None,
    })

    # Asset 3: Bank Account
    await db.create_asset(1, {
        "category": "BANK_ACCOUNT",
        "label": "SBI Main Account",
        "nominee": "Geeta Sharma",
        "sum_assured": 350000,
    })

    # Trusted contacts
    await db.save_trusted_contacts(1, [
        {"name": "Priya Sharma", "email": "priya@demo.in", "phone": "+919876543210"},
        {"name": "Arjun Sharma", "email": "arjun@demo.in", "phone": "+919876543211"},
    ])

    print("  Created 3 assets (LIC, EPF with no nominee, SBI)")
    print("  Created 2 trusted contacts (Priya — wife, Arjun — brother)")
    print(f"\nDone. Verify at: {os.getenv('SUPABASE_URL')}")


asyncio.run(seed())
