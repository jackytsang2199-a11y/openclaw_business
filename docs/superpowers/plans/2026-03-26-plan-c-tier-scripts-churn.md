# Plan C: Tier Scripts + Churn Handling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build enable/disable scripts for each tier feature, a tier-change orchestrator, customer data export/archive scripts, and archive cleanup — all used manually in Phase 0, automatable later.

**Architecture:** Each OpenClaw feature (Mem0, SearXNG, watchdog, Chrome, ACPX, ClawTeam) gets a pair of enable/disable bash scripts that modify config files and start/stop services. A `tier-change.sh` orchestrator calls the right combination based on current → target tier. Churn scripts export customer data from VPS to Pi5, and a cleanup script deletes expired archives. All scripts run over SSH from the operator's machine (or Pi5 worker in later phases).

**Tech Stack:** Bash, SSH, jq (JSON config editing), systemctl, Docker

**Spec:** `docs/superpowers/specs/2026-03-26-customer-onboarding-pipeline-design.md` (Sections 10, 11)

**Depends on:** Sub-project A (existing install scripts must be deployed on target VPS). Independent of Plans A and B.

---

## Pre-work

- [ ] **P1: Verify you have a running Tier 2+ VPS to test against**

Either use an existing test VPS or create one:
```bash
cd openclaw_install
bash provision/hetzner-create.sh TTEST 2
bash provision/wait-for-ssh.sh TTEST
# Run full install (scripts 00-10)
```

All enable/disable scripts will be tested against this VPS.

---

## File Structure

```
openclaw_install/
  scripts/
    tier/
      tier-change.sh              — Orchestrator: reads current tier, runs enable/disable
      enable-mem0.sh              — Add Mem0 plugin to openclaw.json + restart
      disable-mem0.sh             — Remove Mem0 plugin from openclaw.json + restart
      enable-searxng.sh           — Start SearXNG container + add URL to config
      disable-searxng.sh          — Stop SearXNG container + remove URL from config
      enable-watchdog.sh          — Start watchdog systemd service
      disable-watchdog.sh         — Stop watchdog systemd service
      enable-chromium.sh          — Start Chrome headless service
      disable-chromium.sh         — Stop Chrome headless service
      enable-acpx.sh              — Enable ACP in openclaw.json
      disable-acpx.sh             — Disable ACP in openclaw.json
      enable-clawteam.sh          — Enable ClawTeam in config
      disable-clawteam.sh         — Disable ClawTeam from config
      update-ai-model.sh          — Change AI model in openclaw.json
      update-message-limit.sh     — Update daily message cap
  churn/
    export-customer-data.sh       — SCP customer data from VPS to Pi5 archives
    delete-archive.sh             — Delete a customer's archived data
    cleanup-expired.sh            — Delete all archives older than 90 days
```

All new files under `f:\openclaw_setup_business\openclaw_install\scripts\tier\` and `f:\openclaw_setup_business\openclaw_install\churn\`.

---

### Task 1: Enable/Disable Mem0

**Files:**
- Create: `openclaw_install/scripts/tier/enable-mem0.sh`
- Create: `openclaw_install/scripts/tier/disable-mem0.sh`

These scripts run ON the VPS (not over SSH — the orchestrator handles SSH).

- [ ] **Step 1: Write enable-mem0.sh**

```bash
#!/bin/bash
set -euo pipefail

# Enable Mem0 plugin in openclaw.json
# Requires: Qdrant running (docker), Mem0 npm package installed
# Run ON the VPS as the deploy user

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[enable-mem0] Enabling Mem0 plugin..."

# Ensure Qdrant container is running
if ! docker ps --format '{{.Names}}' | grep -q qdrant; then
  echo "[enable-mem0] Starting Qdrant container..."
  docker start qdrant 2>/dev/null || {
    echo "[enable-mem0] ERROR: Qdrant container not found. Run 05-setup-qdrant.sh first."
    exit 1
  }
fi

# Add mem0 to plugins.entries in openclaw.json using jq
TMPFILE=$(mktemp)
jq '.plugins.entries.mem0 = {"enabled": true}' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

echo "[enable-mem0] Restarting OpenClaw..."
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw

echo "[enable-mem0] Done. Mem0 enabled."
```

- [ ] **Step 2: Write disable-mem0.sh**

```bash
#!/bin/bash
set -euo pipefail

