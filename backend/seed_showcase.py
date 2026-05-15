"""
Seed showcase data for GriefSync — creates two demo users:

1. ANANYA MEHTA (Active user) — Software architect, 32, Bangalore
   - 5 diverse assets (LIC, Property, Mutual Fund, EPF, Bank FD)
   - 2 trusted contacts
   - Conflict analysis done
   - Obituary drafted
   - Score history
   - Demonstrates: full estate management, conflict detection, will building

2. VIKRAM DESAI (Deceased user) — Entrepreneur, 45, Mumbai
   - 4 assets (Term Insurance, Property, Business, Bank Account)
   - 2 trusted contacts (both confirmed + notified)
   - Escalation at day 35 (stage 2 unlocked)
   - Obituary approved + delivered
   - Demonstrates: post-death workflow, stage 2 access, contact notification

Run: python -m backend.seed_showcase
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


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


async def seed():
    print("=" * 60)
    print("SEEDING SHOWCASE DATA")
    print("=" * 60)

    # ============================================================
    # USER 1: ANANYA MEHTA — Active user with diverse estate
    # ============================================================
    print("\n--- User 1: Ananya Mehta (Active) ---")

    # Clean existing
    existing = supabase.table("users").select("id").eq("email", "ananya@demo.in").execute()
    if existing.data:
        uid1 = existing.data[0]["id"]
        supabase.table("trusted_contacts").delete().eq("user_id", uid1).execute()
        supabase.table("assets").delete().eq("user_id", uid1).execute()
        supabase.table("escalation_state").delete().eq("user_id", uid1).execute()
        supabase.table("obituaries").delete().eq("user_id", uid1).execute()
        supabase.table("score_history").delete().eq("user_id", uid1).execute()
        supabase.table("users").delete().eq("id", uid1).execute()

    # Create user
    res = supabase.table("users").insert({
        "name": "Ananya Mehta",
        "email": "ananya@demo.in",
        "password_hash": hash_password("demo1234"),
        "checkin_interval_days": 14,
        "last_checkin_at": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        "conflict_analysis": """## Estate Conflict Analysis — Ananya Mehta

### Conflict 1: LIC Policy Nominee vs Legal Heirs
The LIC Jeevan Anand policy (₹25,00,000) names Sunita Mehta (mother) as sole nominee. Under the Hindu Succession Act 1956, if Ananya is married, her spouse would be a Class I legal heir with equal claim. The nominee acts as trustee, not absolute owner.

**Risk**: Medium — If married, spouse may contest the nomination.
**Recommendation**: Add spouse as co-nominee or update will to clarify intent.

