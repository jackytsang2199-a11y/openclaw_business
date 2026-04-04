#!/usr/bin/env python3
"""NexGen Business Dashboard — queries D1 and displays full business status.

Usage:
    python3 nexgen-dashboard.py              # Auto-detect mode
    python3 nexgen-dashboard.py --api        # Force HTTP API mode (Pi5 or anywhere)
    python3 nexgen-dashboard.py --wrangler   # Force wrangler mode (PC only)

Works on both:
  - Windows PC: uses npx wrangler d1 (default if wrangler available)
  - Pi5 / any machine: uses CF Worker admin API with CONFIRM_API_KEY

Env vars for API mode (set in .env or export):
  CF_WORKER_URL=https://api.3nexgen.com
  CONFIRM_API_KEY=<your admin key>
"""

import json
import subprocess
import sys
import os
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding for emoji
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")

WORKER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "onboarding-pipeline", "cf-worker")

# ── Data access layer ─────────────────────────────────────────

MODE = None  # "wrangler" or "api", set in main()
API_BASE = None
API_KEY = None


def _load_env():
    """Try loading .env from Pi5 worker dir or script dir."""
    for env_path in [
        Path.home() / "nexgen-worker" / ".env",
        Path(__file__).parent.parent / "onboarding-pipeline" / "pi5-worker" / ".env",
    ]:
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())


def _detect_mode():
    """Detect whether to use wrangler or API mode."""
    if "--api" in sys.argv:
        return "api"
    if "--wrangler" in sys.argv:
        return "wrangler"
    # Auto-detect: if CONFIRM_API_KEY is set, prefer API (works everywhere)
    _load_env()
    if os.environ.get("CONFIRM_API_KEY"):
        return "api"
    return "wrangler"


