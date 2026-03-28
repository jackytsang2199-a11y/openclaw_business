# E2E Completion + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all remaining E2E validation (auth fix, webhook, gateway proxy, backup, restore, recycling) and build a Pi5 monitoring dashboard.

**Architecture:** Fix CF Worker auth mismatch via wrangler secrets, test all pipeline flows against live Contabo VPS (161.97.82.155), then build a Python dashboard script that queries all systems and outputs a markdown status report readable by the Pi5 OpenClaw assistant.

**Tech Stack:** Bash, Python 3, wrangler CLI, SSH, Telegram API, CF Worker D1

---

## Current State

- **VPS 161.97.82.155** (nexgen-T_E2E): Fully deployed Tier 2 stack, 28/28 QA pass
- **Pi5** (192.168.1.30): Worker code deployed, systemd service loaded but disabled, linger=yes
- **CF Worker** (api.3nexgen.com): Deployed, but WORKER_TOKEN mismatch with Pi5
- **Wrangler**: Authenticated on Windows PC (jackytsang2199@gmail.com)
- **No /backups/ directory** on Pi5 yet

## Key Variables

```
PI5_HOST=jacky999@192.168.1.30
VPS_IP=161.97.82.155
SSH_KEY=~/.ssh/nexgen_automation
CF_WORKER_DIR=onboarding-pipeline/cf-worker
PI5_WORKER_TOKEN=81ffc60d8dd13580b8aa...  (from Pi5 ~/nexgen-worker/.env)
```

---

### Task 1: Fix CF Worker Auth (WORKER_TOKEN sync)

**Files:**
- Modify: CF Worker secret `WORKER_TOKEN` via wrangler

The Pi5 has `WORKER_TOKEN=81ffc60d8dd13580b8aa...` in its .env. The CF Worker has a different value. We need to sync them.

- [ ] **Step 1: Read Pi5's WORKER_TOKEN**

```bash
ssh jacky999@192.168.1.30 'source ~/nexgen-worker/.env && echo $WORKER_TOKEN'
```

- [ ] **Step 2: Set CF Worker secret to match Pi5**

```bash
cd onboarding-pipeline/cf-worker
echo "<TOKEN_FROM_STEP_1>" | npx wrangler secret put WORKER_TOKEN
```

Expected: `Success! Uploaded secret WORKER_TOKEN`

- [ ] **Step 3: Verify auth works from Pi5**

```bash
ssh jacky999@192.168.1.30 'source ~/nexgen-worker/.env && curl -sf -H "X-Worker-Token: $WORKER_TOKEN" "https://api.3nexgen.com/api/health"'
```

Expected: 200 OK (not `{"error":"Unauthorized"}`)

Note: If `/api/health` doesn't exist as a GET endpoint, test with:
```bash
ssh jacky999@192.168.1.30 'source ~/nexgen-worker/.env && curl -sf -X POST -H "X-Worker-Token: $WORKER_TOKEN" "https://api.3nexgen.com/api/health"'
```

- [ ] **Step 4: Verify job update works**

```bash
ssh jacky999@192.168.1.30 'source ~/nexgen-worker/.env && curl -sf -X PATCH -H "X-Worker-Token: $WORKER_TOKEN" -H "Content-Type: application/json" -d "{\"status\":\"complete\",\"server_ip\":\"161.97.82.155\"}" "https://api.3nexgen.com/api/jobs/1001"'
```

Expected: JSON response with updated job (not Unauthorized)

---

### Task 2: Fix Telegram Webhook + Verify Bot Responds

**Files:**
- None (runtime configuration only)

OpenClaw expects webhooks but the VPS has no SSL. Two options:
- **Option A**: Use Cloudflare Tunnel (requires cloudflared on VPS)
- **Option B**: Configure OpenClaw to not require external webhook — the bot uses long polling via getUpdates internally

Check how OpenClaw actually receives Telegram messages:

- [ ] **Step 1: Check OpenClaw's Telegram transport mode**

