# NexGen Pi5 Operations Guide

> **For:** AI assistants operating on the Pi5 (jacky999's personal assistant)
> **Pi5 IP:** 192.168.1.30 | **SSH:** jacky999@192.168.1.30 (key-based, no password)
> **Role:** Deployment orchestrator for NexGen customer onboarding pipeline

---

## What The Pi5 Does

The Pi5 is the **brain** of the NexGen business. It runs a Python worker that:

1. **Polls** CF Worker API every 30s for new customer deployment jobs
2. **Provisions** Contabo VPS via API (or recycles cancelled ones)
3. **Deploys** full OpenClaw stack using Claude Agent SDK (zero API cost — Max plan OAuth)
4. **Tests** the deployment with 5-layer QA (28 checks)
5. **Delivers** to customer via Telegram notification
6. **Manages** VPS lifecycle: recycling, cancellation, backup/restore
7. **Reports** health to CF Worker every 5 minutes

```
Customer pays → CF Worker creates job → Pi5 polls → provisions VPS
    → Agent SDK deploys 14 install scripts → QA gates pass
    → Sets Telegram webhook → Notifies customer "Your AI is ready!"
```

---

## Directory Structure

```
/home/jacky999/
├── nexgen-worker/                  # Worker service (THE MAIN CODE)
│   ├── worker.py                   # Main polling loop (30s)
│   ├── deployer.py                 # Deployment orchestrator
│   ├── api_client.py               # CF Worker REST client
│   ├── config.py                   # Config loader (.env)
│   ├── playbook.py                 # Agent SDK prompt builder
│   ├── notifier.py                 # Telegram notifications
│   ├── backup.py                   # Weekly backup orchestrator
│   ├── restore.py                  # Restore helper
│   ├── vps_lifecycle.py            # VPS recycling pool
│   ├── .env                        # Secrets (WORKER_TOKEN, Contabo creds, etc.)
│   ├── nexgen-worker.service       # Systemd unit file
│   ├── requirements.txt            # Python deps
│   ├── venv/                       # Python virtualenv
│   └── tests/                      # 35 tests (all passing)
│
├── openclaw_install/               # Install scripts repo (cloned)
│   ├── CLAUDE.md                   # Installer playbook (Agent SDK reads this)
│   ├── scripts/                    # 14 install scripts (00-swap to 13-clawteam)
│   ├── qa/                         # 5-layer QA suite (28 checks)
│   └── provision/                  # Contabo API scripts (create, cancel, revoke, reinstall)
│
├── backups/                        # Customer backup storage
│   ├── active/{CUSTOMER_ID}/       # Active customer backups
│   │   ├── clawd.tar.gz            # Workspace
│   │   ├── mem0.db                 # Memory DB (Tier 2+)
│   │   ├── qdrant-snapshot.tar.gz  # Vector store (Tier 2+)
│   │   └── backup-meta.json        # Metadata
│   └── churn/                      # Archived (cancelled customer) backups
│
├── .ssh/
│   ├── id_ed25519                  # Pi5 SSH key (for remote access TO Pi5)
│   └── nexgen_automation           # Key for SSH into customer VPS
│
└── .claude/                        # Agent SDK OAuth token (Max plan)
```

---

## Service Management

The worker runs as a **systemd user service**. Always export the runtime vars first:

```bash
# Shorthand — prefix all systemctl commands with this:
export XDG_RUNTIME_DIR=/run/user/1000 && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

# Check status
systemctl --user status nexgen-worker.service

# Restart
systemctl --user restart nexgen-worker.service

# Stop
systemctl --user stop nexgen-worker.service

# Enable (auto-start on boot)
systemctl --user enable nexgen-worker.service

# View live logs
journalctl --user -u nexgen-worker.service -f

# View last 50 log lines
journalctl --user -u nexgen-worker.service --no-pager -n 50
```

**Note:** The service is currently **loaded but not enabled** — it won't auto-start on reboot until you run `systemctl --user enable`.

---

## Configuration (.env)

**File:** `~/nexgen-worker/.env`

```env
# CF Worker API
CF_WORKER_URL=https://api.3nexgen.com
WORKER_TOKEN=<64-char hex — authenticates Pi5 to CF Worker>

# Telegram (owner notifications)
OWNER_TELEGRAM_BOT_TOKEN=<your personal bot token>
OWNER_TELEGRAM_CHAT_ID=340067089

# Paths
OPENCLAW_INSTALL_DIR=/home/jacky999/openclaw_install
SSH_KEY_PATH=/home/jacky999/.ssh/nexgen_automation

# AI Gateway (proxy URL — real keys in CF Worker secrets)
AI_GATEWAY_URL=https://api.3nexgen.com/api/ai

# Contabo API
CONTABO_CLIENT_ID=<from Contabo API panel>
CONTABO_CLIENT_SECRET=<from Contabo API panel>
CONTABO_API_USER=<Contabo login email>
CONTABO_API_PASSWORD=<Contabo login password>

# Agent SDK
AGENT_MAX_TURNS=50

# Backup
BACKUPS_DIR=/home/jacky999/backups
BACKUP_STAGGER_SECONDS=300

# Polling
POLL_INTERVAL=30
HEALTH_INTERVAL=300
```

---

## API Endpoints (CF Worker)

The Pi5 worker authenticates with `X-Worker-Token` header:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/jobs/next` | Poll for next pending job |
| `PATCH` | `/api/jobs/{id}` | Update job status |
| `POST` | `/api/health` | Send heartbeat (every 5 min) |
| `GET` | `/api/vps/recyclable` | Check for recyclable VPS |
| `GET` | `/api/vps?status=active` | List VPS by status |
| `POST` | `/api/vps` | Register new VPS |
| `PATCH` | `/api/vps/{id}` | Update VPS status |
| `POST` | `/api/usage` | Register customer gateway token + budget |

---

## Deployment Pipeline (What Happens Per Job)

### Step 1: Provision VPS
```python
# deployer.py → vps_lifecycle.py
# Try recycling pool first, then fresh Contabo provision
recycled_ip = lifecycle.try_recycle(job_id, tier)
if not recycled_ip:
    subprocess.run(["bash", "contabo-create.sh", job_id, str(tier)])
```

### Step 2: Agent SDK Deployment
```python
# deployer.py → playbook.py → claude_code_sdk
# Build prompt from CLAUDE.md playbook, then run Agent SDK session
async for message in query(
    prompt=build_deployment_prompt(...),
    options=ClaudeCodeOptions(
        allowed_tools=["Bash", "Read"],
        permission_mode="bypassPermissions",
        model="sonnet",
        max_turns=50,
    ),
):
    if isinstance(message, ResultMessage):
        result_text = message.result or ""
```
- Agent reads `openclaw_install/CLAUDE.md` playbook
- Runs 14 install scripts remotely via SSH
- Runs QA gates
- Outputs `DEPLOYMENT_SUCCESS` or `DEPLOYMENT_FAILED: reason`

### Step 3: Gateway Token Registration
```python
# deployer.py
gateway_token = secrets.token_hex(32)  # 64-char hex
api.register_gateway_token(
    customer_id=job_id,
    gateway_token=gateway_token,
    tier=tier,
    monthly_budget_hkd={1: 40.0, 2: 70.0, 3: 100.0}[tier],
)
```

### Step 4: Deliver to Customer
```python
# Set Telegram bot webhook → customer's VPS
Notifier.set_webhook(bot_token, f"https://{server_ip}:18789/webhook")
Notifier.send_customer_message(bot_token, user_id, "Your AI assistant is ready!")
api.update_job(job_id, "complete")
```

---

## VPS Lifecycle

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `provisioning` | VPS ordered, waiting for SSH | Wait for SSH ready |
| `active` | Customer using it | Monthly billing |
| `cancelling` | Customer cancelled, in recycling pool | Recycle or destroy |
| `expired` | Past cancel deadline, destroyed | Remove from D1 |

**Recycling flow:** Customer cancels → VPS enters `cancelling` pool → next new customer of same tier reuses it (revoke + reinstall instead of fresh provision) → saves ~15 min setup time + Contabo billing overlap.

---

## Backup System

**When:** Weekly, staggered 5 min between VPS instances
**What per tier:**

| Tier | Files Backed Up |
|------|----------------|
| T1 | `clawd.tar.gz` (workspace only) |
| T2+ | `clawd.tar.gz` + `mem0.db` + `qdrant-snapshot.tar.gz` |

**Commands:**
```bash
# Manual backup of specific customer
python3 -c "
from backup import BackupOrchestrator
from api_client import ApiClient
from config import *
api = ApiClient(CF_WORKER_URL, WORKER_TOKEN)
b = BackupOrchestrator(api, SSH_KEY_PATH)
b.backup_customer('CUSTOMER_ID', '161.97.82.155', 2)
"

# List backups
ls -la ~/backups/active/
```

---

## Monitoring & Health

### Pi5 Health Ping
The worker sends a heartbeat every 5 minutes:
```
POST https://api.3nexgen.com/api/health
Header: X-Worker-Token: <token>
```
If no ping for 15 minutes, CF Worker alerts owner via Telegram.

### Business Dashboard
Run from the **Windows PC** (not Pi5):
```bash
python3 scripts/nexgen-dashboard.py
```

Shows 7 sections:
1. **API Usage & Budget** — Per-customer spend, % of budget, blocked/warning status
2. **VPS Instances** — IP, status, billing dates, recyclable pool count
3. **Job Queue** — Active/pending/failed jobs with errors
4. **Pi5 Health** — Last ping, online/offline
5. **Monthly History** — Archived spend per month
6. **Audit Log** — Recent admin actions
7. **Tier Config** — Budget caps, cost rates

---

## Tier Configuration

| Tier | Name | Monthly Fee | API Budget | Features |
|------|------|-------------|-----------|----------|
| T1 | 新手上路 | HK$148 | HK$40 | VPS + DeepSeek chat only |
| T2 | 智能管家 | HK$248 | HK$70 | + Mem0 memory + SearXNG search + watchdogs |
| T3 | 全能大師 | HK$388 | HK$100 | + Chromium browser + custom personality |

**Budget enforcement:** 90% → warn header | 100% → 429 block | 1st of month → auto-reset

---

## API Cost Rates (CF Worker Proxy)

All customer API traffic goes through `api.3nexgen.com`:

| Provider | Route | Rate | Used For |
|----------|-------|------|----------|
| DeepSeek V3.2 | `/api/ai/deepseek/*` | $0.28/$0.42 per 1M tokens | Main chat |
| OpenAI | `/api/ai/openai/*` | $0.02/1M input | Mem0 embedding recall |
| Zhipu GLM-4-Flash | `/api/ai/zhipu/*` | **FREE** | Mem0 LLM fact extraction |

Customer VPS has **zero real API keys** — only gateway tokens. The proxy swaps them for real keys.

---

## SSH Keys

| Key | Path | Purpose |
|-----|------|---------|
| `id_ed25519` | `~/.ssh/id_ed25519` | Access TO Pi5 from other machines |
| `nexgen_automation` | `~/.ssh/nexgen_automation` | Access FROM Pi5 to customer VPS (`deploy@{ip}`) |

```bash
# SSH to customer VPS from Pi5
ssh -i ~/.ssh/nexgen_automation deploy@161.97.82.155
```

---

## Claude Agent SDK

- **Auth:** `~/.claude/` directory contains OAuth token from Max plan ($100/mo flat)
- **Cost:** Zero per-session — all sessions included in Max subscription
- **Model:** `sonnet` (Claude Sonnet 4.6)
- **Max turns:** 50 per deployment session
- **Health check:** If `~/.claude/` missing, deployer aborts with "Claude auth missing"

```bash
# Verify auth exists
ls ~/.claude/

# Re-auth if needed (interactive)
claude login
```

---

## Deploy Code Updates to Pi5

From Windows PC:
```bash
# Copy updated Python files
scp -i ~/.ssh/id_ed25519 onboarding-pipeline/pi5-worker/*.py jacky999@192.168.1.30:~/nexgen-worker/

# Restart service
ssh jacky999@192.168.1.30 "export XDG_RUNTIME_DIR=/run/user/1000 && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus && systemctl --user restart nexgen-worker.service"
```

---

## Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| Worker not polling | `systemctl --user status nexgen-worker.service` | Restart service |
| Jobs not picked up | `journalctl --user -u nexgen-worker -n 50` | Check WORKER_TOKEN matches CF Worker |
| Agent SDK fails | `ls ~/.claude/` | Run `claude login` to re-auth |
| VPS SSH timeout | `ssh -i ~/.ssh/nexgen_automation deploy@{ip}` | Check IP, key permissions |
| Backup fails | Check `~/backups/active/{id}/backup-meta.json` | Verify VPS reachable, disk space |
| CF Worker 401 | WORKER_TOKEN mismatch | Sync token: `ssh ... 'cat ~/nexgen-worker/.env'` then compare with `wrangler secret list` |
| Health alert | Pi5 offline or service crashed | SSH in, check service, restart |
| Contabo API fails | Check `.env` Contabo credentials | Re-auth at Contabo API panel |
| Gateway token rejected | Token not in D1 | Check: `GET /api/usage/{customer_id}` via admin API |