### Conflict 2: Property Without Clear Succession Plan
The Bangalore apartment (₹1.2 Cr) has no nominee field (property doesn't have nominees). Without a registered will, it will devolve per Hindu Succession Act to all Class I heirs equally.

**Risk**: High — Property disputes are the most litigated inheritance issue in India.
**Recommendation**: Execute a registered will specifying the property beneficiary.

### Conflict 3: EPF Nominee Missing
The EPF account (₹8,50,000) has no nominee on record. Under EPF Act rules, without a nominee, the amount goes to the family member as per the EPF nomination form hierarchy.

**Risk**: High — Claim process becomes extremely complex without nomination.
**Recommendation**: File Form 2 (revised) with EPFO immediately.

### Summary
Estate readiness: 65%. Three critical gaps need attention. The property and EPF issues should be resolved within 30 days.""",
    }).execute()
    uid1 = res.data[0]["id"]
    print(f"  Created: Ananya Mehta (id={uid1}, email=ananya@demo.in, password=demo1234)")

    # Asset 1: LIC Policy
    await db.create_asset(uid1, {
        "category": "LIC",
        "label": "LIC Jeevan Anand Policy",
        "policy_number": "LIC-2022-KA-445678",
        "nominee": "Sunita Mehta",
        "nominee_relation": "Mother",
        "sum_assured": 2500000,
        "expiry_date": "2047-06-15",
        "raw_json": json.dumps({
            "policy_number": "LIC-2022-KA-445678",
            "nominee_name": "Sunita Mehta",
            "nominee_relation": "Mother",
            "expiry_date": "2047-06-15",
            "sum_assured": 2500000,
            "insurer_name": "LIC Jeevan Anand Policy",
            "asset_type": "LIC",
            "premium_mode": "Annual",
            "annual_premium": 62000,
            "policy_term": "25 years",
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 2: Property — Bangalore apartment
    await db.create_asset(uid1, {
        "category": "PROPERTY",
        "label": "3BHK Apartment, Indiranagar, Bangalore",
        "policy_number": "BDA/REG/2021/KA-88432",
        "nominee": None,
        "nominee_relation": None,
        "sum_assured": 12000000,
        "raw_json": json.dumps({
            "asset_type": "PROPERTY",
            "insurer_name": "3BHK Apartment, Indiranagar, Bangalore",
            "policy_number": "BDA/REG/2021/KA-88432",
            "location": "4th Floor, Prestige Lakeside, 100 Feet Road, Indiranagar, Bangalore 560038",
            "area": "1650 sq ft",
            "registration_date": "2021-03-22",
            "market_value": 12000000,
            "ownership": "Sole owner",
        }),
        "warnings_json": json.dumps(["No nominee on record — property will devolve per succession law"]),
    })

    # Asset 3: Mutual Fund
    await db.create_asset(uid1, {
        "category": "MUTUAL_FUND",
        "label": "HDFC Flexi Cap Fund",
        "policy_number": "HDFC-MF-2023-AN-7721",
        "nominee": "Sunita Mehta",
        "nominee_relation": "Mother",
        "sum_assured": 850000,
        "raw_json": json.dumps({
            "asset_type": "MUTUAL_FUND",
            "insurer_name": "HDFC Flexi Cap Fund",
            "policy_number": "HDFC-MF-2023-AN-7721",
            "nominee_name": "Sunita Mehta",
            "nominee_relation": "Mother",
            "folio_number": "1234567890",
            "units": 4250,
            "nav_date": "2026-05-10",
            "current_value": 850000,
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 4: EPF — no nominee (intentional conflict)
    await db.create_asset(uid1, {
        "category": "EPF",
        "label": "Employee Provident Fund",
        "policy_number": "UAN-200145678901",
        "nominee": None,
        "nominee_relation": None,
        "sum_assured": 850000,
        "raw_json": json.dumps({
            "asset_type": "EPF",
            "insurer_name": "Employee Provident Fund",
            "policy_number": "UAN-200145678901",
            "employer": "TechCorp India Pvt Ltd",
            "monthly_contribution": 15000,
            "total_balance": 850000,
        }),
        "warnings_json": json.dumps(["EPF has no nominee — provident fund payout will require court process"]),
    })

    # Asset 5: Bank Fixed Deposit
    await db.create_asset(uid1, {
        "category": "BANK_ACCOUNT",
        "label": "ICICI Bank Fixed Deposit",
        "policy_number": "ICICI-FD-2024-001234",
        "nominee": "Rajesh Mehta",
        "nominee_relation": "Father",
        "sum_assured": 1500000,
        "expiry_date": "2027-01-15",
        "raw_json": json.dumps({
            "asset_type": "BANK_ACCOUNT",
            "insurer_name": "ICICI Bank Fixed Deposit",
            "policy_number": "ICICI-FD-2024-001234",
            "nominee_name": "Rajesh Mehta",
            "nominee_relation": "Father",
            "maturity_date": "2027-01-15",
            "principal": 1500000,
            "interest_rate": "7.1%",
            "bank_branch": "ICICI Koramangala, Bangalore",
        }),
        "warnings_json": json.dumps([]),
    })

    # Trusted contacts
    await db.save_trusted_contacts(uid1, [
        {"name": "Sunita Mehta", "email": "sunita@demo.in", "phone": "+919876500001"},
        {"name": "Rajesh Mehta", "email": "rajesh@demo.in", "phone": "+919876500002"},
    ])

    # Obituary draft
    await db.create_obituary_draft(uid1,
        "Dear Amma and Papa,\n\n"
        "If you're reading this, I want you to know that every decision I made was with our family in mind. "
        "The apartment in Indiranagar is yours — it was always meant to be your home for as long as you need it.\n\n"
        "My investments and insurance are structured to take care of you both. Sunita aunty has all the details "
        "and knows where every document is stored.\n\n"
        "Please don't grieve too long. I lived a full life, built things I was proud of, and loved deeply. "
        "That's more than enough.\n\n"
        "With all my love,\nAnanya"
    )

    # Score history (last 14 days)
    for i in range(14, 0, -1):
        score = 50 + (14 - i) * 3  # gradually improving
        if score > 100:
            score = 100
        await db.insert_score_history(uid1, min(score, 100), {
            "assets": True,
            "analysis": i < 10,
            "contacts": True,
            "obituary": i < 7,
        })

    print(f"  5 assets (LIC, Property, MF, EPF, FD)")
    print(f"  2 trusted contacts (Sunita — mother, Rajesh — father)")
    print(f"  Conflict analysis pre-loaded")
    print(f"  Obituary draft created")
    print(f"  14-day score history")

    # ============================================================
    # USER 2: VIKRAM DESAI — Deceased user (escalation complete)
    # ============================================================
    print("\n--- User 2: Vikram Desai (Deceased — Stage 2 Active) ---")

    # Clean existing
    existing = supabase.table("users").select("id").eq("email", "lishikameghani@gmail.com").execute()
    if existing.data:
        uid2 = existing.data[0]["id"]
        supabase.table("trusted_contacts").delete().eq("user_id", uid2).execute()
        supabase.table("assets").delete().eq("user_id", uid2).execute()
        supabase.table("escalation_state").delete().eq("user_id", uid2).execute()
        supabase.table("obituaries").delete().eq("user_id", uid2).execute()
        supabase.table("score_history").delete().eq("user_id", uid2).execute()
        supabase.table("users").delete().eq("id", uid2).execute()

    # Create user — last check-in 45 days ago (well past escalation)
    res = supabase.table("users").insert({
        "name": "Vikram Desai",
        "email": "lishikameghani@gmail.com",
        "password_hash": hash_password("demo1234"),
        "checkin_interval_days": 7,
        "last_checkin_at": (datetime.utcnow() - timedelta(days=45)).isoformat(),
        "stage2_unlocked": True,
        "conflict_analysis": """## Estate Analysis — Vikram Desai (Stage 2 Access Granted)

All assets have been verified and are accessible to trusted contacts.

### Asset Distribution (as per registered will):
1. **HDFC Term Insurance (₹1 Cr)** → Priya Desai (wife) — 100%
2. **Bandra Apartment (₹3.5 Cr)** → Priya Desai (wife) — lifetime use, then children equally
3. **Desai Exports Pvt Ltd (60% stake)** → Arjun Desai (son) — 40%, Kavya Desai (daughter) — 20%
4. **SBI Savings (₹12L)** → Split equally between children for education

### Executor: Advocate Suresh Iyer (Mumbai High Court)
### Witnesses: Dr. Ramesh Patel, CA Neha Joshi

All nominations align with the registered will. No conflicts detected.
Stage 2 access was granted on Day 30 after both trusted contacts confirmed.""",
    }).execute()
    uid2 = res.data[0]["id"]
    print(f"  Created: Vikram Desai (id={uid2}, email=lishikameghani@gmail.com, password=demo1234)")

    # Asset 1: Term Insurance
    await db.create_asset(uid2, {
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
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 2: Property — Mumbai apartment
    await db.create_asset(uid2, {
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
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 3: Business
    await db.create_asset(uid2, {
        "category": "OTHER",
        "label": "Desai Exports Pvt Ltd (60% stake)",
        "policy_number": "CIN-U51909MH2015PTC123456",
        "nominee": "Arjun Desai",
        "nominee_relation": "Son",
        "sum_assured": 45000000,
        "raw_json": json.dumps({
            "asset_type": "OTHER",
            "insurer_name": "Desai Exports Pvt Ltd (60% stake)",
            "policy_number": "CIN-U51909MH2015PTC123456",
            "business_type": "Export Trading",
            "stake_percentage": 60,
            "annual_revenue": 120000000,
            "employees": 85,
            "succession_plan": "Arjun Desai (son) to assume MD role",
        }),
        "warnings_json": json.dumps([]),
    })

    # Asset 4: Bank Account
    await db.create_asset(uid2, {
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
        }),
        "warnings_json": json.dumps([]),
    })

    # Trusted contacts — both confirmed and notified
    supabase.table("trusted_contacts").insert({
        "user_id": uid2,
        "name": "Priya Desai",
        "email": "blagggblahhh@gmail.com",
        "phone": "+919876600001",
        "confirmed": True,
        "notified_at": (datetime.utcnow() - timedelta(days=15)).isoformat(),
    }).execute()
    supabase.table("trusted_contacts").insert({
        "user_id": uid2,
        "name": "Advocate Suresh Iyer",
        "email": "suresh.iyer@demo.in",
        "phone": "+919876600002",
        "confirmed": True,
        "notified_at": (datetime.utcnow() - timedelta(days=10)).isoformat(),
    }).execute()

    # Escalation state — day 35 (stage 2 unlocked)
    await db.upsert_escalation_state(uid2, 35)

    # Approved obituary
    supabase.table("obituaries").insert({
        "user_id": uid2,
        "recipient_name": "Family",
        "recipient_email": "blagggblahhh@gmail.com",
        "message_encrypted": (
            "My dearest Priya, Arjun, and Kavya,\n\n"
            "If you're reading this, know that my love for each of you is eternal. "
            "I've lived a life full of purpose — building our business, watching our children grow, "
            "and sharing every moment with you, Priya.\n\n"
            "Everything is in order. Advocate Suresh has the registered will and all documents. "
            "The business succession plan is clear — Arjun, I trust you to lead with integrity. "
            "Kavya, your education fund is secured in the SBI account.\n\n"
            "Priya, the apartment is yours for life. Don't rush any decisions. "
            "Take your time, lean on family, and know that I planned for this moment "
            "so you wouldn't have to worry about anything practical.\n\n"
            "Live fully. Love deeply. I'll be watching over all of you.\n\n"
            "Forever yours,\nVikram"
        ),
        "delivered": True,
        "draft_approved": True,
    }).execute()

    # Score history (flat at 100 for last 30 days)
    for i in range(30, 0, -1):
        await db.insert_score_history(uid2, 100, {
            "assets": True,
            "analysis": True,
            "contacts": True,
            "obituary": True,
        })

    print(f"  4 assets (Term Insurance ₹1Cr, Property ₹3.5Cr, Business ₹4.5Cr, Bank ₹12L)")
    print(f"  2 trusted contacts (both confirmed + notified)")
    print(f"  Escalation: Day 35 — Stage 2 unlocked")
    print(f"  Obituary: Approved + Delivered")
    print(f"  30-day score history (100/100)")

    print("\n" + "=" * 60)
    print("SHOWCASE DATA SEEDED SUCCESSFULLY")
    print("=" * 60)
    print(f"\nLogin credentials:")
    print(f"  User 1: ananya@demo.in / demo1234 (active user, diverse estate)")
    print(f"  User 2: lishikameghani@gmail.com / demo1234 (deceased, stage 2 active)")
    print(f"\nVerify at: {os.getenv('SUPABASE_URL')}")


asyncio.run(seed())