```bash
ssh jacky999@192.168.1.30 "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'cat ~/.openclaw/openclaw.json | python3 -c \"import json,sys; cfg=json.load(sys.stdin); print(json.dumps(cfg.get(\\\"channels\\\",{}).get(\\\"telegram\\\",{}), indent=2))\"' 2>/dev/null"
```

Check if there's a `mode`, `polling`, or `webhook` field.

- [ ] **Step 2: Check if OpenClaw uses polling by default**

```bash
ssh jacky999@192.168.1.30 "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'journalctl --user -u openclaw-gateway.service --since \"30 min ago\" --no-pager 2>/dev/null | grep -iE \"telegram|webhook|polling|getUpdates\" | tail -20' 2>/dev/null"
```

- [ ] **Step 3: Delete any stale webhook (force polling mode)**

If OpenClaw uses polling internally, we need to clear the webhook so Telegram sends updates via getUpdates:

```bash
curl -sf "https://api.telegram.org/botREDACTED-LEAKED-BOT-TOKEN-2-revoked-2026-04-28/deleteWebhook" | python3 -m json.tool
```

Expected: `{"ok": true, "result": true, "description": "Webhook was deleted"}`

- [ ] **Step 4: Restart OpenClaw gateway to pick up polling**

```bash
ssh jacky999@192.168.1.30 "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user restart openclaw-gateway.service && sleep 5 && systemctl --user is-active openclaw-gateway.service' 2>/dev/null"
```

- [ ] **Step 5: Send test message via Telegram**

Send a message to @NexGenAI_T1043_bot from your Telegram account (user ID 340067089). Check the gateway logs for response:

```bash
ssh jacky999@192.168.1.30 "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'journalctl --user -u openclaw-gateway.service --since \"2 min ago\" --no-pager 2>/dev/null | tail -30' 2>/dev/null"
```

If the bot doesn't respond, check if the gateway URL is being used:
```bash
ssh jacky999@192.168.1.30 "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'journalctl --user -u openclaw-gateway.service --no-pager 2>/dev/null | grep -iE \"error|fail|gateway|api.3nexgen\" | tail -20' 2>/dev/null"
```

---

### Task 3: Test Gateway Proxy (AI cost tracking)

**Files:**
- None (runtime test only)

Verify that AI requests from VPS go through the CF Worker proxy and cost is tracked.

- [ ] **Step 1: Check current usage record for customer 1001**

Need CONFIRM_API_KEY for admin endpoints. Check if it's set:

```bash
cd onboarding-pipeline/cf-worker
npx wrangler secret list
```

If CONFIRM_API_KEY is set, use it from Pi5 or directly:

```bash
# Use wrangler to query D1 directly
cd onboarding-pipeline/cf-worker
npx wrangler d1 execute nexgen-jobs --command "SELECT * FROM api_usage WHERE customer_id='1001'"
```

- [ ] **Step 2: Verify gateway token is registered**

```bash
cd onboarding-pipeline/cf-worker
npx wrangler d1 execute nexgen-jobs --command "SELECT customer_id, tier, monthly_budget_hkd, monthly_spend_hkd, blocked, substr(gateway_token,-4) as token_last4 FROM api_usage"
```

Expected: Row with customer_id=1001, gateway_token ending in the last 4 chars of `56e326d64ebea7ac8178af326f625f27467e4cf9daeaeb328b43d6caadf019c2`

- [ ] **Step 3: Test proxy request directly**

```bash
curl -sf -X POST "https://api.3nexgen.com/api/ai/deepseek/chat/completions" \
  -H "Authorization: Bearer 56e326d64ebea7ac8178af326f625f27467e4cf9daeaeb328b43d6caadf019c2" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Say hello in 5 words"}],"max_tokens":20}' 2>&1 | head -20
```

Expected: DeepSeek API response (proxied through CF Worker)

- [ ] **Step 4: Verify cost was tracked**

```bash
cd onboarding-pipeline/cf-worker
npx wrangler d1 execute nexgen-jobs --command "SELECT customer_id, monthly_spend_hkd, request_count FROM api_usage WHERE customer_id='1001'"
```

