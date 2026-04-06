"""NexGen Pipeline Dashboard — generates ~/nexgen-dashboard.md status report.

Queries CF Worker API, Pi5 local state, and VPS health via SSH.
Run: python3 dashboard.py
Cron: */15 * * * * ~/nexgen-worker/scripts/nexgen-dashboard-cron.sh
"""

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import requests

# Load .env file if present (for standalone runs without export)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

CF_WORKER_URL = os.environ.get("CF_WORKER_URL", "https://api.3nexgen.com")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")
CONFIRM_API_KEY = os.environ.get("CONFIRM_API_KEY", "")
SSH_KEY = os.environ.get("SSH_KEY_PATH", os.path.expanduser("~/.ssh/nexgen_automation"))
BACKUPS_DIR = Path(os.environ.get("BACKUPS_DIR", os.path.expanduser("~/backups")))
OUTPUT = Path(os.path.expanduser("~/nexgen-dashboard.md"))


def _api(path, admin=False):
    headers = {}
    if admin and CONFIRM_API_KEY:
        headers["X-API-Key"] = CONFIRM_API_KEY
    elif WORKER_TOKEN:
        headers["X-Worker-Token"] = WORKER_TOKEN
    try:
        r = requests.get(f"{CF_WORKER_URL}{path}", headers=headers, timeout=10)
        return r.json() if r.ok else None
    except Exception:
        return None


def _run(cmd, timeout=10):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""


def _vps_health(ip):
    cmd = (
        f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "
        f"-o ConnectTimeout=5 -i {SSH_KEY} deploy@{ip} "
        "'echo GW=$(systemctl --user is-active openclaw-gateway.service 2>/dev/null);"
        "echo WD=$(systemctl --user is-active openclaw-watchdog.service 2>/dev/null);"
        "echo QD=$(curl -sf http://localhost:6333/healthz 2>/dev/null && echo ok || echo down);"
        "echo SX=$(curl -sf -o /dev/null -w ok http://localhost:8888 2>/dev/null || echo down);"
        "echo DK=$(df / --output=avail -BG 2>/dev/null | tail -1 | tr -d \" G\");"
        "echo MM=$(free -m 2>/dev/null | awk \"/^Mem:/ {print \\$7}\")' 2>/dev/null"
    )
    raw = _run(cmd, timeout=20)
    d = {}
    for line in raw.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip()
    return d


def worker_section():
    status = _run("systemctl --user is-active nexgen-worker.service 2>/dev/null") or "unknown"
    enabled = _run("systemctl --user is-enabled nexgen-worker.service 2>/dev/null") or "unknown"
    linger = _run("loginctl show-user $(whoami) 2>/dev/null | grep Linger | cut -d= -f2") or "unknown"
    disk = _run("df /home --output=avail -BG 2>/dev/null | tail -1 | tr -d ' G'") or "?"
    mem = _run("free -m 2>/dev/null | awk '/^Mem:/ {print $7}'") or "?"
    return (
        "## Pi5 Worker\n\n"
        "| Item | Value |\n"
        "|------|-------|\n"
        f"| Service | **{status}** |\n"
        f"| Enabled | {enabled} |\n"
        f"| Linger | {linger} |\n"
        f"| Disk Free | {disk}G |\n"
        f"| Mem Free | {mem}MB |\n"
    )


def pending_orders_section():
    lines = ["## Pending Orders\n"]
    lines.append("| Job ID | Tier | Bot | Email | Created | Status |")
    lines.append("|--------|------|-----|-------|---------|--------|")

    data = _api("/api/jobs/next")
    if not data or not data.get("job"):
        lines.append("| *(no pending orders)* | | | | | |")
        return "\n".join(lines) + "\n"

    job = data["job"]
    jid = job.get("id", "?")
    tier = job.get("tier", "?")
    bot = job.get("bot_username", "?")
    email = job.get("email", "?")
    created = job.get("created_at", "")[:19]
    status = job.get("status", "?")
    lines.append(f"| {jid} | {tier} | @{bot} | {email} | {created} | {status} |")

    return "\n".join(lines) + "\n"


