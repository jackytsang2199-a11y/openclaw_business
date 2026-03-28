# Remaining Pipeline Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the five remaining NexGen onboarding pipeline tasks: gateway URL writeback in install script, scp-based PC pull script (Windows-compatible), dashboard cron setup instructions, gateway proxy E2E verification, and VPS recycling documentation.

**Architecture:** These are independent fixes spanning the install script (`10-configure-env.sh` gateway URL writeback), Pi5 worker scripts (scp-based backup pull replacing rsync), and operational docs. No new services or major refactors — just closing gaps found during E2E deployment.

**Tech Stack:** Bash (install scripts), Python (Pi5 worker), Cloudflare Workers (CF proxy)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `openclaw_install/scripts/10-configure-env.sh` | Modify | Add `DEEPSEEK_BASE_URL` + `OPENAI_BASE_URL` to `~/.openclaw/env` for gateway proxy routing |
| `onboarding-pipeline/pi5-worker/scripts/nexgen-backup-pull.sh` | Rewrite | Replace rsync with scp for Windows Git Bash compatibility |
| `onboarding-pipeline/pi5-worker/scripts/nexgen-dashboard-cron.sh` | Existing | Already created — document setup instructions |

---

### Task 1: Add gateway proxy URLs to install script

The install script (`10-configure-env.sh`) writes `~/.openclaw/env` but currently only writes `AI_GATEWAY_URL`, `AI_GATEWAY_TOKEN`, and raw Mem0 keys. OpenClaw's gateway reads `DEEPSEEK_BASE_URL` and `OPENAI_BASE_URL` from this env file to route chat requests through the CF Worker proxy for cost tracking. Without these, chat goes directly to provider APIs (bypassing billing).

**Files:**
- Modify: `openclaw_install/scripts/10-configure-env.sh:43-51`

- [ ] **Step 1: Update the env file write block**

Replace the `cat > ~/.openclaw/env` block (lines 43-51) with:

```bash
# Write env file — gateway proxy URLs for OpenClaw chat, raw keys for Mem0
cat > ~/.openclaw/env << ENV_EOF
AI_GATEWAY_URL=$AI_GATEWAY_URL
AI_GATEWAY_TOKEN=$AI_GATEWAY_TOKEN
DEEPSEEK_API_KEY=${GATEWAY_TOKEN}
DEEPSEEK_BASE_URL=${AI_GATEWAY_URL}/deepseek
OPENAI_API_KEY=${GATEWAY_TOKEN}
OPENAI_BASE_URL=${AI_GATEWAY_URL}/openai
ENV_EOF
chmod 600 ~/.openclaw/env
log "Gateway proxy URLs + token written to ~/.openclaw/env"
```

Key changes:
- `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` now use `$GATEWAY_TOKEN` (the per-client gateway token that the CF Worker proxy authenticates against D1). OpenClaw sends this as `Authorization: Bearer <key>` to the base URLs.
- `DEEPSEEK_BASE_URL` and `OPENAI_BASE_URL` point to the CF Worker proxy endpoints (`https://api.3nexgen.com/api/ai/deepseek` and `.../openai`).
- The CF Worker proxy receives the gateway token, validates it against D1, forwards the request to the real provider with the real API key, and tracks cost.

**Important:** Mem0 still needs real API keys for local embeddings. These are injected into `openclaw.json` (not `~/.openclaw/env`) by the Python block below in the same script — specifically in the `oss.embedder.config.apiKey` and `oss.llm.config.apiKey` fields. The env file keys are ONLY for OpenClaw chat routing.

- [ ] **Step 2: Update the Mem0 comment to clarify separation**

Replace the comment on line 24-25:

```bash
# Mem0 keys are optional — only needed for Tier 2+ (direct API access for local embeddings)
```

With:

```bash
# Mem0 keys are optional — only needed for Tier 2+ (injected into openclaw.json, NOT env file)
# The env file uses gateway token for chat routing; openclaw.json has real keys for Mem0
```

- [ ] **Step 3: Verify the script is syntactically valid**