Expected: `monthly_spend_hkd > 0` and `request_count > 0`

---

### Task 4: Create Backup Directory + Run Backup E2E

**Files:**
- None (runtime test of existing backup.py)

- [ ] **Step 1: Create backup directory structure on Pi5**

```bash
ssh jacky999@192.168.1.30 "sudo mkdir -p /backups/active /backups/churn && sudo chown -R jacky999:jacky999 /backups && ls -la /backups/"
```

If `/backups` can't be created at root (SD card permissions), use home dir:
```bash
ssh jacky999@192.168.1.30 "mkdir -p ~/backups/active ~/backups/churn && ls -la ~/backups/"
```

- [ ] **Step 2: Verify backup.py config paths match**

```bash
ssh jacky999@192.168.1.30 "cd ~/nexgen-worker && python3 -c 'import config; print(f\"BACKUP_DIR={config.BACKUP_DIR}\"); print(f\"SSH_KEY={config.SSH_KEY_PATH}\")'"
```

If BACKUP_DIR doesn't match the directory created, update Pi5's .env.

- [ ] **Step 3: Run backup for test VPS**

```bash
ssh jacky999@192.168.1.30 "cd ~/nexgen-worker && source ~/nexgen-worker-env/bin/activate && python3 -c '
from backup import BackupOrchestrator
from api_client import ApiClient
from notifier import Notifier
import config

api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
backup = BackupOrchestrator(api, notifier)

result = backup.backup_single_vps(
    customer_id=\"1001\",
    server_ip=\"161.97.82.155\",
    tier=2,
)
print(f\"Result: {result}\")
'"
```

Expected: Backup files created at `/backups/active/1001/` (or `~/backups/active/1001/`)

- [ ] **Step 4: Verify backup files**

```bash
ssh jacky999@192.168.1.30 "ls -la ~/backups/active/1001/ 2>/dev/null || ls -la /backups/active/1001/ 2>/dev/null"
ssh jacky999@192.168.1.30 "cat ~/backups/active/1001/backup-meta.json 2>/dev/null || cat /backups/active/1001/backup-meta.json 2>/dev/null"
```

Expected: `clawd.tar.gz`, `mem0.db`, `qdrant-snapshot.tar.gz`, `backup-meta.json` (Tier 2)

---

### Task 5: Test Restore E2E

**Files:**
- None (runtime test of existing restore.py)

- [ ] **Step 1: Run restore to same VPS**

```bash
ssh jacky999@192.168.1.30 "cd ~/nexgen-worker && source ~/nexgen-worker-env/bin/activate && python3 -c '
from restore import RestoreHelper
from notifier import Notifier
import config

notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
restore = RestoreHelper(notifier)

result = restore.restore(
    customer_id=\"1001\",
    target_ip=\"161.97.82.155\",
)
print(f\"Result: {result}\")
'"
```

Expected: Files restored, openclaw service restarted

- [ ] **Step 2: Verify VPS still works after restore**

```bash
ssh jacky999@192.168.1.30 "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user is-active openclaw-gateway.service && curl -sf http://localhost:6333/healthz && echo OK' 2>/dev/null"
```

Expected: Gateway active, Qdrant healthy

---

### Task 6: Test PC Pull Script

**Files:**
- `scripts/nexgen-backup-pull.sh` (on Windows PC)

- [ ] **Step 1: Create local backup directory on Windows**

```bash
mkdir -p ~/nexgen-backups
```

- [ ] **Step 2: Run the pull script (dry-run first)**

```bash
PI5_IP=192.168.1.30 PI5_SSH_KEY=$HOME/.ssh/id_ed25519 bash scripts/nexgen-backup-pull.sh
```

If SSH key is different, adjust. Check the script can rsync from Pi5.

- [ ] **Step 3: Verify files pulled**

```bash
ls -la ~/nexgen-backups/weekly/
```

Expected: Directory with today's date containing the 1001 backup

---

### Task 7: Build Pi5 Monitoring Dashboard

**Files:**
- Create: `onboarding-pipeline/pi5-worker/dashboard.py`
- Create: `onboarding-pipeline/pi5-worker/scripts/nexgen-dashboard-cron.sh`

