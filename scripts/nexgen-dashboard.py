#!/usr/bin/env python3
"""NexGen Business Dashboard — queries D1 and displays full business status.

Usage:
    python3 scripts/nexgen-dashboard.py

Your AI assistant can run this to show you the dashboard.
Requires: npx wrangler authenticated (run from Windows PC in repo root).
"""

import json
import subprocess
import sys
import os
from datetime import datetime

# Fix Windows console encoding for emoji
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")

WORKER_DIR = "onboarding-pipeline/cf-worker"


def d1(sql: str) -> list:
    """Execute SQL against remote D1 and return results."""
    try:
        # Collapse SQL to single line, escape for shell
        single_line_sql = " ".join(sql.split()).replace('"', '\\"')
        cmd = f'npx wrangler d1 execute nexgen-jobs --remote --json --command "{single_line_sql}"'
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30, cwd=WORKER_DIR, shell=True,
        )
        stdout = result.stdout.strip()
        json_start = stdout.find("[")
        json_end = stdout.rfind("]") + 1
        if json_start == -1 or json_end == 0:
            return []
        data = json.loads(stdout[json_start:json_end])
        if isinstance(data, list) and len(data) > 0:
            return data[0].get("results", [])
        return []
    except (json.JSONDecodeError, subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"  (D1 query failed: {e})")
        return []


def section(title: str):
    print(f"\n┌─────────────────────────────────────────────────────────┐")
    print(f"│  {title:<56}│")
    print(f"└─────────────────────────────────────────────────────────┘")