Run: `bash -n openclaw_install/scripts/10-configure-env.sh`
Expected: No output (clean syntax)

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/scripts/10-configure-env.sh
git commit -m "fix: write gateway proxy URLs to ~/.openclaw/env for cost tracking"
```

---

### Task 2: Replace rsync with scp in PC pull script

The existing `nexgen-backup-pull.sh` uses `rsync` which is not available in Windows Git Bash. Replace with `scp -r` which is universally available.

**Files:**
- Rewrite: `onboarding-pipeline/pi5-worker/scripts/nexgen-backup-pull.sh`

- [ ] **Step 1: Rewrite the pull script using scp**

```bash
#!/bin/bash
# nexgen-backup-pull.sh — Runs on admin PC (Windows/Mac/Linux)
# Pulls latest backups from Pi5 to PC for versioned cold storage.
#
# Usage: ./nexgen-backup-pull.sh
# Schedule: Windows Task Scheduler or cron at 23:00 HKT
#
# Uses scp instead of rsync for Windows Git Bash compatibility.
set -euo pipefail

# === Configuration ===
PI5_USER="${PI5_USER:-pi}"
PI5_IP="${PI5_IP:?Set PI5_IP environment variable (e.g. 192.168.1.100)}"
PI5_SSH_KEY="${PI5_SSH_KEY:-$HOME/.ssh/id_rsa}"
PC_BACKUP_DIR="${PC_BACKUP_DIR:-$HOME/nexgen-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-28}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15 -i ${PI5_SSH_KEY}"

# === Date-stamped target ===
TODAY=$(date +%Y-%m-%d)
WEEKLY_DIR="${PC_BACKUP_DIR}/weekly/${TODAY}"
LOG_FILE="${PC_BACKUP_DIR}/pull.log"

mkdir -p "${WEEKLY_DIR}"
mkdir -p "${PC_BACKUP_DIR}/churn"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" | tee -a "${LOG_FILE}"
}

# === Step 1: Copy active backups via scp ===
log "Pulling active backups from Pi5 (${PI5_IP})..."
if scp -r ${SSH_OPTS} \
    "${PI5_USER}@${PI5_IP}:~/backups/active/" \
    "${WEEKLY_DIR}/" 2>>"${LOG_FILE}"; then
    log "Active backups copied to ${WEEKLY_DIR}"
else
    log "ERROR: Failed to scp active backups from Pi5"
    exit 1
fi

# === Step 2: Copy churn archives ===
log "Copying churn archives..."
if scp -r ${SSH_OPTS} \
    "${PI5_USER}@${PI5_IP}:~/backups/churn/" \
    "${PC_BACKUP_DIR}/churn/" 2>>"${LOG_FILE}"; then
    log "Churn archives copied"
else
    log "WARNING: Failed to scp churn archives (non-fatal)"
fi

# === Step 3: Cleanup old weeklies ===
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
if command -v find &>/dev/null; then
    find "${PC_BACKUP_DIR}/weekly" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>>"${LOG_FILE}"
else
    log "WARNING: find not available — skipping cleanup (Windows Git Bash)"
