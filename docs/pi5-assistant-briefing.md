# Briefing for Pi5 Personal Assistant

> **Copy-paste this entire message to your Pi5 Claude assistant to bring it up to speed.**

---

## Who You Are & What This Is About

You are operating on a **Raspberry Pi 5** (192.168.1.30, user: jacky999) that serves as the **deployment orchestrator** for a business called **NexGen** (3nexgen.com).

**NexGen** is a Hong Kong-based service that installs AI assistants (OpenClaw) on customers' VPS servers. Customers pay a monthly subscription, and this Pi5 automatically:
1. Picks up new customer orders
2. Provisions a VPS on Contabo
3. Deploys the full AI stack (OpenClaw + memory + search + watchdogs)
4. Delivers the bot to the customer via Telegram
5. Manages ongoing backups and VPS lifecycle

**The owner is jacky999 (Jacky Tsang).** You help him operate and test this system.

---

## Current System Status (Verified 2026-04-05)

- **Worker service:** `nexgen-worker` — enabled, active since 2026-03-28 (8+ days)
- **Telegram owner bot:** `@NexGenAI_test_bot` — working (fixed today)
- **Contabo API:** authenticated, 2 VPS instances running
- **CF Worker:** `api.3nexgen.com` — all endpoints responding
- **Backups:** daily cron running since 2026-03-30
- **Claude SDK:** authenticated via Max plan OAuth

### Current VPS Instances
```
203187256 | 161.97.88.8    | running | cancel=2026-04-27 (recyclable)
203187278 | 161.97.82.155  | running | cancel=2026-04-27 (recyclable)
```
Both are already scheduled for cancellation on Apr 27 and can be recycled (un-cancelled + reinstalled) for new customers.

---

## Service Tiers (Updated 2026-04-04)

| Tier | Name | Monthly | Quarterly | Annual | Features |
|------|------|---------|-----------|--------|----------|
| T1 | 基本版 Starter | HK$248 | HK$188 | HK$158 | VPS + DeepSeek chat only |
| T2 | 專業版 Pro | HK$398 | HK$298 | HK$248 | + Mem0 memory + SearXNG search + watchdogs |
| T3 | 旗艦版 Elite | HK$598 | HK$458 | HK$388 | + Chrome browser + multi-agent + custom personality |

No install fees. Subscription only.

---

## Operations Reference

Please read and internalize this complete guide. It covers directory structure, service management, .env configuration, API endpoints, deployment pipeline, VPS lifecycle, backup system, monitoring, SSH keys, Claude SDK, troubleshooting, and more.

<PI5-GUIDE>

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
│   └── tests/                      # 35 tests + E2E test scripts
│
├── nexgen-worker-env/              # Alternative virtualenv (used by systemd)
│
├── openclaw_install/               # Install scripts repo (cloned)
│   ├── CLAUDE.md                   # Installer playbook (Agent SDK reads this)
│   ├── scripts/                    # 14 install scripts (00-swap to 13-clawteam)
│   ├── qa/                         # 5-layer QA suite (28 checks)
│   └── provision/                  # Contabo API scripts (create, cancel, revoke, reinstall)
│
├── backups/                        # Customer backup storage
│   ├── active/{CUSTOMER_ID}/       # Active customer backups
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

The worker runs as a **systemd user service**:

```bash
export XDG_RUNTIME_DIR=/run/user/1000 && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus

systemctl --user status nexgen-worker.service    # Check status
systemctl --user restart nexgen-worker.service   # Restart
systemctl --user stop nexgen-worker.service      # Stop
journalctl --user -u nexgen-worker.service -f    # Live logs
journalctl --user -u nexgen-worker.service --no-pager -n 50  # Last 50 lines
```

The service is **enabled and running** (since 2026-03-28). Linger is enabled for boot persistence.

**Important:** The systemd service uses `~/nexgen-worker-env/` virtualenv (not `~/nexgen-worker/venv/`).

---

## API Authentication

Three different auth mechanisms:

| Who → Where | Header | Value |
|-------------|--------|-------|
| Pi5 → CF Worker | `X-Worker-Token` | 64-char hex from .env `WORKER_TOKEN` |
| Admin → CF Worker | `X-Confirm-Api-Key` | 64-char hex from .env `CONFIRM_API_KEY` |
| Customer VPS → Proxy | `Authorization: Bearer {gateway_token}` | Per-customer 64-char token |

---