# Disable Mem0 plugin in openclaw.json
# Does NOT uninstall Qdrant or delete data — just disables the plugin
# Run ON the VPS as the deploy user

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[disable-mem0] Disabling Mem0 plugin..."

# Remove mem0 from plugins.entries using jq
TMPFILE=$(mktemp)
jq 'del(.plugins.entries.mem0)' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

# Stop Qdrant container (save resources, data preserved)
if docker ps --format '{{.Names}}' | grep -q qdrant; then
  echo "[disable-mem0] Stopping Qdrant container..."
  docker stop qdrant
fi

echo "[disable-mem0] Restarting OpenClaw..."
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw

echo "[disable-mem0] Done. Mem0 disabled (data preserved)."
```

- [ ] **Step 3: Test on VPS**

```bash
# SSH into test VPS
source .env
source clients/TTEST/server-info.env
SSH_CMD="ssh -o StrictHostKeyChecking=no -i $SSH_KEY_PATH deploy@$SERVER_IP"

# Upload scripts
$SSH_CMD "mkdir -p ~/scripts/tier"
scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH scripts/tier/enable-mem0.sh scripts/tier/disable-mem0.sh deploy@$SERVER_IP:~/scripts/tier/

# Test disable
$SSH_CMD "bash ~/scripts/tier/disable-mem0.sh"
# Expected: "Disabling Mem0 plugin... Stopping Qdrant... Restarting OpenClaw... Done."

# Verify: mem0 should be gone from config
$SSH_CMD "jq '.plugins.entries' ~/openclaw/openclaw.json"
# Expected: no "mem0" key

# Test enable
$SSH_CMD "bash ~/scripts/tier/enable-mem0.sh"
# Expected: "Enabling Mem0 plugin... Restarting OpenClaw... Done."

# Verify: mem0 should be back
$SSH_CMD "jq '.plugins.entries.mem0' ~/openclaw/openclaw.json"
# Expected: {"enabled": true}
```

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/scripts/tier/enable-mem0.sh openclaw_install/scripts/tier/disable-mem0.sh
git commit -m "feat(plan-c): enable/disable Mem0 scripts"
```

---

### Task 2: Enable/Disable SearXNG

**Files:**
- Create: `openclaw_install/scripts/tier/enable-searxng.sh`
- Create: `openclaw_install/scripts/tier/disable-searxng.sh`

- [ ] **Step 1: Write enable-searxng.sh**

```bash
#!/bin/bash
set -euo pipefail

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[enable-searxng] Enabling SearXNG..."

# Start SearXNG container
if ! docker ps --format '{{.Names}}' | grep -q searxng; then
  docker start searxng 2>/dev/null || {
    echo "[enable-searxng] ERROR: SearXNG container not found. Run 07-setup-searxng.sh first."
    exit 1
  }
fi

# Add search config to openclaw.json
# SearXNG runs on localhost:8888
TMPFILE=$(mktemp)
jq '.plugins.entries.search = {"enabled": true, "provider": "searxng", "baseUrl": "http://127.0.0.1:8888"}' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

echo "[enable-searxng] Restarting OpenClaw..."
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw

echo "[enable-searxng] Done. SearXNG enabled."
```

- [ ] **Step 2: Write disable-searxng.sh**

```bash
#!/bin/bash
set -euo pipefail

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[disable-searxng] Disabling SearXNG..."

# Remove search from config
TMPFILE=$(mktemp)
jq 'del(.plugins.entries.search)' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

# Stop SearXNG container
if docker ps --format '{{.Names}}' | grep -q searxng; then
  docker stop searxng
fi

echo "[disable-searxng] Restarting OpenClaw..."
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw

echo "[disable-searxng] Done. SearXNG disabled (data preserved)."
```

- [ ] **Step 3: Test on VPS (same pattern as Task 1)**

```bash
$SSH_CMD "bash ~/scripts/tier/disable-searxng.sh"
$SSH_CMD "jq '.plugins.entries' ~/openclaw/openclaw.json"
# Expected: no "search" key

$SSH_CMD "bash ~/scripts/tier/enable-searxng.sh"
$SSH_CMD "jq '.plugins.entries.search' ~/openclaw/openclaw.json"
# Expected: {"enabled": true, "provider": "searxng", ...}
```

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/scripts/tier/enable-searxng.sh openclaw_install/scripts/tier/disable-searxng.sh
git commit -m "feat(plan-c): enable/disable SearXNG scripts"
```

---

### Task 3: Enable/Disable Watchdog

**Files:**
- Create: `openclaw_install/scripts/tier/enable-watchdog.sh`
- Create: `openclaw_install/scripts/tier/disable-watchdog.sh`

- [ ] **Step 1: Write enable-watchdog.sh**

```bash
#!/bin/bash
set -euo pipefail