fi
REMAINING=$(ls -d "${PC_BACKUP_DIR}/weekly"/*/ 2>/dev/null | wc -l)
log "Cleanup done. ${REMAINING} weekly snapshots retained."

log "Pull complete."
```

Key changes from original:
- `rsync -avz -e "ssh ..."` → `scp -r ${SSH_OPTS}` (no rsync dependency)
- Remote paths use `~/backups/` (home-relative, matching Pi5 config)
- `find` cleanup wrapped in `command -v` check for Windows Git Bash
- `scp` does full copy each time (no incremental delta like rsync) — acceptable for weekly backups under 15GB budget

- [ ] **Step 2: Verify syntax**

Run: `bash -n onboarding-pipeline/pi5-worker/scripts/nexgen-backup-pull.sh`
Expected: No output (clean syntax)

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/pi5-worker/scripts/nexgen-backup-pull.sh
git commit -m "fix: replace rsync with scp in PC pull script for Windows compatibility"
```

---

### Task 3: Document Pi5 dashboard cron + service setup

The dashboard script and cron wrapper exist but need setup instructions for the Pi5. This task creates a setup section in the existing plan doc.

**Files:**
- Modify: `docs/superpowers/plans/2026-03-28-plan-e2e-completion.md` (add setup instructions appendix)

- [ ] **Step 1: Add operational setup appendix**

Append to the end of `docs/superpowers/plans/2026-03-28-plan-e2e-completion.md`:

```markdown

---

## Appendix: Pi5 Operational Setup Commands

### Dashboard Cron (every 15 minutes)

```bash
# On Pi5, as the service user:
chmod +x ~/nexgen-worker/scripts/nexgen-dashboard-cron.sh

# Add to crontab:
(crontab -l 2>/dev/null; echo "*/15 * * * * ~/nexgen-worker/scripts/nexgen-dashboard-cron.sh") | crontab -

# Verify:
crontab -l | grep dashboard

# Test manually:
~/nexgen-worker/scripts/nexgen-dashboard-cron.sh
cat ~/nexgen-dashboard.md
```

### Required .env Variables for Dashboard

The dashboard reads from `~/nexgen-worker/.env`:

```
CF_WORKER_URL=https://api.3nexgen.com
WORKER_TOKEN=<pi5 worker token>
CONFIRM_API_KEY=<admin API key for usage endpoints>
SSH_KEY_PATH=~/.ssh/nexgen_automation
BACKUPS_DIR=~/backups
```

### Reading Dashboard from OpenClaw

Your personal OpenClaw assistant can read the dashboard:

> "Read the file ~/nexgen-dashboard.md and summarize the status"

The dashboard updates every 15 minutes via cron. It shows:
- Pi5 worker service status
- VPS instances health (gateway, watchdog, Qdrant, SearXNG, disk, memory)
- API usage per customer (spend, budget, blocked status)
- Backup status and age warnings

### VPS Recycling (Not Yet Tested Live)

The recycling flow (cancel VPS → enter pool → revoke + reinstall for new customer) has code in `vps_lifecycle.py` but has NOT been tested against the live Contabo API. Before relying on it:

1. Test `contabo-cancel.sh` with a disposable VPS
2. Verify the cancel endpoint returns a termination deadline
3. Test `contabo-revoke.sh` — this endpoint is unverified per the Contabo API guide
4. If revoke fails, fallback is manual panel cancellation revoke + Telegram alert to owner
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-03-28-plan-e2e-completion.md
git commit -m "docs: add Pi5 operational setup instructions (dashboard cron, VPS recycling notes)"
```

---

### Task 4: Verify gateway proxy E2E (manual test instructions)

This task documents how to verify the full gateway proxy chain: VPS OpenClaw → CF Worker proxy → DeepSeek/OpenAI → cost tracked in D1. No code changes — just verification commands.

**Files:**
- None (manual verification on live systems)

- [ ] **Step 1: Test the Telegram bot**

Send a message to `@NexGenAI_T1043_bot` on Telegram. The bot should respond via the gateway proxy.

- [ ] **Step 2: Check cost tracking in D1**

```bash
# From Pi5 or any machine with the admin key:
curl -s -H "X-API-Key: <CONFIRM_API_KEY>" https://api.3nexgen.com/api/usage | python3 -m json.tool
```

Expected: The customer's `current_spend_hkd` should be > 0 after the bot responds, `total_requests` should increment.

- [ ] **Step 3: Verify VPS env routing**

```bash
# SSH to VPS and check env file:
ssh -i ~/.ssh/nexgen_automation deploy@161.97.82.155 'cat ~/.openclaw/env'
```

Expected output should contain:
```
DEEPSEEK_BASE_URL=https://api.3nexgen.com/api/ai/deepseek
OPENAI_BASE_URL=https://api.3nexgen.com/api/ai/openai
```

If missing, the `10-configure-env.sh` fix from Task 1 was not applied to this VPS (it was configured manually). The fix ensures future deployments write these automatically.

---

### Task 5: Commit all remaining changes

Final commit for any files modified in Tasks 1-3.

**Files:**
- All modified files from previous tasks

- [ ] **Step 1: Stage and commit**

```bash
git add -A  # or specific files from tasks above
git status
git commit -m "fix: gateway proxy URLs in install script, scp pull script, setup docs"
```

Note: Tasks 1-3 each have their own commit steps. This task is a fallback if commits were batched.