def main():
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    print("=" * 60)
    print("  📊 NexGen 蟹助手 — Business Dashboard")
    print(f"  Generated: {now}")
    print("=" * 60)

    # ── 1. API Usage & Budget ──
    section("💰 API Usage & Budget (Current Month)")
    rows = d1("SELECT customer_id, tier, monthly_budget_hkd, current_spend_hkd, warned_at, blocked_at, total_requests, total_tokens_in, total_tokens_out, current_month FROM api_usage ORDER BY tier, customer_id")

    if not rows:
        print("  (no customers)")
    else:
        tier_names = {1: "T1", 2: "T2", 3: "T3"}
        print(f"  {'Customer':<16} {'Tier':<6} {'Budget':>8} {'Spent':>10} {'Used':>7} {'Status':<10} {'Reqs':>6} {'Tok In':>10} {'Tok Out':>10}")
        print("  " + "─" * 90)
        for r in rows:
            budget = r["monthly_budget_hkd"] or 0
            spent = r["current_spend_hkd"] or 0
            pct = (spent / budget * 100) if budget > 0 else 0
            if r.get("blocked_at"):
                status = "BLOCKED"
            elif r.get("warned_at"):
                status = "WARNING"
            else:
                status = "Normal"
            tier = tier_names.get(r["tier"], "?")
            print(f"  {r['customer_id']:<16} {tier:<6} ${budget:>7.2f} ${spent:>9.4f} {pct:>5.1f}% {status:<10} {r['total_requests']:>6} {r['total_tokens_in']:>10,} {r['total_tokens_out']:>10,}")
        total_spent = sum(r["current_spend_hkd"] or 0 for r in rows)
        print(f"\n  Total customers: {len(rows)} | Month spend: HK${total_spent:.2f}")

    # ── 2. VPS Instances ──
    section("🖥️  VPS Instances")
    rows = d1("""SELECT vps_id, contabo_ip, customer_id, status, tier,
        reinstall_count, billing_start, cancel_date, cancel_deadline
    FROM vps_instances ORDER BY status, vps_id""")

    if not rows:
        print("  (no VPS instances tracked)")
    else:
        icons = {"active": "🟢", "provisioning": "🔵", "cancelling": "🟡", "expired": "⚫"}
        print(f"  {'VPS ID':<14} {'IP':<18} {'Customer':<14} {'Status':<14} {'Tier':>4} {'Reinstalls':>10} {'Billing':>12} {'Cancel':>12} {'Deadline':>12}")
        print("  " + "─" * 115)
        for r in rows:
            icon = icons.get(r["status"], "❓")
            ip = r["contabo_ip"] or "—"
            cust = r["customer_id"] or "—"
            tier = f"T{r['tier']}" if r["tier"] else "—"
            billing = (r["billing_start"] or "—")[:10]
            cancel = (r["cancel_date"] or "—")[:10]
            deadline = (r["cancel_deadline"] or "—")[:10]
            print(f"  {r['vps_id']:<14} {ip:<18} {cust:<14} {icon} {r['status']:<10} {tier:>4} {r['reinstall_count'] or 0:>10} {billing:>12} {cancel:>12} {deadline:>12}")

        counts = {}
        for r in rows:
            counts[r["status"]] = counts.get(r["status"], 0) + 1
        summary = " | ".join(f"{s}: {c}" for s, c in counts.items())
        recyclable = sum(1 for r in rows if r["status"] == "cancelling")
        print(f"\n  Total: {len(rows)} | {summary}")
        if recyclable:
            print(f"  ♻️  Recyclable pool: {recyclable} VPS ready for reuse")

    # ── 3. Job Queue ──
    section("📋 Job Queue")
    rows = d1("""SELECT id, job_type, tier, display_name, status, server_ip,
        payment_method, substr(error_log, 1, 60) as error_preview, created_at, updated_at
    FROM jobs ORDER BY
        CASE status WHEN 'ready' THEN 1 WHEN 'provisioning' THEN 2 WHEN 'installing' THEN 3
            WHEN 'qa' THEN 4 WHEN 'pending_payment' THEN 5 WHEN 'complete' THEN 6
            WHEN 'failed' THEN 7 WHEN 'stale' THEN 8 END,
        created_at DESC""")

    if not rows:
        print("  (no jobs)")
    else:
        icons = {"ready": "🟢", "provisioning": "🔵", "installing": "🔵", "qa": "🟡",
                 "pending_payment": "⏳", "complete": "✅", "failed": "❌", "stale": "⚫"}
        print(f"  {'ID':<8} {'Type':<10} {'Tier':>4} {'Customer':<14} {'Status':<16} {'Server IP':<18} {'Payment':<12} {'Created':<12}")
        print("  " + "─" * 100)
        for r in rows:
            icon = icons.get(r["status"], "❓")
            ip = r["server_ip"] or "—"
            pay = r["payment_method"] or "—"
            created = (r["created_at"] or "")[:10]
            print(f"  {r['id']:<8} {r['job_type']:<10} T{r['tier']:>3} {r['display_name']:<14} {icon} {r['status']:<12} {ip:<18} {pay:<12} {created}")
            if r.get("error_preview"):
                print(f"           └─ ⚠️  {r['error_preview']}")

        counts = {}
        for r in rows:
            counts[r["status"]] = counts.get(r["status"], 0) + 1
        summary = " | ".join(f"{s}: {c}" for s, c in counts.items())
        active = sum(1 for r in rows if r["status"] in ("ready", "provisioning", "installing", "qa"))
        print(f"\n  Total: {len(rows)} | {summary}")
        if active:
            print(f"  🔥 Active jobs: {active} in progress")

    # ── 4. Pi5 Health ──
    section("🫀 Pi5 Worker Health")
    rows = d1("""SELECT worker_id, last_ping, alerted,
        ROUND((julianday('now') - julianday(last_ping)) * 24 * 60, 1) as mins_ago
    FROM health""")

    if not rows:
        print("  ❓ No health records — Pi5 worker has not started yet")
    else:
        for r in rows:
            mins = r["mins_ago"] or 999
            if mins < 5:
                icon, status = "🟢", "Healthy"
            elif mins < 15:
                icon, status = "🟡", "Delayed"
            else:
                icon, status = "🔴", f"OFFLINE ({int(mins)} min ago)"
            alert = " ⚠️ ALERT SENT" if r["alerted"] else ""
            print(f"  {icon} {r['worker_id']}: Last ping {r['last_ping']} ({int(mins)} min ago) — {status}{alert}")

    # ── 5. Usage History ──
    section("📈 Monthly Usage History")
    rows = d1("""SELECT customer_id, month, spend_hkd, requests, tokens_in, tokens_out, budget_hkd
    FROM usage_history ORDER BY month DESC, customer_id LIMIT 20""")

    if not rows:
        print("  (no history yet — written on month rollover)")
    else:
        print(f"  {'Customer':<16} {'Month':<10} {'Spend':>10} {'Reqs':>8} {'Tok In':>12} {'Tok Out':>10} {'Budget':>10}")
        print("  " + "─" * 80)
        for r in rows:
            budget = f"${r['budget_hkd']:.2f}" if r["budget_hkd"] else "—"
            print(f"  {r['customer_id']:<16} {r['month']:<10} ${r['spend_hkd']:>9.2f} {r['requests']:>8} {r['tokens_in']:>12,} {r['tokens_out']:>10,} {budget:>10}")

    # ── 6. Recent Audit Log ──
    section("📝 Recent Audit Log (last 10)")
    rows = d1("""SELECT action, customer_id, substr(details, 1, 60) as details, created_at
    FROM audit_log ORDER BY created_at DESC LIMIT 10""")

    if not rows:
        print("  (no audit events)")
    else:
        print(f"  {'Time':<22} {'Action':<20} {'Customer':<14} {'Details'}")
        print("  " + "─" * 90)
        for r in rows:
            ts = (r["created_at"] or "")[:19]
            details = r["details"] or ""
            print(f"  {ts:<22} {r['action']:<20} {r['customer_id']:<14} {details}")

    # ── 7. Tier Config ──
    section("⚙️  Tier Config & Cost Rates")
    print("""  Tier    Name        Monthly Fee   API Budget   Budget/Fee   Auto-Set
  ─────────────────────────────────────────────────────────────────────
  🌱 T1   新手上路     HK$148        HK$40        27%          deployer.py
  ⭐ T2   智能管家     HK$248        HK$70        28%          deployer.py
  🚀 T3   全能大師     HK$388        HK$100       26%          deployer.py

  Cost Rates (wrangler.toml):
    DeepSeek V3.2:      $0.28/1M in, $0.42/1M out  (main chat)
    OpenAI embed:       $0.02/1M in                 (Mem0 recall)
    Zhipu GLM-4-Flash:  FREE                        (Mem0 extraction)

  Budget Enforcement:  90% → warn header  |  100% → 429 block  |  1st of month → reset""")

    print()
    print("=" * 60)
    print(f"  Run: python3 scripts/nexgen-dashboard.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