echo "[enable-watchdog] Enabling gateway watchdog..."

export XDG_RUNTIME_DIR="/run/user/$(id -u)"

systemctl --user start openclaw-watchdog 2>/dev/null || {
  echo "[enable-watchdog] ERROR: openclaw-watchdog service not found. Run 08-setup-watchdogs.sh first."
  exit 1
}
systemctl --user enable openclaw-watchdog

echo "[enable-watchdog] Done. Watchdog active."
```

- [ ] **Step 2: Write disable-watchdog.sh**

```bash
#!/bin/bash
set -euo pipefail

echo "[disable-watchdog] Disabling gateway watchdog..."

export XDG_RUNTIME_DIR="/run/user/$(id -u)"

systemctl --user stop openclaw-watchdog 2>/dev/null || true
systemctl --user disable openclaw-watchdog 2>/dev/null || true

echo "[disable-watchdog] Done. Watchdog stopped."
```

- [ ] **Step 3: Test on VPS**

```bash
$SSH_CMD "bash ~/scripts/tier/disable-watchdog.sh"
$SSH_CMD "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user is-active openclaw-watchdog" || echo "inactive"
# Expected: "inactive"

$SSH_CMD "bash ~/scripts/tier/enable-watchdog.sh"
$SSH_CMD "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && systemctl --user is-active openclaw-watchdog"
# Expected: "active"
```

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/scripts/tier/enable-watchdog.sh openclaw_install/scripts/tier/disable-watchdog.sh
git commit -m "feat(plan-c): enable/disable watchdog scripts"
```

---

### Task 4: Enable/Disable Chromium, ACPX, ClawTeam

**Files:**
- Create: `openclaw_install/scripts/tier/enable-chromium.sh`
- Create: `openclaw_install/scripts/tier/disable-chromium.sh`
- Create: `openclaw_install/scripts/tier/enable-acpx.sh`
- Create: `openclaw_install/scripts/tier/disable-acpx.sh`
- Create: `openclaw_install/scripts/tier/enable-clawteam.sh`
- Create: `openclaw_install/scripts/tier/disable-clawteam.sh`

- [ ] **Step 1: Write Chromium scripts**

`enable-chromium.sh`:
```bash
#!/bin/bash
set -euo pipefail

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[enable-chromium] Enabling Chrome headless..."

# Start Chrome service
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user start chrome-headless 2>/dev/null || {
  echo "[enable-chromium] ERROR: chrome-headless service not found. Run 11-setup-chromium.sh first."
  exit 1
}
systemctl --user enable chrome-headless

# Enable browser in openclaw.json
TMPFILE=$(mktemp)
jq '.browser.enabled = true' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

systemctl --user restart openclaw
echo "[enable-chromium] Done."
```

`disable-chromium.sh`:
```bash
#!/bin/bash
set -euo pipefail

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[disable-chromium] Disabling Chrome headless..."

# Disable browser in config
TMPFILE=$(mktemp)
jq '.browser.enabled = false' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

# Stop Chrome service
export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user stop chrome-headless 2>/dev/null || true
systemctl --user disable chrome-headless 2>/dev/null || true

systemctl --user restart openclaw
echo "[disable-chromium] Done."
```

- [ ] **Step 2: Write ACPX scripts**

`enable-acpx.sh`:
```bash
#!/bin/bash
set -euo pipefail

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[enable-acpx] Enabling ACP (Claude Code CLI)..."

TMPFILE=$(mktemp)
jq '.acp.enabled = true' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw
echo "[enable-acpx] Done."
```

`disable-acpx.sh`:
```bash
#!/bin/bash
set -euo pipefail

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[disable-acpx] Disabling ACP (Claude Code CLI)..."

TMPFILE=$(mktemp)
jq '.acp.enabled = false' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw
echo "[disable-acpx] Done."
```

- [ ] **Step 3: Write ClawTeam scripts**

