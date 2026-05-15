"""
Seed the 'deceased' demo user (lishikameghani@gmail.com) with full post-death state:
- Last check-in: 90 days ago (3 months)
- Escalation: Day 90 (well past stage 2)
- Both trusted contacts: confirmed + notified
- Obituary: approved + delivered
- Final messages sent to contacts
- All assets accessible to trusted contacts
- Sends ACTUAL emails to trusted contacts with the obituary

Run: .venv\Scripts\python.exe -m backend.seed_dead_user
"""

import asyncio
import sys
import os
import json
import hashlib
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend import db
from backend.db import supabase
from backend.agents import notify_agent


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


async def seed():
    print("=" * 60)
    print("SEEDING DECEASED USER: Vikram Desai")
    print("Email: lishikameghani@gmail.com")
    print("=" * 60)

    # Clean existing
    existing = supabase.table("users").select("id").eq("email", "lishikameghani@gmail.com").execute()
    if existing.data:
        uid = existing.data[0]["id"]
        supabase.table("trusted_contacts").delete().eq("user_id", uid).execute()
        supabase.table("assets").delete().eq("user_id", uid).execute()
        supabase.table("escalation_state").delete().eq("user_id", uid).execute()
        supabase.table("obituaries").delete().eq("user_id", uid).execute()
        supabase.table("score_history").delete().eq("user_id", uid).execute()
        supabase.table("monitor_log").delete().eq("user_id", uid).execute()
        supabase.table("users").delete().eq("id", uid).execute()
        print(f"  Cleaned existing data for user {uid}")

    # Create user — last check-in 90 days ago
    res = supabase.table("users").insert({
        "name": "Vikram Desai",
        "email": "lishikameghani@gmail.com",
        "password_hash": hash_password("demo1234"),
        "checkin_interval_days": 7,
        "last_checkin_at": (datetime.utcnow() - timedelta(days=90)).isoformat(),
        "stage2_unlocked": True,
        "conflict_analysis": """## FINAL ESTATE DISTRIBUTION — Vikram Desai
### Status: STAGE 2 ACCESS GRANTED (Day 90)
### Executor: Advocate Suresh Iyer, Mumbai High Court

---

### 1. HDFC Life Term Insurance — ₹1,00,00,000
**Beneficiary**: Priya Desai (Wife) — 100%
**Status**: Claim initiated. Policy documents shared with executor.
**Legal Note**: As beneficial nominee (spouse), sum vests directly. No succession dispute.

### 2. Bandra West Apartment — ₹3,50,00,000
**Beneficiary**: Priya Desai (Wife) — lifetime residence right
**Succession**: After Priya, property to be divided equally between Arjun & Kavya Desai
**Status**: Registered will on file. Mutation process initiated.
**Legal Note**: Registered will overrides intestate succession under Indian Succession Act.

### 3. Desai Exports Pvt Ltd — 60% Stake (₹4,50,00,000)
**Beneficiary**: Arjun Desai (Son) — 40% stake, Kavya Desai (Daughter) — 20% stake
**Status**: Board resolution passed. Share transfer in progress.
**Legal Note**: Private company shares transfer per Articles of Association + Will.

### 4. SBI Savings Account — ₹12,00,000
**Beneficiary**: Split equally — Arjun (₹6L education) + Kavya (₹6L education)
**Status**: Joint operation mandate activated for Priya Desai.
**Legal Note**: Nominee (Priya) holds as trustee for children per will instructions.

---

### ESCALATION TIMELINE:
- Day 0: Last check-in (Feb 14, 2026)
- Day 7: First reminder email sent (no response)
- Day 14: Contact 1 (Priya Desai) notified via email + SMS
- Day 21: Contact 2 (Advocate Suresh Iyer) notified
- Day 30: Both contacts confirmed. Stage 2 access granted.
- Day 30+: All documents, vault access, and final messages released.

### ALL CONFLICTS RESOLVED ✓
No outstanding disputes. All nominations align with registered will.""",
    }).execute()
    uid = res.data[0]["id"]
    print(f"\n  Created user: Vikram Desai (id={uid})")
    print(f"  Last check-in: 90 days ago")
    print(f"  Stage 2: UNLOCKED")

    # --- ASSETS ---
    print("\n  Creating assets...")

    # Asset 1: Term Insurance ₹1 Cr
    await db.create_asset(uid, {
        "category": "TERM_INSURANCE",
        "label": "HDFC Life Click 2 Protect",
        "policy_number": "HDFC-TERM-2020-MH-112233",
        "nominee": "Priya Desai",
        "nominee_relation": "Wife",
        "sum_assured": 10000000,
        "expiry_date": "2045-08-01",
        "raw_json": json.dumps({
            "asset_type": "TERM_INSURANCE",
            "insurer_name": "HDFC Life Click 2 Protect",
            "policy_number": "HDFC-TERM-2020-MH-112233",
            "nominee_name": "Priya Desai",
            "nominee_relation": "Wife",
            "sum_assured": 10000000,
            "annual_premium": 28000,
            "policy_term": "25 years",
            "claim_status": "Initiated",
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 2: Property ₹3.5 Cr
    await db.create_asset(uid, {
        "category": "PROPERTY",
        "label": "4BHK Sea-facing Apartment, Bandra West, Mumbai",
        "policy_number": "BMC/REG/2018/MH-55621",
        "nominee": "Priya Desai",
        "nominee_relation": "Wife",
        "sum_assured": 35000000,
        "raw_json": json.dumps({
            "asset_type": "PROPERTY",
            "insurer_name": "4BHK Sea-facing Apartment, Bandra West, Mumbai",
            "policy_number": "BMC/REG/2018/MH-55621",
            "location": "12th Floor, Sea Breeze Tower, Carter Road, Bandra West, Mumbai 400050",
            "area": "2200 sq ft",
            "registration_date": "2018-11-05",
            "market_value": 35000000,
            "mutation_status": "In progress",
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 3: Business ₹4.5 Cr
    await db.create_asset(uid, {
        "category": "OTHER",
        "label": "Desai Exports Pvt Ltd (60% stake)",
        "policy_number": "CIN-U51909MH2015PTC123456",
        "nominee": "Arjun Desai",
        "nominee_relation": "Son",
        "sum_assured": 45000000,
        "raw_json": json.dumps({
            "asset_type": "BUSINESS",
            "insurer_name": "Desai Exports Pvt Ltd (60% stake)",
            "policy_number": "CIN-U51909MH2015PTC123456",
            "business_type": "Export Trading",
            "stake_percentage": 60,
            "annual_revenue": 120000000,
            "employees": 85,
            "succession_plan": "Arjun Desai (son) assumes MD role",
            "board_resolution": "Passed on Day 35",
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 4: Bank Account ₹12L
    await db.create_asset(uid, {
        "category": "BANK_ACCOUNT",
        "label": "SBI Savings Account",
        "policy_number": "SBI-MUM-2016-00445566",
        "nominee": "Priya Desai",
        "nominee_relation": "Wife",
        "sum_assured": 1200000,
        "raw_json": json.dumps({
            "asset_type": "BANK_ACCOUNT",
            "insurer_name": "SBI Savings Account",
            "policy_number": "SBI-MUM-2016-00445566",
            "nominee_name": "Priya Desai",
            "nominee_relation": "Wife",
            "balance": 1200000,
            "branch": "SBI Bandra West, Mumbai",
            "joint_operation": "Activated for Priya Desai",
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 5: PPF
    await db.create_asset(uid, {
        "category": "PPF",
        "label": "Public Provident Fund",
        "policy_number": "PPF-SBI-2012-VD-998877",
        "nominee": "Kavya Desai",
        "nominee_relation": "Daughter",
        "sum_assured": 2800000,
        "raw_json": json.dumps({
            "asset_type": "PPF",
            "insurer_name": "Public Provident Fund",
            "policy_number": "PPF-SBI-2012-VD-998877",
            "nominee_name": "Kavya Desai",
            "nominee_relation": "Daughter",
            "balance": 2800000,
            "maturity_date": "2027-04-01",
            "bank": "SBI Bandra West",
        }),
        "warnings_json": json.dumps([]),
    })

    print(f"  5 assets created (Total estate: ₹9.45 Cr)")

    # --- TRUSTED CONTACTS (both confirmed + notified) ---
    print("\n  Creating trusted contacts...")
    supabase.table("trusted_contacts").insert({
        "user_id": uid,
        "name": "Priya Desai",
        "email": "blagggblahhh@gmail.com",
        "phone": "+919876600001",
        "confirmed": True,
        "notified_at": (datetime.utcnow() - timedelta(days=76)).isoformat(),
    }).execute()
    supabase.table("trusted_contacts").insert({
        "user_id": uid,
        "name": "Advocate Suresh Iyer",
        "email": "suresh.iyer@demo.in",
        "phone": "+919876600002",
        "confirmed": True,
        "notified_at": (datetime.utcnow() - timedelta(days=69)).isoformat(),
    }).execute()
    print(f"  2 contacts (both confirmed + notified)")

    # --- ESCALATION STATE: Day 90 ---
    await db.upsert_escalation_state(uid, 90)
    print(f"  Escalation: Day 90")

    # --- OBITUARY: Approved + Delivered ---
    print("\n  Creating final messages...")
    obituary_text = (
        "My dearest Priya, Arjun, and Kavya,\n\n"
        "If you're reading this, know that my love for each of you is eternal and unchanging. "
        "I've lived a life full of purpose — building our business from nothing, watching our children "
        "grow into remarkable people, and sharing every sunrise and sunset with you, Priya.\n\n"
        "Everything is in order. I planned for this moment years ago so you wouldn't have to worry "
        "about anything practical during the hardest time.\n\n"
        "Priya — the apartment is yours for life. Don't rush any decisions. Take your time to grieve, "
        "lean on family, and know that I structured everything to protect you.\n\n"
        "Arjun — the business is in your hands now. Lead with the same integrity your grandfather taught me. "
        "The team trusts you. Advocate Suresh will guide you through the transition.\n\n"
        "Kavya — your education fund is secured. Chase your dreams fearlessly. "
        "The PPF matures next year — use it wisely.\n\n"
        "To all of you: live fully, love deeply, and take care of each other. "
        "I'll be watching over you always.\n\n"
        "Forever yours,\nVikram\n\n"
        "P.S. The spare key to the safe deposit box is in the blue book on my study shelf, third row."
    )

    supabase.table("obituaries").insert({
        "user_id": uid,
        "recipient_name": "Family",
        "recipient_email": "blagggblahhh@gmail.com",
        "message_encrypted": obituary_text,
        "delivered": True,
        "draft_approved": True,
    }).execute()
    print(f"  Obituary: Approved + Delivered")

    # --- SCORE HISTORY (90 days at 100) ---
    for i in range(30):
        await db.insert_score_history(uid, 100, {
            "assets": True,
            "analysis": True,
            "contacts": True,
            "obituary": True,
        })

    # --- SEND ACTUAL EMAILS ---
    print("\n  Sending actual notification emails...")

    # Email 1: To trusted contact (Priya) — stage 2 notification
    email_sent_1 = await notify_agent.send_email(
        "blagggblahhh@gmail.com",
        "GriefSync — Stage 2 Access Granted for Vikram Desai",
        (
            "<h2>Stage 2 Access Granted</h2>"
            "<p>Dear Priya,</p>"
            "<p>This is an automated notification from GriefSync. Vikram Desai has not checked in for <strong>90 days</strong>. "
            "Both trusted contacts have confirmed awareness.</p>"
            "<p><strong>Stage 2 access has been granted.</strong> You now have full access to:</p>"
            "<ul>"
            "<li>All estate documents and vault contents</li>"
            "<li>Asset details and nominee information</li>"
            "<li>The registered will and conflict analysis</li>"
            "<li>Final messages from Vikram</li>"
            "</ul>"
            "<p>Total estate value: <strong>₹9,45,00,000</strong></p>"
            "<p>Executor: Advocate Suresh Iyer (Mumbai High Court)</p>"
            "<br>"
            "<p><em>— GriefSync Continuity System</em></p>"
        ),
    )
    print(f"    → blagggblahhh@gmail.com: {'SENT ✓' if email_sent_1 else 'FAILED'}")

    # Email 2: Final message delivery
    email_sent_2 = await notify_agent.send_email(
        "blagggblahhh@gmail.com",
        "A message from Vikram Desai — Final Words",
        (
            "<h2>Final Message from Vikram</h2>"
            "<p>Dear Priya,</p>"
            "<p>Vikram prepared this message for you through GriefSync. "
            "He wanted you to have these words when the time came.</p>"
            "<hr>"
            f"<div style='font-family:Georgia,serif;font-size:16px;line-height:1.8;padding:20px;background:#f9f7f4;border-radius:8px;'>"
            f"{obituary_text.replace(chr(10), '<br>')}"
            f"</div>"
            "<hr>"
            "<p><em>This message was sealed and approved by Vikram on his GriefSync account. "
            "It was delivered automatically after the escalation protocol completed.</em></p>"
            "<br>"
            "<p><em>— GriefSync Continuity System</em></p>"
        ),
    )
    print(f"    → blagggblahhh@gmail.com (final message): {'SENT ✓' if email_sent_2 else 'FAILED'}")

    print("\n" + "=" * 60)
    print("DECEASED USER SEEDED SUCCESSFULLY")
    print("=" * 60)
    print(f"\n  Login: lishikameghani@gmail.com / demo1234")
    print(f"  State: Dead user — 90 days since last check-in")
    print(f"  Stage 2: UNLOCKED")
    print(f"  Contacts: Both confirmed + notified")
    print(f"  Emails: Sent to blagggblahhh@gmail.com")
    print(f"  Estate: ₹9.45 Cr across 5 assets")
    print(f"  Will: Fully distributed, no conflicts")


asyncio.run(seed())