A Python script that queries all systems and writes a markdown status report to `~/nexgen-dashboard.md`. The Pi5 OpenClaw assistant can read this file to answer status questions.

- [ ] **Step 1: Create dashboard.py**

```python
"""NexGen Pipeline Dashboard — generates ~/nexgen-dashboard.md status report.

Queries:
  - CF Worker D1 (jobs, VPS instances, API usage) via REST API
  - Pi5 local state (worker service, backups, disk)
  - VPS health (SSH probe for each active VPS)
"""
import subprocess
import json
import os
import requests
from datetime import datetime, timezone
from pathlib import Path

# Config from environment
CF_WORKER_URL = os.environ.get("CF_WORKER_URL", "https://api.3nexgen.com")
WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")
CONFIRM_API_KEY = os.environ.get("CONFIRM_API_KEY", "")
SSH_KEY = os.environ.get("SSH_KEY_PATH", os.path.expanduser("~/.ssh/nexgen_automation"))
BACKUP_DIR = Path(os.environ.get("BACKUP_DIR", os.path.expanduser("~/backups/active")))
OUTPUT_FILE = Path(os.path.expanduser("~/nexgen-dashboard.md"))


def _api_get(path: str, admin: bool = False) -> dict | None:
    """Call CF Worker API."""
    headers = {}
    if admin and CONFIRM_API_KEY:
        headers["X-API-Key"] = CONFIRM_API_KEY
    elif WORKER_TOKEN:
        headers["X-Worker-Token"] = WORKER_TOKEN
    try:
        resp = requests.get(f"{CF_WORKER_URL}{path}", headers=headers, timeout=10)
        if resp.ok:
            return resp.json()
    except Exception:
        pass
    return None


def _run(cmd: str, timeout: int = 10) -> str:
    """Run local shell command."""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip()
    except Exception:
        return ""


def _ssh_check(ip: str) -> dict:
    """Quick SSH health probe on a VPS."""
    cmd = (
        f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "
        f"-o ConnectTimeout=5 -i {SSH_KEY} deploy@{ip} "
        "'echo OK' 2>/dev/null"
    )
    result = _run(cmd, timeout=15)
    return {"reachable": result.strip() == "OK"}


def _vps_health(ip: str) -> dict:
    """Detailed VPS health check via SSH."""
    cmd = (
        f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "
        f"-o ConnectTimeout=5 -i {SSH_KEY} deploy@{ip} "
        "'"
        "echo GATEWAY=$(systemctl --user is-active openclaw-gateway.service 2>/dev/null);"
        "echo WATCHDOG=$(systemctl --user is-active openclaw-watchdog.service 2>/dev/null);"
        "echo QDRANT=$(curl -sf http://localhost:6333/healthz 2>/dev/null && echo ok || echo down);"
        "echo SEARXNG=$(curl -sf -o /dev/null -w ok http://localhost:8888 2>/dev/null || echo down);"
        "echo DISK=$(df / --output=avail -BG 2>/dev/null | tail -1 | tr -d \" G\");"
        "echo MEM=$(free -m 2>/dev/null | awk \"/^Mem:/ {print \\$7}\");"
        "' 2>/dev/null"
    )
    raw = _run(cmd, timeout=20)
    info = {}
    for line in raw.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            info[k.strip()] = v.strip()
    return info


def section_worker() -> str:
    """Pi5 worker service status."""
    status = _run("systemctl --user is-active nexgen-worker.service 2>/dev/null")
    enabled = _run("systemctl --user is-enabled nexgen-worker.service 2>/dev/null")
    linger = _run("loginctl show-user $(whoami) 2>/dev/null | grep Linger | cut -d= -f2")
    disk = _run("df /home --output=avail -BG 2>/dev/null | tail -1 | tr -d ' G'")
    return (
        "## Pi5 Worker\n\n"
        f"| Item | Status |\n"
        f"|------|--------|\n"
        f"| Service | **{status or 'unknown'}** |\n"
        f"| Enabled | {enabled or 'unknown'} |\n"
        f"| Linger | {linger or 'unknown'} |\n"
        f"| Disk Free | {disk or '?'}G |\n"
    )


def section_vps() -> str:
    """Active VPS instances from D1 + health probes."""
    lines = ["## VPS Instances\n"]
    lines.append("| Customer | IP | Status | Gateway | Qdrant | Disk | Mem |")
    lines.append("|----------|-----|--------|---------|--------|------|-----|")

    # Try D1 API
    data = _api_get("/api/vps?status=active")
    instances = []
    if data and isinstance(data, list):
        instances = data
    elif data and "instances" in data:
        instances = data["instances"]

    if not instances:
        lines.append("| (no data from API — check WORKER_TOKEN) | | | | | | |")
        return "\n".join(lines) + "\n"

    for vps in instances:
        ip = vps.get("contabo_ip", "")
        cid = vps.get("customer_id", "?")
        db_status = vps.get("status", "?")
        if ip:
            h = _vps_health(ip)
            lines.append(
                f"| {cid} | {ip} | {db_status} | "
                f"{h.get('GATEWAY','?')} | {h.get('QDRANT','?')} | "
                f"{h.get('DISK','?')}G | {h.get('MEM','?')}MB |"
            )
        else:
            lines.append(f"| {cid} | (no IP) | {db_status} | - | - | - | - |")

    return "\n".join(lines) + "\n"


def section_usage() -> str:
    """API usage / cost tracking."""
    lines = ["## API Usage\n"]
    lines.append("| Customer | Tier | Spend (HKD) | Budget (HKD) | % Used | Blocked |")
    lines.append("|----------|------|-------------|--------------|--------|---------|")

    data = _api_get("/api/usage", admin=True)
    records = []
    if data and isinstance(data, list):
        records = data
    elif data and "records" in data:
        records = data["records"]

    if not records:
        lines.append("| (no data — check CONFIRM_API_KEY) | | | | | |")
        return "\n".join(lines) + "\n"

    for r in records:
        cid = r.get("customer_id", "?")
        tier = r.get("tier", "?")
        spend = r.get("monthly_spend_hkd", 0)
        budget = r.get("monthly_budget_hkd", 0)
        pct = f"{(spend/budget*100):.1f}%" if budget else "N/A"
        blocked = "YES" if r.get("blocked") else "no"
        lines.append(f"| {cid} | {tier} | ${spend:.2f} | ${budget:.2f} | {pct} | {blocked} |")

    return "\n".join(lines) + "\n"


def section_backups() -> str:
    """Backup status from local filesystem."""
    lines = ["## Backups\n"]
    lines.append("| Customer | Last Backup | Size | Status |")
    lines.append("|----------|-------------|------|--------|")

    if not BACKUP_DIR.exists():
        lines.append(f"| (backup dir {BACKUP_DIR} not found) | | | |")
        return "\n".join(lines) + "\n"

    for d in sorted(BACKUP_DIR.iterdir()):
        if not d.is_dir():
            continue
        meta_file = d / "backup-meta.json"
        if meta_file.exists():
            try:
                meta = json.loads(meta_file.read_text())
                ts = meta.get("timestamp", "?")
                size = meta.get("size_bytes", 0)
                size_mb = f"{size / 1024 / 1024:.1f}MB" if size else "?"
                status = meta.get("status", "?")
                lines.append(f"| {d.name} | {ts} | {size_mb} | {status} |")
            except Exception:
                lines.append(f"| {d.name} | (corrupt meta) | ? | error |")
        else:
            lines.append(f"| {d.name} | (no meta) | ? | unknown |")

    if len(lines) == 3:
        lines.append("| (no backups yet) | | | |")

    return "\n".join(lines) + "\n"


def section_jobs() -> str:
    """Recent job status."""
    lines = ["## Recent Jobs\n"]
    lines.append("| ID | Status | Tier | Server IP |")
    lines.append("|----|--------|------|-----------|")

    # D1 query via API not available for listing jobs
    # Just note the limitation
    lines.append("| (job listing requires D1 direct query) | | | |")
    return "\n".join(lines) + "\n"


def generate():
    """Generate the full dashboard markdown."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    sections = [
        f"# NexGen Pipeline Dashboard\n\n**Updated:** {now}\n",
        section_worker(),
        section_vps(),
        section_usage(),
        section_backups(),
        section_jobs(),
        "---\n*Auto-generated by `dashboard.py`. Run: `python3 ~/nexgen-worker/dashboard.py`*\n",
    ]
    report = "\n".join(sections)
    OUTPUT_FILE.write_text(report)
    print(f"Dashboard written to {OUTPUT_FILE}")
    print(report)


if __name__ == "__main__":
    generate()
```