`enable-clawteam.sh`:
```bash
#!/bin/bash
set -euo pipefail

echo "[enable-clawteam] Enabling ClawTeam..."

# ClawTeam needs to be in PATH and its config enabled
CLAWTEAM_DIR="${HOME}/.clawteam"
if [ ! -d "$CLAWTEAM_DIR" ]; then
  echo "[enable-clawteam] ERROR: ClawTeam not installed. Run 13-setup-clawteam.sh first."
  exit 1
fi

# Ensure ClawTeam PATH is in bashrc (idempotent)
if ! grep -q 'clawteam' "${HOME}/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.clawteam/bin:$PATH"' >> "${HOME}/.bashrc"
fi

echo "[enable-clawteam] Done. ClawTeam available."
```

`disable-clawteam.sh`:
```bash
#!/bin/bash
set -euo pipefail

echo "[disable-clawteam] Disabling ClawTeam..."

# Remove ClawTeam from PATH in bashrc
if [ -f "${HOME}/.bashrc" ]; then
  sed -i '/clawteam/d' "${HOME}/.bashrc"
fi

echo "[disable-clawteam] Done. ClawTeam removed from PATH (files preserved)."
```

- [ ] **Step 4: Test all 6 scripts on VPS**

```bash
# Upload
scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH scripts/tier/*.sh deploy@$SERVER_IP:~/scripts/tier/

# Test Chrome (only on Tier 3 VPS with Chrome installed)
$SSH_CMD "bash ~/scripts/tier/disable-chromium.sh"
$SSH_CMD "jq '.browser.enabled' ~/openclaw/openclaw.json"
# Expected: false

$SSH_CMD "bash ~/scripts/tier/enable-chromium.sh"
$SSH_CMD "jq '.browser.enabled' ~/openclaw/openclaw.json"
# Expected: true

# Test ACPX
$SSH_CMD "bash ~/scripts/tier/disable-acpx.sh"
$SSH_CMD "jq '.acp.enabled' ~/openclaw/openclaw.json"
# Expected: false

$SSH_CMD "bash ~/scripts/tier/enable-acpx.sh"
$SSH_CMD "jq '.acp.enabled' ~/openclaw/openclaw.json"
# Expected: true
```

- [ ] **Step 5: Commit**

```bash
git add openclaw_install/scripts/tier/
git commit -m "feat(plan-c): enable/disable scripts for Chrome, ACPX, ClawTeam"
```

---

### Task 5: AI Model + Message Limit Scripts

**Files:**
- Create: `openclaw_install/scripts/tier/update-ai-model.sh`
- Create: `openclaw_install/scripts/tier/update-message-limit.sh`

- [ ] **Step 1: Write update-ai-model.sh**

```bash
#!/bin/bash
set -euo pipefail

# Usage: update-ai-model.sh <MODEL_STRING>
# Example: update-ai-model.sh "deepseek/deepseek-chat"
# Example: update-ai-model.sh "openai/gpt-4.1-mini"
MODEL="${1:?Usage: update-ai-model.sh <model-string>}"

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[update-model] Changing model to: $MODEL"

TMPFILE=$(mktemp)
jq --arg model "$MODEL" '.agents.defaults.model.primary = $model | .agents.defaults.subagents.model = $model' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw

echo "[update-model] Done. Model set to $MODEL."
```

- [ ] **Step 2: Write update-message-limit.sh**

```bash
#!/bin/bash
set -euo pipefail

# Usage: update-message-limit.sh <DAILY_LIMIT>
# Example: update-message-limit.sh 300
LIMIT="${1:?Usage: update-message-limit.sh <daily-limit>}"

OPENCLAW_DIR="${HOME}/openclaw"
CONFIG="${OPENCLAW_DIR}/openclaw.json"

echo "[update-limit] Setting daily message limit to: $LIMIT"

TMPFILE=$(mktemp)
jq --argjson limit "$LIMIT" '.messages.dailyLimit = $limit' "$CONFIG" > "$TMPFILE" && mv "$TMPFILE" "$CONFIG"

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
systemctl --user restart openclaw

echo "[update-limit] Done. Daily limit set to $LIMIT."
```

- [ ] **Step 3: Test on VPS**