## API Endpoints (CF Worker at api.3nexgen.com)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/jobs/next` | Worker | Poll for next pending job |
| `PATCH` | `/api/jobs/{id}` | Worker | Update job status |
| `POST` | `/api/health` | Worker | Send heartbeat (every 5 min) |
| `GET` | `/api/vps/recyclable` | Worker | Check recycling pool |
| `GET` | `/api/vps?status=active` | Worker | List VPS by status |
| `POST` | `/api/vps` | Worker | Register new VPS |
| `PATCH` | `/api/vps/{id}` | Worker | Update VPS status |
| `POST` | `/api/usage` | Worker | Register gateway token + budget |
| `GET` | `/api/usage` | Admin | List all usage records |
| `GET` | `/api/usage/{id}` | Admin | Get single customer usage |
| `POST` | `/api/usage/{id}/reset` | Admin | Reset monthly spend |
| `POST` | `/api/usage/{id}/revoke` | Admin | Revoke gateway token |
| `POST` | `/api/confirm/{orderId}` | Admin | Manually create a job |

---

## Deployment Pipeline (Per Job)

1. **Provision:** Check recycling pool first → if empty, Contabo API creates new VPS
2. **Deploy:** Claude Agent SDK session runs 14 install scripts in 3 phases with QA gates
3. **Register:** Generate 64-char gateway token, register in D1 with tier budget
4. **Deliver:** Set Telegram webhook, send customer "Your AI is ready!", mark job complete

---

## VPS Lifecycle

| Status | Meaning |
|--------|---------|
| `provisioning` | VPS ordered, waiting for SSH |
| `active` | Customer using it |
| `cancelling` | In recycling pool (can revoke + reinstall for new customer) |
| `expired` | Past cancel deadline |

---

## Backup System

Weekly, per active VPS:
- T1: `clawd.tar.gz` only
- T2+: `clawd.tar.gz` + `mem0.db` + `qdrant-snapshot.tar.gz`

Stored at `~/backups/active/{CUSTOMER_ID}/`

---

## Monitoring

- **Health ping:** Every 5 min to CF Worker
- **Dashboard cron:** Every 15 min via `~/nexgen-worker/scripts/nexgen-dashboard-cron.sh`
- **Owner Telegram:** `@NexGenAI_test_bot` sends deploy status, failures, backup alerts

---

## Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| Worker not polling | `systemctl --user status nexgen-worker.service` | Restart service |
| Jobs not picked up | Check logs | Verify WORKER_TOKEN matches CF Worker |
| Agent SDK fails | `ls ~/.claude/` | Run `claude login` |
| VPS SSH timeout | `ssh -i ~/.ssh/nexgen_automation deploy@{ip}` | Check IP, key perms |
| Contabo API fails | Check `.env` credentials | Re-auth at Contabo panel |
| Telegram fails | Bot token valid? User messaged bot? | Verify with `getMe` API call |

---

## E2E Test Scripts

Located at `~/nexgen-worker/tests/`:

```bash
# VPS lifecycle test (cancel → recycle flow)
~/nexgen-worker-env/bin/python3 tests/test_e2e_vps_lifecycle.py --dry-run
~/nexgen-worker-env/bin/python3 tests/test_e2e_vps_lifecycle.py --vps-id 203187256 --job-id TEST --test full

# Backup/restore test
~/nexgen-worker-env/bin/python3 tests/test_e2e_backup_restore.py --dry-run --vps-ip 161.97.82.155
~/nexgen-worker-env/bin/python3 tests/test_e2e_backup_restore.py --vps-ip 161.97.82.155 --customer-id TEST --tier 2
```

</PI5-GUIDE>

---

## What We're About to Do

We are running a **pre-launch E2E test** to validate the entire pipeline before accepting real customers. The test has 8 phases:

1. **T1:** CF Worker endpoint validation (7 curl tests)
2. **T2:** Manual job creation → Pi5 pickup
3. **T3:** VPS recycling (cancel → revoke → reinstall)
4. **T4:** Backup/restore E2E
5. **T5:** AI proxy cost tracking
6. **T6:** Telegram notifications
7. **T7:** Full Agent SDK deployment
8. **T8:** Cleanup all test data

**Start with Phase T1** — run the endpoint validation curls to verify everything responds correctly. The commands are in the test plan.

After all tests pass, the expected final state is:
- 2 VPS in recyclable pool (both cancel=Apr 27)
- Zero test jobs or usage records in D1
- Worker running, dashboard cron active, Telegram working
- System ready for first real customer