- [ ] **Step 2: Create cron wrapper script**

Create `scripts/nexgen-dashboard-cron.sh`:
```bash
#!/bin/bash
# Runs dashboard.py every 15 minutes via cron
set -euo pipefail
cd ~/nexgen-worker
source ~/nexgen-worker-env/bin/activate
source ~/nexgen-worker/.env 2>/dev/null || true
python3 dashboard.py >> ~/nexgen-dashboard.log 2>&1
```

- [ ] **Step 3: Deploy to Pi5**

```bash
scp onboarding-pipeline/pi5-worker/dashboard.py jacky999@192.168.1.30:~/nexgen-worker/dashboard.py
scp onboarding-pipeline/pi5-worker/scripts/nexgen-dashboard-cron.sh jacky999@192.168.1.30:~/nexgen-worker/scripts/nexgen-dashboard-cron.sh
ssh jacky999@192.168.1.30 "chmod +x ~/nexgen-worker/scripts/nexgen-dashboard-cron.sh"
```

- [ ] **Step 4: Test dashboard on Pi5**

```bash
ssh jacky999@192.168.1.30 "cd ~/nexgen-worker && source ~/nexgen-worker-env/bin/activate && source .env && python3 dashboard.py"
```

Expected: Dashboard markdown printed + written to `~/nexgen-dashboard.md`