```bash
$SSH_CMD "bash ~/scripts/tier/update-ai-model.sh 'openai/gpt-4.1-mini'"
$SSH_CMD "jq '.agents.defaults.model.primary' ~/openclaw/openclaw.json"
# Expected: "openai/gpt-4.1-mini"

$SSH_CMD "bash ~/scripts/tier/update-ai-model.sh 'deepseek/deepseek-chat'"
# Reset

$SSH_CMD "bash ~/scripts/tier/update-message-limit.sh 100"
$SSH_CMD "jq '.messages.dailyLimit' ~/openclaw/openclaw.json"
# Expected: 100
```

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/scripts/tier/update-ai-model.sh openclaw_install/scripts/tier/update-message-limit.sh
git commit -m "feat(plan-c): AI model + message limit update scripts"
```

---

### Task 6: Tier Change Orchestrator

**Files:**
- Create: `openclaw_install/scripts/tier/tier-change.sh`

- [ ] **Step 1: Write tier-change.sh**

```bash
#!/bin/bash
set -euo pipefail

# Usage: tier-change.sh <FROM_TIER> <TO_TIER>
# Run ON the VPS as deploy user
# Example: tier-change.sh 1 2  (upgrade from Tier 1 to Tier 2)
# Example: tier-change.sh 3 1  (downgrade from Tier 3 to Tier 1)

FROM="${1:?Usage: tier-change.sh <FROM_TIER> <TO_TIER>}"
TO="${2:?Usage: tier-change.sh <FROM_TIER> <TO_TIER>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[tier-change] Changing from Tier $FROM to Tier $TO"

# Define which features each tier has
# Tier 1: base only
# Tier 2: + mem0, searxng, watchdog
# Tier 3: + chromium, acpx, clawteam

tier_has_feature() {
  local tier=$1 feature=$2
  case "$feature" in
    mem0|searxng|watchdog) [ "$tier" -ge 2 ] ;;
    chromium|acpx|clawteam) [ "$tier" -ge 3 ] ;;
    *) return 1 ;;
  esac
}

FEATURES="mem0 searxng watchdog chromium acpx clawteam"

for feature in $FEATURES; do
  had_it=false
  will_have=false
  tier_has_feature "$FROM" "$feature" && had_it=true
  tier_has_feature "$TO" "$feature" && will_have=true

  if ! $had_it && $will_have; then
    echo "[tier-change] Enabling $feature..."
    bash "$SCRIPT_DIR/enable-${feature}.sh"
  elif $had_it && ! $will_have; then
    echo "[tier-change] Disabling $feature..."
    bash "$SCRIPT_DIR/disable-${feature}.sh"
  fi
done

# Update AI model based on tier (placeholder — fill in when models are finalised)
# case "$TO" in
#   1) bash "$SCRIPT_DIR/update-ai-model.sh" "deepseek/deepseek-chat" ;;
#   2) bash "$SCRIPT_DIR/update-ai-model.sh" "deepseek/deepseek-chat" ;;
#   3) bash "$SCRIPT_DIR/update-ai-model.sh" "openai/gpt-4.1" ;;
# esac

# Update message limit (placeholder — fill in when limits are finalised)
# case "$TO" in
#   1) bash "$SCRIPT_DIR/update-message-limit.sh" 100 ;;
#   2) bash "$SCRIPT_DIR/update-message-limit.sh" 300 ;;
#   3) bash "$SCRIPT_DIR/update-message-limit.sh" 1000 ;;
# esac

echo "[tier-change] Done. Changed from Tier $FROM to Tier $TO."
```

- [ ] **Step 2: Test upgrade (Tier 1 → Tier 2)**

```bash
# First disable all Tier 2+ features to simulate Tier 1
$SSH_CMD "bash ~/scripts/tier/disable-mem0.sh"
$SSH_CMD "bash ~/scripts/tier/disable-searxng.sh"
$SSH_CMD "bash ~/scripts/tier/disable-watchdog.sh"

# Now upgrade 1 → 2
$SSH_CMD "bash ~/scripts/tier/tier-change.sh 1 2"
# Expected: Enables mem0, searxng, watchdog

# Verify
$SSH_CMD "jq '.plugins.entries.mem0.enabled' ~/openclaw/openclaw.json"
# Expected: true
$SSH_CMD "docker ps --format '{{.Names}}' | grep -c -E 'qdrant|searxng'"
# Expected: 2
```

- [ ] **Step 3: Test downgrade (Tier 2 → Tier 1)**

```bash
$SSH_CMD "bash ~/scripts/tier/tier-change.sh 2 1"
# Expected: Disables mem0, searxng, watchdog

$SSH_CMD "jq '.plugins.entries' ~/openclaw/openclaw.json"
# Expected: no mem0, no search
$SSH_CMD "docker ps --format '{{.Names}}'"
# Expected: no qdrant, no searxng
```

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/scripts/tier/tier-change.sh
git commit -m "feat(plan-c): tier-change orchestrator — handles all upgrade/downgrade paths"
```