def recyclable_pool_section():
    lines = ["## Recyclable Pool\n"]
    lines.append("| VPS ID | IP | Cancel Date | Deadline | Reinstalls |")
    lines.append("|--------|----|-------------|----------|------------|")

    data = _api("/api/vps?status=cancelling")
    instances = []
    if isinstance(data, list):
        instances = data
    elif isinstance(data, dict):
        instances = data.get("vps_list") or data.get("instances") or []

    if not instances:
        lines.append("| *(pool empty)* | | | | |")
        return "\n".join(lines) + "\n"

    for v in instances:
        vid = v.get("vps_id", "?")
        ip = v.get("contabo_ip", "?")
        cancel_date = (v.get("cancel_date") or "")[:10]
        deadline = (v.get("cancel_deadline") or "")[:10]
        reinstalls = v.get("reinstall_count", 0)
        lines.append(f"| {vid} | {ip} | {cancel_date} | {deadline} | {reinstalls} |")

    return "\n".join(lines) + "\n"


def vps_section():
    lines = ["## VPS Instances\n"]
    lines.append("| Customer | IP | DB Status | Gateway | Watchdog | Qdrant | SearXNG | Disk | Mem |")
    lines.append("|----------|----|-----------|---------|----------|--------|---------|------|-----|")

    data = _api("/api/vps?status=active")
    instances = []
    if isinstance(data, list):
        instances = data
    elif isinstance(data, dict):
        instances = data.get("vps_list") or data.get("instances") or []

    if not instances:
        lines.append("| *(no active VPS from API)* | | | | | | | | |")
        return "\n".join(lines) + "\n"

    for v in instances:
        ip = v.get("contabo_ip", "")
        cid = v.get("customer_id", "?")
        st = v.get("status", "?")
        if ip:
            h = _vps_health(ip)
            gw = h.get("GW", "?")
            wd = h.get("WD", "?")
            qd = h.get("QD", "?")
            sx = h.get("SX", "?")
            dk = h.get("DK", "?")
            mm = h.get("MM", "?")
            gw_fmt = f"**{gw}**" if gw == "active" else f"~~{gw}~~"
            lines.append(f"| {cid} | {ip} | {st} | {gw_fmt} | {wd} | {qd} | {sx} | {dk}G | {mm}MB |")
        else:
            lines.append(f"| {cid} | *(no IP)* | {st} | - | - | - | - | - | - |")

    return "\n".join(lines) + "\n"


def usage_section():
    lines = ["## API Usage (This Month)\n"]
    lines.append("| Customer | Tier | Spend HKD | Budget HKD | Used % | Requests | Blocked |")
    lines.append("|----------|------|-----------|------------|--------|----------|---------|")

    data = _api("/api/usage", admin=True)
    records = []
    if isinstance(data, list):
        records = data
    elif isinstance(data, dict):
        records = data.get("usage") or data.get("records") or []

    if not records:
        lines.append("| *(no data — check CONFIRM_API_KEY)* | | | | | | |")
        return "\n".join(lines) + "\n"

    for r in records:
        cid = r.get("customer_id", "?")
        tier = r.get("tier", "?")
        spend = r.get("current_spend_hkd", 0) or 0
        budget = r.get("monthly_budget_hkd", 0) or 0
        reqs = r.get("total_requests", 0) or 0
        pct = f"{spend / budget * 100:.1f}%" if budget else "N/A"
        blocked = "YES" if r.get("blocked_at") else "no"
        lines.append(f"| {cid} | {tier} | ${spend:.4f} | ${budget:.0f} | {pct} | {reqs} | {blocked} |")

    return "\n".join(lines) + "\n"