- [ ] **Step 5: Set up cron (every 15 minutes)**

```bash
ssh jacky999@192.168.1.30 '(crontab -l 2>/dev/null; echo "*/15 * * * * /home/jacky999/nexgen-worker/scripts/nexgen-dashboard-cron.sh") | crontab -'
```

Verify:
```bash
ssh jacky999@192.168.1.30 "crontab -l"
```

---

### Task 8: Enable Systemd Worker Service

**Files:**
- None (runtime configuration)

Only do this after Tasks 1-6 pass, confirming the full pipeline works.

- [ ] **Step 1: Verify worker .env has correct settings**

```bash
ssh jacky999@192.168.1.30 "grep -E 'AGENT_MAX_TURNS|CF_WORKER_URL|WORKER_TOKEN|CONTABO' ~/nexgen-worker/.env | head -10"
```

Confirm: AGENT_MAX_TURNS=150, correct URLs and tokens.

- [ ] **Step 2: Enable and start the service**

```bash
ssh jacky999@192.168.1.30 "systemctl --user enable --now nexgen-worker.service && sleep 3 && systemctl --user status nexgen-worker.service"
```

Expected: Active (running), enabled

- [ ] **Step 3: Verify worker logs show correct config**

```bash
ssh jacky999@192.168.1.30 "journalctl --user -u nexgen-worker.service --since '30 sec ago' --no-pager"
```

Expected: `Polling https://api.3nexgen.com every 30s`, `max 150 turns`, `Claude auth: OK`

---

### Task 9: Commit All Changes

**Files:**
- All modified files from E2E fixes + new dashboard code

- [ ] **Step 1: Review all changes**

```bash
git status
git diff --stat
```

- [ ] **Step 2: Stage and commit**

Group by logical change:
1. Fix: Contabo scripts (UUID4, SSH key ID, Ubuntu 24.04)
2. Fix: Install scripts + QA (gateway arch alignment)
3. Feat: deployer includes Mem0 keys for Tier 2+
4. Feat: Pi5 monitoring dashboard

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```