---

### Task 7: Customer Data Export

**Files:**
- Create: `openclaw_install/churn/export-customer-data.sh`

- [ ] **Step 1: Write export-customer-data.sh**

```bash
#!/bin/bash
set -euo pipefail

# Usage: export-customer-data.sh <CLIENT_ID> <ARCHIVE_DIR>
# Exports customer data from VPS to local archive directory.
# Run from the operator's machine (or Pi5).
# Does NOT destroy the VPS — that's a separate step.

CLIENT_ID="${1:?Usage: export-customer-data.sh <CLIENT_ID> <ARCHIVE_DIR>}"
ARCHIVE_BASE="${2:?Usage: export-customer-data.sh <CLIENT_ID> <ARCHIVE_DIR>}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$INSTALL_DIR/.env"
source "$INSTALL_DIR/clients/$CLIENT_ID/server-info.env"

ARCHIVE_DIR="$ARCHIVE_BASE/$CLIENT_ID"
SCP_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH"
SSH_CMD="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH deploy@$SERVER_IP"

echo "[export] Exporting customer data for $CLIENT_ID from $SERVER_IP..."
mkdir -p "$ARCHIVE_DIR"

# Export Qdrant data (if exists)
echo "[export] Checking Qdrant data..."
if $SSH_CMD "test -d ~/qdrant-storage" 2>/dev/null; then
  echo "[export] Exporting Qdrant vectors..."
  scp $SCP_OPTS -r "deploy@$SERVER_IP:~/qdrant-storage" "$ARCHIVE_DIR/qdrant/"
else
  echo "[export] No Qdrant data found (Tier 1?)."
fi

# Export Mem0 database (if exists)
if $SSH_CMD "test -f ~/mem0.db" 2>/dev/null; then
  echo "[export] Exporting Mem0 database..."
  scp $SCP_OPTS "deploy@$SERVER_IP:~/mem0.db" "$ARCHIVE_DIR/mem0.db"
else
  echo "[export] No Mem0 database found."
fi

# Export openclaw.json (config — no API keys in this file)
echo "[export] Exporting OpenClaw config..."
scp $SCP_OPTS "deploy@$SERVER_IP:~/openclaw/openclaw.json" "$ARCHIVE_DIR/openclaw.json"

# Export soul.md (personality file)
if $SSH_CMD "test -f ~/openclaw/soul.md" 2>/dev/null; then
  scp $SCP_OPTS "deploy@$SERVER_IP:~/openclaw/soul.md" "$ARCHIVE_DIR/soul.md"
fi

# NOTE: client.env and .env are NOT exported — they contain shared API keys
# (DeepSeek, OpenAI) that the customer does not own.

# Save metadata
cat > "$ARCHIVE_DIR/metadata.txt" <<EOF
CLIENT_ID=$CLIENT_ID
TIER=${TIER:-unknown}
SERVER_IP=$SERVER_IP
EXPORTED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXPIRES=$(date -u -d "+90 days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+90d +%Y-%m-%dT%H:%M:%SZ)
EOF

# Calculate archive size
ARCHIVE_SIZE=$(du -sh "$ARCHIVE_DIR" | cut -f1)
echo "[export] Done. Exported $ARCHIVE_SIZE to $ARCHIVE_DIR"
echo "[export] Archive expires: $(grep EXPIRES "$ARCHIVE_DIR/metadata.txt" | cut -d= -f2)"
```

- [ ] **Step 2: Test export**

```bash
cd openclaw_install
mkdir -p /tmp/test-archives
bash churn/export-customer-data.sh TTEST /tmp/test-archives

ls -la /tmp/test-archives/TTEST/
# Expected: qdrant/, mem0.db, openclaw.json, soul.md, metadata.txt
cat /tmp/test-archives/TTEST/metadata.txt
# Expected: CLIENT_ID=TTEST, EXPORTED=..., EXPIRES=...
```

- [ ] **Step 3: Commit**

```bash
git add openclaw_install/churn/export-customer-data.sh
git commit -m "feat(plan-c): customer data export script (no API keys, metadata with expiry)"
```

---

### Task 8: Archive Cleanup Scripts

**Files:**
- Create: `openclaw_install/churn/delete-archive.sh`
- Create: `openclaw_install/churn/cleanup-expired.sh`