def backup_section():
    lines = ["## Backups\n"]
    lines.append("| Customer | Last Backup | Size | Status |")
    lines.append("|----------|-------------|------|--------|")

    active = BACKUPS_DIR / "active"
    if not active.exists():
        lines.append(f"| *(backup dir {active} not found)* | | | |")
        return "\n".join(lines) + "\n"

    found = False
    for d in sorted(active.iterdir()):
        if not d.is_dir():
            continue
        meta_f = d / "backup-meta.json"
        if meta_f.exists():
            try:
                m = json.loads(meta_f.read_text())
                ts = m.get("timestamp", "?")[:19]
                sz = m.get("size_bytes", 0)
                sz_str = f"{sz / 1024:.1f}KB" if sz < 1048576 else f"{sz / 1048576:.1f}MB"
                st = m.get("status", "?")
                lines.append(f"| {d.name} | {ts} | {sz_str} | {st} |")
                found = True
            except Exception:
                lines.append(f"| {d.name} | *(corrupt meta)* | ? | error |")
                found = True
        else:
            lines.append(f"| {d.name} | *(no meta)* | ? | unknown |")
            found = True

    if not found:
        lines.append("| *(no backups yet)* | | | |")

    return "\n".join(lines) + "\n"


def warnings_section():
    warnings = []

    # Check worker service
    status = _run("systemctl --user is-active nexgen-worker.service 2>/dev/null")
    if status != "active":
        warnings.append(f"Worker service is **{status or 'unknown'}** (should be active)")

    # Check disk
    disk = _run("df /home --output=avail -BG 2>/dev/null | tail -1 | tr -d ' G'")
    try:
        if int(disk) < 5:
            warnings.append(f"Pi5 disk low: only {disk}G free")
    except (ValueError, TypeError):
        pass

    # Check backup age
    active = BACKUPS_DIR / "active"
    if active.exists():
        for d in active.iterdir():
            if not d.is_dir():
                continue
            meta_f = d / "backup-meta.json"
            if meta_f.exists():
                try:
                    m = json.loads(meta_f.read_text())
                    ts = m.get("timestamp", "")
                    if ts:
                        dt = datetime.fromisoformat(ts)
                        age_days = (datetime.now(timezone.utc) - dt).days
                        if age_days > 7:
                            warnings.append(f"Backup for {d.name} is {age_days} days old")
                except Exception:
                    pass

    # Check VPS cancel deadlines approaching
    cancel_data = _api("/api/vps?status=cancelling")
    cancel_instances = []
    if isinstance(cancel_data, list):
        cancel_instances = cancel_data
    elif isinstance(cancel_data, dict):
        cancel_instances = cancel_data.get("vps_list") or cancel_data.get("instances") or []

    for v in cancel_instances:
        deadline = v.get("cancel_deadline", "")
        if deadline:
            try:
                dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                days_left = (dl - datetime.now(timezone.utc)).days
                vid = v.get("vps_id", "?")
                ip = v.get("contabo_ip", "?")
                if days_left <= 7:
                    warnings.append(
                        f"VPS {vid} ({ip}) deadline in **{days_left} days** — recycle or let expire"
                    )
                elif days_left <= 14:
                    warnings.append(
                        f"VPS {vid} ({ip}) deadline in {days_left} days — consider recycling"
                    )
            except (ValueError, TypeError):
                pass

    if not warnings:
        return "## Status: All OK\n\nNo warnings.\n"

    lines = ["## Warnings\n"]
    for w in warnings:
        lines.append(f"- {w}")
    return "\n".join(lines) + "\n"


def generate():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sections = [
        f"# NexGen Pipeline Dashboard\n\n**Updated:** {now}\n",
        warnings_section(),
        pending_orders_section(),
        worker_section(),
        vps_section(),
        recyclable_pool_section(),
        usage_section(),
        backup_section(),
        "---\n*Auto-generated by dashboard.py*\n",
    ]
    report = "\n".join(sections)
    OUTPUT.write_text(report)
    print(f"Dashboard written to {OUTPUT}")
    return report


if __name__ == "__main__":
    report = generate()
    print(report)