def _api_get(path: str) -> dict:
    """GET request to CF Worker admin API."""
    try:
        import urllib.request
        req = urllib.request.Request(
            f"{API_BASE}{path}",
            headers={"X-API-Key": API_KEY},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  (API request failed: {e})")
        return {}


def _api_worker_get(path: str) -> dict:
    """GET request using WORKER_TOKEN auth."""
    try:
        import urllib.request
        token = os.environ.get("WORKER_TOKEN", "")
        req = urllib.request.Request(
            f"{API_BASE}{path}",
            headers={"X-Worker-Token": token},
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  (API request failed: {e})")
        return {}


def d1(sql: str) -> list:
    """Execute SQL against remote D1 via wrangler."""
    try:
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


# ── Display helpers ───────────────────────────────────────────

def section(title: str):
    print(f"\n┌─────────────────────────────────────────────────────────┐")
    print(f"│  {title:<56}│")
    print(f"└─────────────────────────────────────────────────────────┘")


# ── Sections ──────────────────────────────────────────────────

def show_usage():
    section("💰 API Usage & Budget (Current Month)")
    if MODE == "api":
        data = _api_get("/api/usage")
        rows = data.get("usage", [])
    else:
        rows = d1("SELECT customer_id, tier, monthly_budget_hkd, current_spend_hkd, warned_at, blocked_at, total_requests, total_tokens_in, total_tokens_out, current_month FROM api_usage ORDER BY tier, customer_id")

    if not rows:
        print("  (no customers)")
        return

    tier_names = {1: "T1", 2: "T2", 3: "T3"}
    print(f"  {'Customer':<16} {'Tier':<6} {'Budget':>8} {'Spent':>10} {'Used':>7} {'Status':<10} {'Reqs':>6} {'Tok In':>10} {'Tok Out':>10}")
    print("  " + "─" * 90)
    for r in rows:
        budget = r.get("monthly_budget_hkd") or 0
        spent = r.get("current_spend_hkd") or 0
        pct = (spent / budget * 100) if budget > 0 else 0
        if r.get("blocked_at") or r.get("blocked"):
            status = "BLOCKED"
        elif r.get("warned_at") or r.get("warned"):
            status = "WARNING"
        else:
            status = "Normal"
        tier = tier_names.get(r.get("tier"), "?")
        reqs = r.get("total_requests", 0)
        tok_in = r.get("total_tokens_in", 0)
        tok_out = r.get("total_tokens_out", 0)
        print(f"  {r['customer_id']:<16} {tier:<6} ${budget:>7.2f} ${spent:>9.4f} {pct:>5.1f}% {status:<10} {reqs:>6} {tok_in:>10,} {tok_out:>10,}")
    total_spent = sum(r.get("current_spend_hkd") or 0 for r in rows)
    print(f"\n  Total customers: {len(rows)} | Month spend: HK${total_spent:.2f}")


def show_vps():
    section("🖥️  VPS Instances")
    if MODE == "api":
        data = _api_worker_get("/api/vps?status=active")
        rows_active = data.get("vps_list", [])
        data2 = _api_worker_get("/api/vps?status=cancelling")
        rows_cancel = data2.get("vps_list", [])
        rows = rows_active + rows_cancel
    else:
        rows = d1("SELECT vps_id, contabo_ip, customer_id, status, tier, reinstall_count, billing_start, cancel_date, cancel_deadline FROM vps_instances ORDER BY status, vps_id")

    if not rows:
        print("  (no VPS instances tracked)")
        return

    print(f"  {'VPS ID':<14} {'IP':<18} {'Customer':<14} {'Status':<14} {'Tier':>4} {'Reinstalls':>10} {'Billing':>12} {'Cancel':>12}")
    print("  " + "─" * 105)
    for r in rows:
        icons = {"active": "🟢", "provisioning": "🔵", "cancelling": "🟡", "expired": "⚫"}
        icon = icons.get(r.get("status", ""), "❓")
        ip = r.get("contabo_ip") or "—"
        cust = r.get("customer_id") or "—"
        tier = f"T{r['tier']}" if r.get("tier") else "—"
        billing = (r.get("billing_start") or "—")[:10]
        cancel = (r.get("cancel_date") or "—")[:10]
        print(f"  {r.get('vps_id','?'):<14} {ip:<18} {cust:<14} {icon} {r.get('status','?'):<10} {tier:>4} {r.get('reinstall_count',0) or 0:>10} {billing:>12} {cancel:>12}")

    counts = {}
    for r in rows:
        s = r.get("status", "?")
        counts[s] = counts.get(s, 0) + 1
    summary = " | ".join(f"{s}: {c}" for s, c in counts.items())
    recyclable = sum(1 for r in rows if r.get("status") == "cancelling")
    print(f"\n  Total: {len(rows)} | {summary}")
    if recyclable:
        print(f"  ♻️  Recyclable pool: {recyclable} VPS ready for reuse")


def show_jobs():
    section("📋 Job Queue")
    if MODE == "api":
        # API only exposes /api/jobs/next (single pending job), not full list
        # Use wrangler fallback or show limited info
        print("  (job list requires wrangler mode — use --wrangler on PC)")
        return

    rows = d1("""SELECT id, job_type, tier, display_name, status, server_ip,
        payment_method, substr(error_log, 1, 60) as error_preview, created_at, updated_at
    FROM jobs ORDER BY
        CASE status WHEN 'ready' THEN 1 WHEN 'provisioning' THEN 2 WHEN 'installing' THEN 3
            WHEN 'qa' THEN 4 WHEN 'pending_payment' THEN 5 WHEN 'complete' THEN 6
            WHEN 'failed' THEN 7 WHEN 'stale' THEN 8 END,
        created_at DESC""")

    if not rows:
        print("  (no jobs)")
        return

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


def show_health():
    section("🫀 Pi5 Worker Health")
    if MODE == "api":
        # Health endpoint is POST (ping), not GET — check via wrangler or skip
        print("  (health check requires wrangler mode for D1 query)")
        print("  Pi5 worker sends heartbeat every 5 min to POST /api/health")
        return

    rows = d1("""SELECT worker_id, last_ping, alerted,
        ROUND((julianday('now') - julianday(last_ping)) * 24 * 60, 1) as mins_ago
    FROM health""")

    if not rows:
        print("  ❓ No health records — Pi5 worker has not started yet")
        return

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


def show_history():
    section("📈 Monthly Usage History")
    if MODE == "api":
        print("  (history requires wrangler mode for D1 query)")
        return

    rows = d1("""SELECT customer_id, month, spend_hkd, requests, tokens_in, tokens_out, budget_hkd
    FROM usage_history ORDER BY month DESC, customer_id LIMIT 20""")

    if not rows:
        print("  (no history yet — written on month rollover)")
        return

    print(f"  {'Customer':<16} {'Month':<10} {'Spend':>10} {'Reqs':>8} {'Tok In':>12} {'Tok Out':>10} {'Budget':>10}")
    print("  " + "─" * 80)
    for r in rows:
        budget = f"${r['budget_hkd']:.2f}" if r["budget_hkd"] else "—"
        print(f"  {r['customer_id']:<16} {r['month']:<10} ${r['spend_hkd']:>9.2f} {r['requests']:>8} {r['tokens_in']:>12,} {r['tokens_out']:>10,} {budget:>10}")


def show_audit():
    section("📝 Recent Audit Log (last 10)")
    if MODE == "api":
        print("  (audit log requires wrangler mode for D1 query)")
        return

    rows = d1("""SELECT action, customer_id, substr(details, 1, 60) as details, created_at
    FROM audit_log ORDER BY created_at DESC LIMIT 10""")

    if not rows:
        print("  (no audit events)")
        return

    print(f"  {'Time':<22} {'Action':<20} {'Customer':<14} {'Details'}")
    print("  " + "─" * 90)
    for r in rows:
        ts = (r["created_at"] or "")[:19]
        details = r["details"] or ""
        print(f"  {ts:<22} {r['action']:<20} {r['customer_id']:<14} {details}")


def show_config():
    section("⚙️  Tier Config & Cost Rates")
    print("""  Tier    Name        Monthly Fee   API Budget   Budget/Fee   Auto-Set
  ─────────────────────────────────────────────────────────────────────
  T1      新手上路     HK$148        HK$40        27%          deployer.py
  T2      智能管家     HK$248        HK$70        28%          deployer.py
  T3      全能大師     HK$388        HK$100       26%          deployer.py

  Cost Rates (wrangler.toml):
    DeepSeek V3.2:      $0.28/1M in, $0.42/1M out  (main chat)
    OpenAI embed:       $0.02/1M in                 (Mem0 recall)
    Zhipu GLM-4-Flash:  FREE                        (Mem0 extraction)

  Budget Enforcement:  90% → warn header  |  100% → 429 block  |  1st of month → reset""")


# ── Main ──────────────────────────────────────────────────────

def main():
    global MODE, API_BASE, API_KEY

    MODE = _detect_mode()
    if MODE == "api":
        _load_env()
        API_BASE = os.environ.get("CF_WORKER_URL", "https://api.3nexgen.com")
        API_KEY = os.environ.get("CONFIRM_API_KEY", "")
        if not API_KEY:
            print("ERROR: CONFIRM_API_KEY not set. Add it to ~/nexgen-worker/.env or export it.")
            sys.exit(1)

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    mode_label = "API" if MODE == "api" else "Wrangler"
    print("=" * 60)
    print(f"  📊 NexGen — Business Dashboard  [{mode_label} mode]")
    print(f"  Generated: {now}")
    print("=" * 60)

    show_usage()
    show_vps()
    show_jobs()
    show_health()
    show_history()
    show_audit()
    show_config()

    print()
    print("=" * 60)
    print(f"  Run: python3 nexgen-dashboard.py [--api | --wrangler]")
    print("=" * 60)


if __name__ == "__main__":
    main()