- [ ] **Step 1: Write delete-archive.sh**

```bash
#!/bin/bash
set -euo pipefail

# Usage: delete-archive.sh <CLIENT_ID> <ARCHIVE_DIR>
# Immediately deletes a customer's archived data.

CLIENT_ID="${1:?Usage: delete-archive.sh <CLIENT_ID> <ARCHIVE_DIR>}"
ARCHIVE_BASE="${2:?Usage: delete-archive.sh <CLIENT_ID> <ARCHIVE_DIR>}"

ARCHIVE_DIR="$ARCHIVE_BASE/$CLIENT_ID"

if [ ! -d "$ARCHIVE_DIR" ]; then
  echo "[delete] No archive found for $CLIENT_ID at $ARCHIVE_DIR"
  exit 0
fi

ARCHIVE_SIZE=$(du -sh "$ARCHIVE_DIR" | cut -f1)
echo "[delete] Deleting archive for $CLIENT_ID ($ARCHIVE_SIZE)..."

rm -rf "$ARCHIVE_DIR"

echo "[delete] Done. Archive for $CLIENT_ID deleted."
```

- [ ] **Step 2: Write cleanup-expired.sh**

```bash
#!/bin/bash
set -euo pipefail

# Usage: cleanup-expired.sh <ARCHIVE_DIR>
# Deletes all customer archives past their expiry date.
# Intended to run as a cron job or manually.

ARCHIVE_BASE="${1:?Usage: cleanup-expired.sh <ARCHIVE_DIR>}"

NOW=$(date -u +%s)
DELETED=0

echo "[cleanup] Checking for expired archives in $ARCHIVE_BASE..."

for DIR in "$ARCHIVE_BASE"/*/; do
  [ -d "$DIR" ] || continue
  METADATA="$DIR/metadata.txt"
  [ -f "$METADATA" ] || continue

  EXPIRES=$(grep "^EXPIRES=" "$METADATA" | cut -d= -f2)
  [ -n "$EXPIRES" ] || continue

  EXPIRES_TS=$(date -u -d "$EXPIRES" +%s 2>/dev/null || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$EXPIRES" +%s 2>/dev/null)
  [ -n "$EXPIRES_TS" ] || continue

  if [ "$NOW" -gt "$EXPIRES_TS" ]; then
    CLIENT_ID=$(basename "$DIR")
    echo "[cleanup] Expired: $CLIENT_ID (expired $EXPIRES) — deleting..."
    rm -rf "$DIR"
    DELETED=$((DELETED + 1))
  fi
done

echo "[cleanup] Done. Deleted $DELETED expired archives."
```

- [ ] **Step 3: Test**

```bash
# Test delete
bash churn/delete-archive.sh TTEST /tmp/test-archives
ls /tmp/test-archives/TTEST 2>/dev/null || echo "Deleted successfully"
# Expected: "Deleted successfully"

# Test cleanup (create a fake expired archive)
mkdir -p /tmp/test-archives/TEXPIRED
cat > /tmp/test-archives/TEXPIRED/metadata.txt <<EOF
CLIENT_ID=TEXPIRED
EXPIRES=2025-01-01T00:00:00Z
EOF

bash churn/cleanup-expired.sh /tmp/test-archives
ls /tmp/test-archives/TEXPIRED 2>/dev/null || echo "Cleaned up"
# Expected: "Cleaned up"
```

- [ ] **Step 4: Commit**

```bash
git add openclaw_install/churn/
git commit -m "feat(plan-c): archive delete + expired cleanup scripts"
```

---

### Task 9: Destroy Test VPS

**No new files.** Clean up.

- [ ] **Step 1: Destroy test VPS**

```bash
cd openclaw_install
bash provision/destroy-vps.sh TTEST
```

- [ ] **Step 2: Clean up test archives**

```bash
rm -rf /tmp/test-archives
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(plan-c): tier management + churn handling scripts complete"
```

---

## Post-completion

Plan C is complete when:
1. All 6 feature pairs (enable/disable) work on a real VPS
2. `tier-change.sh` correctly handles all upgrade/downgrade paths
3. `export-customer-data.sh` exports correct files (no API keys)
4. `cleanup-expired.sh` deletes expired archives
5. Test VPS destroyed

**Integration with Plan B (future):** The Pi5 worker's deployer can call these scripts over SSH for automated tier changes and churn handling in Phase 1-2.
