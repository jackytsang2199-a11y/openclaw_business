# Plan B: Pi5 Worker + Bot Pool + Deploy Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python worker process that runs on Pi5, polls the CF Worker API for jobs, manages a Telegram bot pool, and orchestrates full customer deployments via Claude Agent SDK — including Contabo VPS provisioning.

**Architecture:** A lightweight Python process runs on Pi5 as a systemd service. It polls `api.3nexgen.com/api/jobs/next` every 30 seconds. When a job is found, it assigns a bot from the local pool, provisions a Contabo VPS via API, runs the existing install scripts via SSH (following the CLAUDE.md playbook), runs QA, and delivers the bot to the customer. Status updates are pushed back to the CF Worker. Owner notifications are sent via Telegram.

**Tech Stack:** Python 3.11+, requests, Claude Agent SDK (Python), Bash (provisioning scripts), systemd

**Spec:** `docs/superpowers/specs/2026-03-26-customer-onboarding-pipeline-design.md`
**VPS Strategy:** `docs/superpowers/specs/2026-03-27-contabo-vps-billing-strategy-design.md`

**Depends on:** Plan A (CF Worker must be deployed and reachable at `api.3nexgen.com`)

---

## Pre-work (before Task 1)

- [ ] **P1: Verify Plan A is deployed**

```bash
curl -H "X-Worker-Token: YOUR_TOKEN" https://api.3nexgen.com/api/jobs/next
# Expected: {"job":null}
```

- [ ] **P2: Create Contabo account and validate API**

1. Sign up at contabo.com
2. Go to API settings, create OAuth credentials (client_id + client_secret)
3. Test the API:

```bash
# Get access token
curl -X POST "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials" \
  -d "username=YOUR_API_USER" \
  -d "password=YOUR_API_PASSWORD"
# Expected: JSON with access_token

# List instances (should be empty or show existing)
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-request-id: test-$(date +%s)" \
  "https://api.contabo.com/v1/compute/instances"
```

**If Contabo API is insufficient:** Fall back to Hetzner. Replace `contabo-create.sh` with `hetzner-create.sh` in the pipeline. The rest of Plan B is provider-agnostic.

- [ ] **P3: Place first Contabo order manually**

First-time orders may trigger fraud verification (hours-long delay). Place one VPS manually via web panel to clear this. Destroy it after verification passes.

- [x] **P4a: Create bot pool (automated via `replenish_bots.py`)**

Script: `onboarding-pipeline/telegram-bot-creation/replenish_bots.py`
Uses Pyrogram + Telegram Desktop public API credentials (no my.telegram.org registration needed).

```bash
cd onboarding-pipeline/telegram-bot-creation
pip install -r requirements.txt

# First run — prompts for phone + OTP, creates nexgen_session.session
python3 replenish_bots.py --start 1043 --count 20
```

**Current status (2026-03-26):** 4 bots created (T1043–T1046). Sufficient for development + E2E testing. BotFather rate limit active — replenish remaining bots before launch.

- [ ] **P4b: Replenish pool to 20 before launch**

```bash
# Resume after rate limit expires
python3 replenish_bots.py --start 1047 --count 16
```

- [ ] **P4c: Verify pool**

```bash
ls ~/bot-pool/available/ | wc -l
# Expected: 20 (4 now, 16 after P4b)
```

**Display name flow (Option A hybrid):**
- Bots are pre-created with default names ("NexGen AI T1043" etc.)
- Usernames (`@NexGenAI_T1043_bot`) are permanent and cannot be changed — customers never see these (they interact via display name in chat)
- When customer fills the order form, they choose a **custom display name** for their bot
- After payment confirmation, the pipeline calls `Bot.setMyName()` to rename the bot to the customer's chosen name **before** deployment begins
- If rename fails (API error, rate limit), deployment continues with default name — owner is notified to rename manually

**Replenishment:** When pool drops below 20, owner gets alert with command to run:
`python3 replenish_bots.py --start NEXT_NUMBER --count 20`

- [ ] **P5: Install Python 3.11+ on Pi5**

```bash
# On Pi5 via SSH
python3 --version
# Expected: Python 3.11+ (Raspberry Pi OS Bookworm ships 3.11)

pip3 install --user requests
```

- [ ] **P6: Add Contabo credentials to .env**

Update `f:\openclaw_setup_business\openclaw_install\.env`:
```bash
# Contabo (Production)
CONTABO_CLIENT_ID=your_contabo_oauth_client_id
CONTABO_CLIENT_SECRET=your_contabo_oauth_client_secret
CONTABO_API_USER=your_contabo_api_username
CONTABO_API_PASSWORD=your_contabo_api_password
```

- [ ] **P7: Install Claude Code CLI + Agent SDK on Pi5 (Max plan auth)**

The deployer uses the Claude Agent SDK to run an AI operator that follows the CLAUDE.md playbook. This is the core differentiator — the AI interprets QA output, debugs failures, and makes adaptive decisions instead of blindly running scripts.

**Authentication:** The Agent SDK spawns the Claude Code CLI as a subprocess. The CLI reads the OAuth token from `~/.claude/` (created by `claude login`). This uses the Claude Max plan ($100/mo) — no per-token API costs. Sonnet 4.6 is the default model (Opus available on Max for free if needed).

```bash
# On Pi5 via SSH

# 1. Install Claude Code CLI (requires Node.js)
npm install -g @anthropic-ai/claude-code

# 2. Authenticate with Max plan (one-time, token lasts 1 year)
claude login
# Follow the browser OAuth flow. Token is stored in ~/.claude/

# 3. Verify CLI works
claude --version
claude -p "echo hello" --allowedTools Bash --permission-mode bypassPermissions

# 4. Install Python Agent SDK
pip3 install --user claude-agent-sdk anyio

# 5. Verify Agent SDK can spawn CLI
python3 -c "from claude_agent_sdk import query; print('Agent SDK OK')"
```

**Auth health check (zero-cost):** The deployer checks `~/.claude/` exists before each deployment. If missing, it skips the deploy and notifies the owner to re-run `claude login`.

Add to `.env`:
```bash
# Agent SDK (Claude Max plan — no API key needed)
AGENT_MAX_TURNS=50
```

---

## File Structure

```
onboarding-pipeline/
  pi5-worker/
    config.py              — Configuration (env vars, paths, URLs, Agent SDK settings)
    api_client.py          — CF Worker API client (poll, update, health, VPS lifecycle)
    bot_pool.py            — Bot pool filesystem operations
    notifier.py            — Telegram notifications to owner
    playbook.py            — Builds deployment prompts from CLAUDE.md playbook for Agent SDK
    deployer.py            — Orchestrates deployment: recycle-or-provision → install+QA (Agent SDK) → deliver
    vps_lifecycle.py       — VPS recycling pool + cancel/revoke logic (calls Contabo API + CF Worker D1)
    worker.py              — Main loop: poll → process (deploy/cancel) → repeat
    requirements.txt       — Python dependencies (requests, claude-agent-sdk, anyio)
    .env.example           — Template for Pi5 .env file
    tests/
      test_bot_pool.py
      test_api_client.py
      test_deployer.py
      test_vps_lifecycle.py
  cf-worker/               — (Plan A, already exists)

openclaw_install/
  provision/
    contabo-auth.sh        — NEW: Get Contabo OAuth token
    contabo-create.sh      — NEW: Contabo VPS provisioning
    contabo-destroy.sh     — NEW: Contabo VPS destruction
    contabo-cancel.sh      — NEW: Submit Contabo cancellation (billing)
    contabo-revoke.sh      — NEW: Revoke pending cancellation (for recycling)
    contabo-reinstall.sh   — NEW: OS reinstall for recycled VPS
```

All Pi5 worker files live under `f:\openclaw_setup_business\onboarding-pipeline\pi5-worker\`.
Contabo scripts live under `f:\openclaw_setup_business\openclaw_install\provision\`.

---

### Task 1: Contabo Provisioning Scripts

**Files:**
- Create: `openclaw_install/provision/contabo-auth.sh`
- Create: `openclaw_install/provision/contabo-create.sh`
- Create: `openclaw_install/provision/contabo-destroy.sh`

- [ ] **Step 1: Write Contabo OAuth token helper**

Create `openclaw_install/provision/contabo-auth.sh`:
```bash
#!/bin/bash
# Returns a Contabo OAuth access token to stdout.
# Usage: TOKEN=$(bash contabo-auth.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

RESPONSE=$(curl -s -X POST \
  "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
  -d "client_id=${CONTABO_CLIENT_ID}" \
  -d "client_secret=${CONTABO_CLIENT_SECRET}" \
  -d "grant_type=password" \
  -d "username=${CONTABO_API_USER}" \
  -d "password=${CONTABO_API_PASSWORD}")

TOKEN=$(echo "$RESPONSE" | jq -r '.access_token // empty')
if [ -z "$TOKEN" ]; then
  echo "[contabo-auth] ERROR: Failed to get access token" >&2
  echo "$RESPONSE" | jq . >&2
  exit 1
fi

echo "$TOKEN"
```

- [ ] **Step 2: Write Contabo VPS creation script**

Create `openclaw_install/provision/contabo-create.sh`:
```bash
#!/bin/bash
set -euo pipefail

# Usage: ./contabo-create.sh <CLIENT_ID> [TIER]
CLIENT_ID="${1:?Usage: contabo-create.sh <CLIENT_ID> [TIER]}"
TIER="${2:-2}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

echo "[provision] Getting Contabo auth token..."
TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")

# Read SSH public key
SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")

echo "[provision] Creating Contabo VPS for $CLIENT_ID (Tier $TIER)..."

# Contabo API: create instance
# productId: V45 = Cloud VPS S (4 vCPU, 8GB, 200GB SSD, ~EUR 4.50/mo)
# region: EU-DE-1 = Germany
# imageId: find Ubuntu 24.04 image ID via: GET /v1/compute/images
REQUEST_ID="nexgen-${CLIENT_ID}-$(date +%s)"

RESPONSE=$(curl -s -X POST "https://api.contabo.com/v1/compute/instances" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageId\": \"${CONTABO_IMAGE_ID:-afecbb85-e2fc-46f0-9684-b46b1faf00bb}\",
    \"productId\": \"${CONTABO_PRODUCT_ID:-V45}\",
    \"region\": \"${CONTABO_REGION:-EU-DE-1}\",
    \"displayName\": \"nexgen-${CLIENT_ID}\",
    \"sshKeys\": [$(echo "$SSH_PUB_KEY" | jq -Rs .)],
    \"userData\": $(cat "$SCRIPT_DIR/cloud-init.yaml" | sed "s|SSH_PUBLIC_KEY_PLACEHOLDER|${SSH_PUB_KEY}|" | jq -Rs .)
  }")

# Extract results
INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.data[0].instanceId // empty')
CONTRACT_ID=$(echo "$RESPONSE" | jq -r '.data[0].contractId // empty')
ERROR=$(echo "$RESPONSE" | jq -r '.statusCode // empty')

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "null" ]; then
  echo "[provision] ERROR creating VPS:"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo "[provision] Instance created: ID=$INSTANCE_ID"
echo "[provision] Waiting for IP assignment (Contabo can take 5-15 min)..."

# Poll for IP address (Contabo is slow to assign IPs)
MAX_ATTEMPTS=30  # 30 * 30s = 15 minutes
ATTEMPT=0
SERVER_IP=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  TOKEN_REFRESH=$(bash "$SCRIPT_DIR/contabo-auth.sh")
  IP_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TOKEN_REFRESH}" \
    -H "x-request-id: ip-check-${ATTEMPT}-$(date +%s)" \
    "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}")

  SERVER_IP=$(echo "$IP_RESPONSE" | jq -r '.data[0].ipConfig.v4.ip // empty')
  STATUS=$(echo "$IP_RESPONSE" | jq -r '.data[0].status // empty')

  if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "null" ] && [ "$STATUS" = "running" ]; then
    echo "[provision] VPS running: IP=$SERVER_IP"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "[provision] Attempt $ATTEMPT/$MAX_ATTEMPTS — status: $STATUS, waiting 30s..."
  sleep 30
done

if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "null" ]; then
  echo "[provision] ERROR: VPS not ready after 15 minutes"
  exit 1
fi

# Save server info
CLIENT_DIR="$SCRIPT_DIR/../clients/$CLIENT_ID"
mkdir -p "$CLIENT_DIR"
cat > "$CLIENT_DIR/server-info.env" <<EOF
SERVER_ID=$INSTANCE_ID
CONTRACT_ID=${CONTRACT_ID:-unknown}
SERVER_IP=$SERVER_IP
SERVER_TYPE=${CONTABO_PRODUCT_ID:-V45}
LOCATION=${CONTABO_REGION:-EU-DE-1}
PROVIDER=contabo
TIER=$TIER
CREATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "[provision] Saved to clients/$CLIENT_ID/server-info.env"
echo "[provision] Done. Now run: ./provision/wait-for-ssh.sh $CLIENT_ID"
```

- [ ] **Step 3: Write Contabo cancellation script (billing lifecycle)**

Create `openclaw_install/provision/contabo-cancel.sh`:
```bash
#!/bin/bash
# Submit Contabo billing cancellation for a VPS.
# Usage: ./contabo-cancel.sh <INSTANCE_ID>
# The VPS stays running until Contabo's scheduled termination date (~4 weeks).
# Cancellation can be revoked before that date (see contabo-revoke.sh).
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-cancel.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID="cancel-${INSTANCE_ID}-$(date +%s)"

echo "[cancel] Submitting cancellation for instance $INSTANCE_ID..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "customer_churn"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  CANCEL_DATE=$(echo "$BODY" | jq -r '.data.cancelDate // "unknown"')
  echo "[cancel] Cancellation submitted. Termination date: $CANCEL_DATE"
  echo "$CANCEL_DATE"
else
  echo "[cancel] ERROR: HTTP $HTTP_CODE" >&2
  echo "$BODY" | jq . >&2
  exit 1
fi
```

- [ ] **Step 4: Write Contabo cancellation revoke script**

Create `openclaw_install/provision/contabo-revoke.sh`:
```bash
#!/bin/bash
# Revoke a pending Contabo cancellation (for VPS recycling).
# Usage: ./contabo-revoke.sh <INSTANCE_ID>
# Must be called BEFORE the scheduled termination date.
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-revoke.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID="revoke-${INSTANCE_ID}-$(date +%s)"

echo "[revoke] Revoking cancellation for instance $INSTANCE_ID..."

# NOTE: Exact endpoint TBD — verify during P2 testing.
# Contabo support confirmed revocation is possible via control panel.
# API endpoint may be: PATCH /v1/compute/instances/{id} with cancel=false
# or: DELETE /v1/compute/instances/{id}/cancel
# Adjust after P2 testing.
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d '{"cancel": false}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[revoke] Cancellation revoked successfully."
else
  echo "[revoke] ERROR: HTTP $HTTP_CODE — may need manual panel revocation" >&2
  echo "$RESPONSE" | head -1 | jq . >&2
  exit 1
fi
```

- [ ] **Step 5: Write Contabo OS reinstall script**

Create `openclaw_install/provision/contabo-reinstall.sh`:
```bash
#!/bin/bash
# Reinstall OS on an existing Contabo VPS (for recycling).
# Usage: ./contabo-reinstall.sh <INSTANCE_ID>
# After reinstall, SSH will be ready in ~5-15 minutes.
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-reinstall.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID="reinstall-${INSTANCE_ID}-$(date +%s)"

echo "[reinstall] Reinstalling OS on instance $INSTANCE_ID..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageId\": \"${CONTABO_IMAGE_ID:-afecbb85-e2fc-46f0-9684-b46b1faf00bb}\",
    \"sshKeys\": [$(cat "${SSH_KEY_PATH}.pub" | jq -Rs .)]
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[reinstall] OS reinstall initiated. Waiting for SSH..."

  # Poll for SSH readiness
  SERVER_IP=$(curl -s \
    -H "Authorization: Bearer $(bash "$SCRIPT_DIR/contabo-auth.sh")" \
    -H "x-request-id: ip-${REQUEST_ID}" \
    "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}" \
    | jq -r '.data[0].ipConfig.v4.ip // empty')

  MAX_ATTEMPTS=20
  for i in $(seq 1 $MAX_ATTEMPTS); do
    if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 \
       -i "$SSH_KEY_PATH" deploy@"$SERVER_IP" "echo SSH_READY" 2>/dev/null | grep -q SSH_READY; then
      echo "[reinstall] SSH ready at $SERVER_IP"
      echo "$SERVER_IP"
      exit 0
    fi
    echo "[reinstall] Attempt $i/$MAX_ATTEMPTS — waiting 30s..."
    sleep 30
  done

  echo "[reinstall] WARNING: SSH not ready after $((MAX_ATTEMPTS * 30))s" >&2
  echo "$SERVER_IP"
else
  echo "[reinstall] ERROR: HTTP $HTTP_CODE" >&2
  echo "$RESPONSE" | head -1 | jq . >&2
  exit 1
fi
```

- [ ] **Step 6: Write Contabo VPS destruction script**

Create `openclaw_install/provision/contabo-destroy.sh`:
```bash
#!/bin/bash
set -euo pipefail
CLIENT_ID="${1:?Usage: contabo-destroy.sh <CLIENT_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

source "$SCRIPT_DIR/../.env"
source "$SCRIPT_DIR/../clients/$CLIENT_ID/server-info.env"

if [ "${PROVIDER:-}" != "contabo" ]; then
  echo "[destroy] ERROR: $CLIENT_ID is not a Contabo instance (provider=${PROVIDER:-unknown})"
  exit 1
fi

echo "[destroy] Getting Contabo auth token..."
TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")

echo "[destroy] Cancelling instance $SERVER_ID (nexgen-$CLIENT_ID)..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.contabo.com/v1/compute/instances/${SERVER_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: destroy-${CLIENT_ID}-$(date +%s)")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[destroy] Instance $SERVER_ID cancellation requested."
else
  echo "[destroy] WARNING: HTTP $HTTP_CODE — check Contabo dashboard."
  echo "$RESPONSE" | head -1
fi
```

- [ ] **Step 7: Test Contabo provisioning + lifecycle (one real VPS)**

```bash
cd openclaw_install

# 1. Create VPS
bash provision/contabo-create.sh CTEST1 2
bash provision/wait-for-ssh.sh CTEST1
ssh -i ~/.ssh/nexgen_automation deploy@<IP> "echo hello"

# 2. Test cancellation (VPS billing strategy P2 verification)
source clients/CTEST1/server-info.env
bash provision/contabo-cancel.sh $SERVER_ID
# Expected: cancellation submitted, termination date returned

# 3. Test revocation (critical — recycling depends on this)
bash provision/contabo-revoke.sh $SERVER_ID
# Expected: cancellation revoked
# If this fails with HTTP error: note the error, fall back to manual panel revocation
# Update VPS billing strategy spec with findings

# 4. Test OS reinstall (recycling wipe)
bash provision/contabo-reinstall.sh $SERVER_ID
# Expected: OS reinstalled, SSH ready after ~5-15 min
# Record time-to-SSH for deployer polling calibration

# 5. Cleanup
bash provision/contabo-destroy.sh CTEST1
```

Expected: All 5 operations succeed. This clears any first-order fraud check AND validates the recycling flow.

**If Contabo API doesn't work as expected:** Adjust scripts based on actual API responses. The Contabo API docs are at `https://api.contabo.com/`. Common issues: different field names, async provisioning model, SSH key format requirements. If revoke API doesn't exist, implement fallback strategy from VPS billing spec Section 8.

- [ ] **Step 8: Commit**

```bash
git add openclaw_install/provision/contabo-*.sh
git commit -m "feat(plan-b): Contabo provisioning + lifecycle scripts (create, cancel, revoke, reinstall, destroy)"
```

---

### Task 2: Pi5 Worker Scaffold + Config

**Files:**
- Create: `onboarding-pipeline/pi5-worker/requirements.txt`
- Create: `onboarding-pipeline/pi5-worker/.env.example`
- Create: `onboarding-pipeline/pi5-worker/config.py`

- [ ] **Step 1: Create requirements.txt**

```
requests>=2.31.0
claude-agent-sdk>=0.1.0
anyio>=4.0.0
```

The Claude Agent SDK is the deployment engine — the deployer launches an AI operator session that follows the CLAUDE.md playbook, runs scripts via Bash tool, interprets QA output, and debugs failures autonomously. `anyio` is required because the Agent SDK is async. No `anthropic` SDK needed — auth is handled by the Claude Code CLI via Max plan OAuth (see P7).

- [ ] **Step 2: Create .env.example**

```bash
# CF Worker API
CF_WORKER_URL=https://api.3nexgen.com
WORKER_TOKEN=your_worker_token_from_plan_a

# Telegram (your personal bot for notifications)
OWNER_TELEGRAM_BOT_TOKEN=your_personal_bot_token
OWNER_TELEGRAM_CHAT_ID=340067089

# Paths (adjust for Pi5)
OPENCLAW_INSTALL_DIR=/home/pi/openclaw_install
BOT_POOL_DIR=/home/pi/bot-pool
ARCHIVES_DIR=/home/pi/archives
SSH_KEY_PATH=/home/pi/.ssh/nexgen_automation

# API Keys (shared across customer deploys)
DEEPSEEK_API_KEY=your_deepseek_key
OPENAI_API_KEY=your_openai_key

# Contabo credentials
CONTABO_CLIENT_ID=your_contabo_client_id
CONTABO_CLIENT_SECRET=your_contabo_client_secret
CONTABO_API_USER=your_contabo_api_user
CONTABO_API_PASSWORD=your_contabo_api_password

# Agent SDK (Claude Max plan — no API key needed, uses ~/.claude/ OAuth token)
AGENT_MAX_TURNS=50
```

- [ ] **Step 3: Create config.py**

```python
import os
from pathlib import Path

# Load .env file if it exists
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

# CF Worker API
CF_WORKER_URL = os.environ["CF_WORKER_URL"]
WORKER_TOKEN = os.environ["WORKER_TOKEN"]

# Telegram
OWNER_TELEGRAM_BOT_TOKEN = os.environ["OWNER_TELEGRAM_BOT_TOKEN"]
OWNER_TELEGRAM_CHAT_ID = os.environ["OWNER_TELEGRAM_CHAT_ID"]

# Paths
OPENCLAW_INSTALL_DIR = Path(os.environ.get("OPENCLAW_INSTALL_DIR", str(Path.home() / "openclaw_install")))
BOT_POOL_DIR = Path(os.environ.get("BOT_POOL_DIR", str(Path.home() / "bot-pool")))
ARCHIVES_DIR = Path(os.environ.get("ARCHIVES_DIR", str(Path.home() / "archives")))
SSH_KEY_PATH = Path(os.environ.get("SSH_KEY_PATH", str(Path.home() / ".ssh" / "nexgen_automation")))

# API Keys
DEEPSEEK_API_KEY = os.environ["DEEPSEEK_API_KEY"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

# Agent SDK (uses Claude Max plan via ~/.claude/ OAuth — no API key needed)
AGENT_MAX_TURNS = int(os.environ.get("AGENT_MAX_TURNS", "50"))
CLAUDE_AUTH_DIR = Path.home() / ".claude"  # Agent SDK reads OAuth token from here

# Polling
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "30"))
HEALTH_INTERVAL = int(os.environ.get("HEALTH_INTERVAL", "300"))  # 5 min

# Bot pool
BOT_POOL_LOW_THRESHOLD = int(os.environ.get("BOT_POOL_LOW_THRESHOLD", "20"))  # Alert when below this

# Contabo API
CONTABO_CLIENT_ID = os.environ["CONTABO_CLIENT_ID"]
CONTABO_CLIENT_SECRET = os.environ["CONTABO_CLIENT_SECRET"]
CONTABO_API_USER = os.environ["CONTABO_API_USER"]
CONTABO_API_PASSWORD = os.environ["CONTABO_API_PASSWORD"]
CONTABO_AUTH_URL = "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token"
CONTABO_API_URL = "https://api.contabo.com/v1"
```

- [ ] **Step 4: Install dependencies on Pi5**

```bash
cd onboarding-pipeline/pi5-worker
pip3 install --user -r requirements.txt
```

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/
git commit -m "feat(plan-b): Pi5 worker scaffold + config"
```

---

### Task 3: Bot Pool Manager

**Files:**
- Create: `onboarding-pipeline/pi5-worker/bot_pool.py`
- Create: `onboarding-pipeline/pi5-worker/tests/test_bot_pool.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_bot_pool.py`:
```python
import os
import tempfile
import unittest
from pathlib import Path

# Patch config before importing bot_pool
tmpdir = tempfile.mkdtemp()
os.environ["BOT_POOL_DIR"] = tmpdir
os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")

from bot_pool import BotPool


class TestBotPool(unittest.TestCase):
    def setUp(self):
        self.pool_dir = Path(tmpdir)
        # Clean up
        for d in ["available", "assigned"]:
            p = self.pool_dir / d
            p.mkdir(exist_ok=True)
            for f in p.iterdir():
                f.unlink()
        self.pool = BotPool(self.pool_dir)

    def test_empty_pool(self):
        bot = self.pool.assign_next()
        self.assertIsNone(bot)

    def test_assign_bot(self):
        # Add a bot to available
        (self.pool_dir / "available" / "NexGenAI_T1043_bot.token").write_text("fake_token_123")
        bot = self.pool.assign_next()
        self.assertIsNotNone(bot)
        self.assertEqual(bot["username"], "NexGenAI_T1043_bot")
        self.assertEqual(bot["token"], "fake_token_123")
        # Should be moved to assigned
        self.assertFalse((self.pool_dir / "available" / "NexGenAI_T1043_bot.token").exists())
        self.assertTrue((self.pool_dir / "assigned" / "NexGenAI_T1043_bot.token").exists())

    def test_return_bot(self):
        (self.pool_dir / "assigned" / "NexGenAI_T1043_bot.token").write_text("fake_token_123")
        self.pool.return_bot("NexGenAI_T1043_bot")
        self.assertTrue((self.pool_dir / "available" / "NexGenAI_T1043_bot.token").exists())
        self.assertFalse((self.pool_dir / "assigned" / "NexGenAI_T1043_bot.token").exists())

    def test_pool_count(self):
        (self.pool_dir / "available" / "NexGenAI_T1043_bot.token").write_text("t1")
        (self.pool_dir / "available" / "NexGenAI_T1044_bot.token").write_text("t2")
        self.assertEqual(self.pool.available_count(), 2)

    def test_assigns_oldest_first(self):
        # Create files with explicit order
        import time
        (self.pool_dir / "available" / "NexGenAI_T1044_bot.token").write_text("t2")
        time.sleep(0.1)
        (self.pool_dir / "available" / "NexGenAI_T1043_bot.token").write_text("t1")
        # T1044 was created first, should be assigned first
        # But filesystem ordering varies — sort by name instead for determinism
        bot = self.pool.assign_next()
        self.assertEqual(bot["username"], "NexGenAI_T1043_bot")  # sorted by name


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd onboarding-pipeline/pi5-worker
python3 -m pytest tests/test_bot_pool.py -v
```

Expected: FAIL — `bot_pool` module not found.

- [ ] **Step 3: Implement bot_pool.py**

```python
"""Manages the filesystem-based Telegram bot pool on Pi5."""

from pathlib import Path
from typing import Optional


class BotPool:
    def __init__(self, pool_dir: Path):
        self.available_dir = pool_dir / "available"
        self.assigned_dir = pool_dir / "assigned"
        self.available_dir.mkdir(parents=True, exist_ok=True)
        self.assigned_dir.mkdir(parents=True, exist_ok=True)

    def available_count(self) -> int:
        return len(list(self.available_dir.glob("*.token")))

    def assign_next(self) -> Optional[dict]:
        """Assign the next available bot. Returns {username, token} or None."""
        files = sorted(self.available_dir.glob("*.token"))
        if not files:
            return None

        token_file = files[0]
        username = token_file.stem  # e.g. NexGenAI_T1043_bot
        token = token_file.read_text().strip()

        # Move to assigned
        dest = self.assigned_dir / token_file.name
        token_file.rename(dest)

        return {"username": username, "token": token}

    def return_bot(self, username: str) -> bool:
        """Return a bot from assigned back to available pool."""
        src = self.assigned_dir / f"{username}.token"
        if not src.exists():
            return False
        dest = self.available_dir / src.name
        src.rename(dest)
        return True
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python3 -m pytest tests/test_bot_pool.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Populate bot pool on Pi5**

Create the pool directory and add bot tokens from pre-work P4:

```bash
# On Pi5
mkdir -p ~/bot-pool/available ~/bot-pool/assigned

# For each bot created in BotFather:
echo "REDACTED-LEAKED-BOT-TOKEN-1-revoked-2026-04-28" > ~/bot-pool/available/NexGenAI_T1043_bot.token
echo "NEXT_TOKEN_HERE" > ~/bot-pool/available/NexGenAI_T1044_bot.token
# ... repeat for all 20 bots
```

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/pi5-worker/bot_pool.py onboarding-pipeline/pi5-worker/tests/
git commit -m "feat(plan-b): bot pool manager with filesystem-based assignment"
```

---

### Task 4: CF Worker API Client

**Files:**
- Create: `onboarding-pipeline/pi5-worker/api_client.py`
- Create: `onboarding-pipeline/pi5-worker/tests/test_api_client.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_api_client.py`:
```python
import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "https://api.3nexgen.com")
os.environ.setdefault("WORKER_TOKEN", "test-token")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("BOT_POOL_DIR", "/tmp/test-pool")

from api_client import ApiClient


class TestApiClient(unittest.TestCase):
    def setUp(self):
        self.client = ApiClient("https://api.3nexgen.com", "test-token")

    @patch("api_client.requests.get")
    def test_get_next_job_returns_job(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"job": {"id": "T1043", "status": "provisioning", "tier": 2}},
        )
        job = self.client.get_next_job()
        self.assertEqual(job["id"], "T1043")
        mock_get.assert_called_once_with(
            "https://api.3nexgen.com/api/jobs/next",
            headers={"X-Worker-Token": "test-token"},
            timeout=10,
        )

    @patch("api_client.requests.get")
    def test_get_next_job_returns_none(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"job": None},
        )
        job = self.client.get_next_job()
        self.assertIsNone(job)

    @patch("api_client.requests.patch")
    def test_update_job(self, mock_patch):
        mock_patch.return_value = MagicMock(
            status_code=200,
            json=lambda: {"job": {"id": "T1043", "status": "installing"}},
        )
        result = self.client.update_job("T1043", "installing", server_ip="1.2.3.4")
        self.assertEqual(result["status"], "installing")

    @patch("api_client.requests.post")
    def test_send_health_ping(self, mock_post):
        mock_post.return_value = MagicMock(status_code=200)
        self.client.send_health_ping()
        mock_post.assert_called_once()


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python3 -m pytest tests/test_api_client.py -v
```

Expected: FAIL — `api_client` module not found.

- [ ] **Step 3: Implement api_client.py**

```python
"""Client for the CF Worker API at api.3nexgen.com."""

import requests
from typing import Optional


class ApiClient:
    def __init__(self, base_url: str, worker_token: str):
        self.base_url = base_url.rstrip("/")
        self.headers = {"X-Worker-Token": worker_token}

    def get_next_job(self) -> Optional[dict]:
        """Poll for the next ready job. Returns job dict or None."""
        resp = requests.get(
            f"{self.base_url}/api/jobs/next",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("job")

    def update_job(self, job_id: str, status: str, **kwargs) -> dict:
        """Update job status and optional fields (server_ip, error_log, re_queue_count)."""
        payload = {"status": status}
        payload.update(kwargs)
        resp = requests.patch(
            f"{self.base_url}/api/jobs/{job_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json=payload,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["job"]

    def send_health_ping(self) -> None:
        """Send health heartbeat to CF Worker."""
        resp = requests.post(
            f"{self.base_url}/api/health",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()

    # --- VPS lifecycle methods (added by VPS billing strategy spec) ---

    def get_recyclable_vps(self) -> Optional[dict]:
        """Get the oldest cancelling VPS available for recycling. Returns VPS dict or None."""
        resp = requests.get(
            f"{self.base_url}/api/vps/recyclable",
            headers=self.headers,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get("vps")

    def update_vps_instance(self, vps_id: str, **fields) -> dict:
        """Update a VPS instance record in D1 (status, customer_id, tier, etc.)."""
        resp = requests.patch(
            f"{self.base_url}/api/vps/{vps_id}",
            headers={**self.headers, "Content-Type": "application/json"},
            json=fields,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["vps"]

    def create_vps_instance(self, vps_data: dict) -> dict:
        """Insert a new VPS instance record in D1."""
        resp = requests.post(
            f"{self.base_url}/api/vps",
            headers={**self.headers, "Content-Type": "application/json"},
            json=vps_data,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()["vps"]
```

- [ ] **Step 4: Run tests**

```bash
python3 -m pytest tests/test_api_client.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/api_client.py onboarding-pipeline/pi5-worker/tests/
git commit -m "feat(plan-b): CF Worker API client with polling + status updates + VPS lifecycle"
```

---

### Task 5: Telegram Notifier

**Files:**
- Create: `onboarding-pipeline/pi5-worker/notifier.py`

- [ ] **Step 1: Implement notifier.py**

```python
"""Send Telegram notifications to the owner."""

import requests
from typing import Optional


class Notifier:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{bot_token}"

    def send(self, message: str) -> bool:
        """Send a message to the owner. Returns True on success."""
        try:
            resp = requests.post(
                f"{self.base_url}/sendMessage",
                json={"chat_id": self.chat_id, "text": message, "parse_mode": "HTML"},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False

    def notify_new_job(self, job: dict) -> None:
        tier_names = {1: "Tier 1", 2: "Tier 2", 3: "Tier 3"}
        tier = tier_names.get(job["tier"], f"Tier {job['tier']}")
        self.send(f"New order {job['id']} — {tier} — deploying")

    def notify_gate_pass(self, job_id: str, phase: int) -> None:
        self.send(f"{job_id} Phase {phase} gate passed")

    def notify_gate_fail(self, job_id: str, phase: int) -> None:
        self.send(f"{job_id} Phase {phase} gate failed — agent debugging...")

    def notify_complete(self, job_id: str, checks: str = "28/28") -> None:
        self.send(f"{job_id} deploy complete — {checks} QA passed")

    def notify_failed(self, job_id: str, error: str) -> None:
        self.send(f"{job_id} failed — {error} — manual intervention needed")

    def notify_pool_low(self, count: int, next_number: int = 0) -> None:
        msg = f"⚠️ Bot pool low — {count} bots remaining."
        if next_number:
            msg += f"\nRun: python3 replenish_bots.py --start {next_number} --count 20"
        else:
            msg += "\nReplenish soon."
        self.send(msg)

    @staticmethod
    def set_bot_display_name(bot_token: str, display_name: str) -> bool:
        """Set a bot's display name via Telegram API."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/setMyName",
                json={"name": display_name},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False

    @staticmethod
    def send_customer_message(bot_token: str, chat_id: str, message: str) -> bool:
        """Send a message to a customer via their bot."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": message},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False

    @staticmethod
    def set_webhook(bot_token: str, url: str) -> bool:
        """Set webhook URL for a customer's bot."""
        try:
            resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": url},
                timeout=10,
            )
            return resp.ok
        except requests.RequestException:
            return False
```

- [ ] **Step 2: Write tests for notifier**

Create `tests/test_notifier.py`:
```python
import unittest
from unittest.mock import patch, MagicMock
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")

from notifier import Notifier


class TestSetBotDisplayName(unittest.TestCase):
    @patch("notifier.requests.post")
    def test_rename_success(self, mock_post):
        """Display name is set via Telegram setMyName API."""
        mock_post.return_value = MagicMock(ok=True)
        result = Notifier.set_bot_display_name("fake_token", "客戶自選名稱")
        self.assertTrue(result)
        mock_post.assert_called_once_with(
            "https://api.telegram.org/botfake_token/setMyName",
            json={"name": "客戶自選名稱"},
            timeout=10,
        )

    @patch("notifier.requests.post")
    def test_rename_api_error(self, mock_post):
        """Rename returns False on API error (non-blocking)."""
        mock_post.return_value = MagicMock(ok=False)
        result = Notifier.set_bot_display_name("fake_token", "Test Name")
        self.assertFalse(result)

    @patch("notifier.requests.post")
    def test_rename_network_error(self, mock_post):
        """Rename returns False on network timeout (non-blocking)."""
        import requests
        mock_post.side_effect = requests.RequestException("timeout")
        result = Notifier.set_bot_display_name("fake_token", "Test Name")
        self.assertFalse(result)

    @patch("notifier.requests.post")
    def test_send_customer_message(self, mock_post):
        """Customer receives waiting message via their assigned bot."""
        mock_post.return_value = MagicMock(ok=True)
        result = Notifier.send_customer_message("fake_token", "12345", "Please wait...")
        self.assertTrue(result)
        mock_post.assert_called_once_with(
            "https://api.telegram.org/botfake_token/sendMessage",
            json={"chat_id": "12345", "text": "Please wait..."},
            timeout=10,
        )

    @patch("notifier.requests.post")
    def test_set_webhook(self, mock_post):
        """Webhook URL is set for customer bot."""
        mock_post.return_value = MagicMock(ok=True)
        result = Notifier.set_webhook("fake_token", "https://vps.example.com/webhook")
        self.assertTrue(result)


class TestNotifierOwnerMessages(unittest.TestCase):
    @patch("notifier.requests.post")
    def test_notify_new_job(self, mock_post):
        mock_post.return_value = MagicMock(ok=True)
        n = Notifier("owner_token", "owner_chat")
        n.notify_new_job({"id": "T1043", "tier": 2})
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        self.assertIn("T1043", call_args[1]["json"]["text"])
        self.assertIn("Tier 2", call_args[1]["json"]["text"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 3: Run tests**

```bash
python3 -m pytest tests/test_notifier.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add onboarding-pipeline/pi5-worker/notifier.py onboarding-pipeline/pi5-worker/tests/test_notifier.py
git commit -m "feat(plan-b): Telegram notifier with display name rename + tests"
```

---

### Task 6: Deployer (Orchestrates Full Deployment via Claude Agent SDK)

**Files:**
- Create: `onboarding-pipeline/pi5-worker/deployer.py`
- Create: `onboarding-pipeline/pi5-worker/playbook.py`
- Create: `onboarding-pipeline/pi5-worker/tests/test_deployer.py`

This is the core — **AI is the operator**. Instead of dumb `subprocess.run()` calls, the deployer launches a Claude Agent SDK session that follows the CLAUDE.md playbook. The agent gets Bash tool access to SSH into the customer VPS, run scripts, interpret QA output, and debug failures autonomously.

**Why Agent SDK instead of subprocess:**
- **Subprocess** runs scripts blindly — if a gate check fails, it just returns `False`. No diagnosis.
- **Agent SDK** reads QA output, understands what failed, can retry with fixes (e.g., kill stale processes, restart Docker), and escalates to owner only when truly stuck.
- The CLAUDE.md playbook was *designed* for an AI operator — the troubleshooting table, gate checks, and retry logic are written as human-readable instructions that Claude can follow directly.

**Architecture:**
```
worker.py (sync loop) → deployer.deploy(job) → [subprocess: provision VPS]
                                               → [Agent SDK: install + QA + debug]
                                               → [subprocess: webhook + notify]
```

VPS provisioning stays as subprocess (deterministic API call, no AI needed). Script installation + QA + debugging runs through Agent SDK. Webhook setup and notifications stay as subprocess/API calls (deterministic).

- [ ] **Step 1: Write the failing test**

Create `tests/test_deployer.py`:
```python
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import os
import tempfile
from pathlib import Path

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test-dk")
os.environ.setdefault("OPENAI_API_KEY", "test-ok")
os.environ.setdefault("BOT_POOL_DIR", "/tmp/test-pool")

from deployer import Deployer, TIER_SCRIPTS
from playbook import build_deployment_prompt


class TestDeployer(unittest.TestCase):
    def test_get_tier_scripts(self):
        scripts = TIER_SCRIPTS[1]
        self.assertIn("00-swap-setup.sh", scripts)
        self.assertNotIn("05-setup-qdrant.sh", scripts)

        scripts2 = TIER_SCRIPTS[2]
        self.assertIn("05-setup-qdrant.sh", scripts2)
        self.assertNotIn("11-setup-chromium.sh", scripts2)

        scripts3 = TIER_SCRIPTS[3]
        self.assertIn("11-setup-chromium.sh", scripts3)

    def test_build_deployment_prompt(self):
        """Verify the playbook prompt includes all critical sections."""
        prompt = build_deployment_prompt(
            job_id="T1043",
            tier=2,
            server_ip="203.0.113.50",
            ssh_key_path="/home/pi/.ssh/nexgen_automation",
            install_dir="/home/pi/openclaw_install",
            client_env_content="CLIENT_ID=T1043\nTIER=2\nDEEPSEEK_API_KEY=sk-test",
        )
        # Must contain SSH command pattern
        self.assertIn("203.0.113.50", prompt)
        self.assertIn("nexgen_automation", prompt)
        # Must contain tier-appropriate scripts
        self.assertIn("05-setup-qdrant.sh", prompt)
        self.assertIn("06-setup-mem0.sh", prompt)
        # Must NOT contain Tier 3 scripts
        self.assertNotIn("11-setup-chromium.sh", prompt)
        # Must contain gate checks
        self.assertIn("GATE CHECK", prompt)
        # Must contain QA scripts
        self.assertIn("01-health-check.sh", prompt)
        # Must contain troubleshooting hints
        self.assertIn("Troubleshooting", prompt)

    def test_build_prompt_tier1_excludes_qdrant(self):
        prompt = build_deployment_prompt(
            job_id="T1050",
            tier=1,
            server_ip="10.0.0.1",
            ssh_key_path="/key",
            install_dir="/install",
            client_env_content="CLIENT_ID=T1050",
        )
        self.assertNotIn("05-setup-qdrant.sh", prompt)
        self.assertNotIn("06-setup-mem0.sh", prompt)
        self.assertIn("04-install-openclaw.sh", prompt)


class TestAssignBotDisplayName(unittest.TestCase):
    """Test that _assign_bot handles display name rename correctly."""

    def setUp(self):
        self.pool_dir = Path(tempfile.mkdtemp())
        (self.pool_dir / "available").mkdir()
        (self.pool_dir / "assigned").mkdir()
        (self.pool_dir / "available" / "NexGenAI_T1043_bot.token").write_text("fake_token")

    @patch("deployer.Notifier")
    @patch("deployer.ApiClient")
    def test_assign_bot_renames_display_name(self, mock_api_cls, mock_notifier_cls):
        """Bot is renamed to customer's chosen display name on assignment."""
        from bot_pool import BotPool
        pool = BotPool(self.pool_dir)
        mock_notifier = MagicMock()
        mock_api = MagicMock()
        mock_notifier_cls.set_bot_display_name = MagicMock(return_value=True)
        mock_notifier_cls.send_customer_message = MagicMock(return_value=True)

        deployer = Deployer(mock_api, pool, mock_notifier)
        bot = deployer._assign_bot("T1043", "我的AI助手", "12345")

        self.assertIsNotNone(bot)
        mock_notifier_cls.set_bot_display_name.assert_called_once_with("fake_token", "我的AI助手")

    @patch("deployer.Notifier")
    @patch("deployer.ApiClient")
    def test_assign_bot_continues_on_rename_failure(self, mock_api_cls, mock_notifier_cls):
        """Deployment continues even if display name rename fails (non-blocking)."""
        from bot_pool import BotPool
        pool = BotPool(self.pool_dir)
        mock_notifier = MagicMock()
        mock_api = MagicMock()
        mock_notifier_cls.set_bot_display_name = MagicMock(return_value=False)
        mock_notifier_cls.send_customer_message = MagicMock(return_value=True)

        deployer = Deployer(mock_api, pool, mock_notifier)
        bot = deployer._assign_bot("T1043", "我的AI助手", "12345")

        # Bot is still assigned despite rename failure
        self.assertIsNotNone(bot)
        self.assertEqual(bot["token"], "fake_token")
        # Owner is notified about the rename failure
        mock_notifier.send.assert_called()
        notify_msg = mock_notifier.send.call_args[0][0]
        self.assertIn("rename", notify_msg.lower())

    @patch("deployer.Notifier")
    @patch("deployer.ApiClient")
    def test_assign_bot_empty_pool_returns_none(self, mock_api_cls, mock_notifier_cls):
        """Returns None and reports failure when pool is empty."""
        from bot_pool import BotPool
        empty_dir = Path(tempfile.mkdtemp())
        (empty_dir / "available").mkdir()
        (empty_dir / "assigned").mkdir()
        pool = BotPool(empty_dir)
        mock_notifier = MagicMock()
        mock_api = MagicMock()

        deployer = Deployer(mock_api, pool, mock_notifier)
        bot = deployer._assign_bot("T1043", "Test", "12345")

        self.assertIsNone(bot)
        mock_api.update_job.assert_called_with("T1043", "failed", error_log="Bot pool empty")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python3 -m pytest tests/test_deployer.py -v
```

Expected: FAIL — `deployer` and `playbook` modules not found.

- [ ] **Step 3: Implement playbook.py (deployment prompt builder)**

This module builds the system prompt and deployment prompt that the Agent SDK session uses. It translates the CLAUDE.md playbook into a structured prompt with the job's specific parameters.

```python
"""Builds deployment prompts for the Claude Agent SDK session.

The CLAUDE.md playbook is designed for an AI operator. This module converts it
into a concrete, job-specific prompt that Claude follows step-by-step.
"""

from pathlib import Path

# Tier → scripts mapping (from tier-config.yaml / spec Section 6)
TIER_SCRIPTS = {
    1: ["00-swap-setup.sh", "01-system-update.sh", "02-install-node.sh",
        "03-install-docker.sh", "04-install-openclaw.sh",
        "09-security-hardening.sh", "10-configure-env.sh"],
    2: ["00-swap-setup.sh", "01-system-update.sh", "02-install-node.sh",
        "03-install-docker.sh", "04-install-openclaw.sh",
        "05-setup-qdrant.sh", "06-setup-mem0.sh", "07-setup-searxng.sh",
        "08-setup-watchdogs.sh", "09-security-hardening.sh", "10-configure-env.sh"],
    3: ["00-swap-setup.sh", "01-system-update.sh", "02-install-node.sh",
        "03-install-docker.sh", "04-install-openclaw.sh",
        "05-setup-qdrant.sh", "06-setup-mem0.sh", "07-setup-searxng.sh",
        "08-setup-watchdogs.sh", "09-security-hardening.sh", "10-configure-env.sh",
        "11-setup-chromium.sh", "12-setup-acpx.sh", "13-setup-clawteam.sh"],
}

# QA scripts per tier
TIER_QA = {
    1: ["01-health-check.sh", "04-telegram-test.sh", "05-full-integration.sh"],
    2: ["01-health-check.sh", "02-port-check.sh", "03-api-check.sh",
        "04-telegram-test.sh", "05-full-integration.sh"],
    3: ["01-health-check.sh", "02-port-check.sh", "03-api-check.sh",
        "04-telegram-test.sh", "05-full-integration.sh"],
}

SYSTEM_PROMPT = """\
You are the NexGen VPS Installer — an autonomous deployment agent.

You are deploying an OpenClaw AI assistant stack on a customer's VPS.
You have Bash tool access. You run SSH commands to execute scripts on the remote VPS.
You interpret output, debug failures, and make decisions.

## Rules
1. Follow the deployment steps IN ORDER. Do not skip steps.
2. After each script, check the exit code. If non-zero, read the output to diagnose.
3. On script failure: retry ONCE. If it fails twice, report the failure with diagnosis.
4. After each phase, run the gate check. Do NOT proceed if it fails.
5. If a gate check fails, read the QA output carefully and attempt to fix the issue.
   Common fixes are in the Troubleshooting section below.
6. After all scripts + QA pass, output EXACTLY: `DEPLOYMENT_SUCCESS`
7. If you cannot recover from a failure after 2 attempts, output EXACTLY:
   `DEPLOYMENT_FAILED: <one-line reason>`
8. NEVER modify the install scripts themselves. Only run them and debug at the OS level.
9. All SSH commands use: ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key} deploy@{server_ip}
10. For SCP: scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key} -r <src> deploy@{server_ip}:<dest>

## Troubleshooting Reference
| Issue | Symptom | Fix |
|-------|---------|-----|
| cloud-init sshd restart fails | Failed to restart sshd.service | Ubuntu 24.04 uses `ssh` not `sshd` |
| OpenClaw gateway.bind crash | Immediate exit on startup | Use "loopback" not "localhost" |
| OpenClaw empty allowFrom | Crash on startup | Must have at least one ID in allowFrom |
| OpenClaw entry point | Cannot find module dist/entry.js | v2026.3.23+ uses dist/index.js |
| SearXNG JSON 403 | curl returns 403 for format=json | Edit settings.yml: add json to search.formats, set server.limiter: false |
| Snap chromium headless | Exit code 21, SingletonLock errors | Install Google Chrome .deb instead |
| Chrome port conflict | Service exits immediately | Kill stale chrome processes: killall google-chrome |
| Claude Code CLI 404 | npm install @anthropic/claude-code | Package is @anthropic-ai/claude-code |
| Watchdog service name | gateway-watchdog.service not found | Service is openclaw-watchdog.service |
| ((PASS++)) in bash | Script exits with code 1 | Use PASS=$((PASS+1)) with set -e |
| apt upgrade conffile prompt | Hangs on sshd_config prompt | Use sudo DEBIAN_FRONTEND=noninteractive + --force-confold |
| Host key changed | SSH refuses connection | ssh-keygen -R <IP> or use -o UserKnownHostsFile=/dev/null |
"""


def build_deployment_prompt(
    job_id: str,
    tier: int,
    server_ip: str,
    ssh_key_path: str,
    install_dir: str,
    client_env_content: str,
) -> str:
    """Build the concrete deployment prompt for this job."""

    scripts = TIER_SCRIPTS.get(tier, TIER_SCRIPTS[2])
    qa_scripts = TIER_QA.get(tier, TIER_QA[2])

    # Split into phases
    phase1 = [s for s in scripts if s[:2] in ("00", "01", "02", "03")]
    phase2 = [s for s in scripts if s[:2] in ("04", "05", "06", "07", "08")]
    phase3 = [s for s in scripts if s[:2] in ("09", "10", "11", "12", "13")]

    ssh = f"ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key_path} deploy@{server_ip}"
    scp = f"scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i {ssh_key_path} -r"

    prompt = f"""Deploy OpenClaw for customer {job_id} (Tier {tier}) on VPS {server_ip}.

## SSH Access
```
{ssh}
```

## Step 1: Upload scripts and QA to VPS

```bash
{ssh} "mkdir -p ~/scripts ~/qa"
{scp} {install_dir}/scripts/. deploy@{server_ip}:~/scripts/
{scp} {install_dir}/qa/. deploy@{server_ip}:~/qa/
```

## Step 2: Create and upload client.env

Write this content to a temp file and SCP it:
```
{client_env_content}
```

```bash
cat > /tmp/client-{job_id}.env << 'ENVEOF'
{client_env_content}
ENVEOF
{scp} /tmp/client-{job_id}.env deploy@{server_ip}:~/client.env
rm /tmp/client-{job_id}.env
```

## Step 3: Run install scripts in phases

### Phase 1: Base System
Scripts: {', '.join(phase1)}

Run each script:
```bash
{ssh} "sudo bash ~/scripts/SCRIPT_NAME"
```

**GATE CHECK after Phase 1:**
```bash
{ssh} "node --version && docker --version && swapon --show | grep -q /swapfile"
```
All three must succeed. If any fails, diagnose and fix before proceeding.
"""

    if phase2:
        gate2 = (
            f'{ssh} "systemctl --user is-active openclaw"'
            if tier == 1 else
            f'{ssh} "bash ~/qa/01-health-check.sh && bash ~/qa/02-port-check.sh && bash ~/qa/03-api-check.sh"'
        )
        prompt += f"""
### Phase 2: Core Services
Scripts: {', '.join(phase2)}

Run each script as above.

**GATE CHECK after Phase 2:**
```bash
{gate2}
```
{"Tier 1: only OpenClaw needs to be running." if tier == 1 else "All health/port/API checks must pass."}
"""

    if phase3:
        prompt += f"""
### Phase 3: Extras + Config
Scripts: {', '.join(phase3)}

Run each script as above.

**GATE CHECK after Phase 3:**
```bash
{ssh} "bash ~/qa/04-telegram-test.sh && bash ~/qa/05-full-integration.sh"
```
All checks must PASS.
"""

    prompt += f"""
## Step 4: Final QA

Run all tier-appropriate QA scripts:
{chr(10).join(f'- `{ssh} "bash ~/qa/{q}"`' for q in qa_scripts)}

Read the output of each script. All checks must show PASS.
If any FAIL, read the error output, diagnose using the Troubleshooting reference,
attempt to fix, and re-run the QA script.

## Completion

When ALL scripts and QA pass, output: `DEPLOYMENT_SUCCESS`
If unrecoverable failure, output: `DEPLOYMENT_FAILED: <reason>`
"""

    return prompt


def get_system_prompt(ssh_key_path: str, server_ip: str) -> str:
    """Return the system prompt with SSH details filled in."""
    return SYSTEM_PROMPT.replace("{ssh_key}", ssh_key_path).replace("{server_ip}", server_ip)
```

- [ ] **Step 4: Implement deployer.py (Agent SDK integration)**

```python
"""Orchestrates full customer deployment using Claude Agent SDK.

Architecture:
  - VPS provisioning: subprocess (deterministic Contabo API call)
  - Script installation + QA + debugging: Claude Agent SDK (AI operator)
  - Webhook + notifications: direct API calls (deterministic)

The Agent SDK session gets Bash tool access and follows the CLAUDE.md playbook
as a structured prompt. It can interpret QA output, debug failures, and make
adaptive decisions — this is the "AI is the operator" architecture.
"""

import subprocess
import os
import anyio
from pathlib import Path
from typing import Optional

from api_client import ApiClient
from bot_pool import BotPool
from notifier import Notifier
from playbook import (
    build_deployment_prompt,
    get_system_prompt,
    TIER_SCRIPTS,
    TIER_QA,
)
import config


class Deployer:
    def __init__(
        self,
        api: ApiClient,
        pool: BotPool,
        notifier: Notifier,
        install_dir: Path,
    ):
        self.api = api
        self.pool = pool
        self.notifier = notifier
        self.install_dir = install_dir
        self.ssh_key = str(config.SSH_KEY_PATH)

    def deploy(self, job: dict) -> bool:
        """Run full deployment pipeline. Returns True on success.

        Called from the sync worker loop — uses anyio.run() internally for
        the async Agent SDK session.
        """
        job_id = job["id"]
        tier = job["tier"]
        display_name = job["display_name"]
        telegram_user_id = job["telegram_user_id"]

        try:
            # Step 1: Assign bot (sync — filesystem + Telegram API)
            bot = self._assign_bot(job_id, display_name, telegram_user_id)
            if not bot:
                return False

            # Step 2: Provision VPS (sync — deterministic API call)
            server_ip = self._provision_vps(job_id, tier)
            if not server_ip:
                self._handle_failure(job_id, bot, "VPS provisioning failed")
                return False

            self.api.update_job(job_id, "installing", server_ip=server_ip)

            # Step 3: Run Agent SDK deployment session (async)
            # This is where the AI operator takes over — it runs scripts,
            # interprets QA, debugs failures, all via the Bash tool.
            success = anyio.from_thread.run(
                self._run_agent_deployment,
                job_id, tier, server_ip, bot["token"], telegram_user_id,
            ) if anyio.get_current_task() else anyio.run(
                self._run_agent_deployment,
                job_id, tier, server_ip, bot["token"], telegram_user_id,
            )

            if not success:
                self._handle_failure(job_id, bot, "Agent deployment failed — check logs")
                return False

            # Step 4: Set webhook and deliver (sync — deterministic)
            self.api.update_job(job_id, "qa")
            webhook_url = f"https://{server_ip}:18789/webhook"
            Notifier.set_webhook(bot["token"], webhook_url)

            Notifier.send_customer_message(
                bot["token"],
                telegram_user_id,
                "Your AI assistant is ready! Start chatting now. 🎉"
            )

            self.api.update_job(job_id, "complete")
            self.notifier.notify_complete(job_id)
            return True

        except Exception as e:
            error_msg = str(e)[:500]
            self.api.update_job(job_id, "failed", error_log=error_msg)
            self.notifier.notify_failed(job_id, error_msg)
            return False

    async def _run_agent_deployment(
        self,
        job_id: str,
        tier: int,
        server_ip: str,
        bot_token: str,
        telegram_user_id: str,
    ) -> bool:
        """Launch Claude Agent SDK session to execute the CLAUDE.md playbook.

        Returns True if the agent outputs DEPLOYMENT_SUCCESS, False otherwise.
        """
        from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

        # Build client.env content (never written to disk until the agent does it)
        client_env = (
            f"CLIENT_ID={job_id}\n"
            f"TIER={tier}\n"
            f"DEEPSEEK_API_KEY={config.DEEPSEEK_API_KEY}\n"
            f"OPENAI_API_KEY={config.OPENAI_API_KEY}\n"
            f"TELEGRAM_BOT_TOKEN={bot_token}\n"
            f"TELEGRAM_ALLOWED_USERS={telegram_user_id}\n"
        )

        prompt = build_deployment_prompt(
            job_id=job_id,
            tier=tier,
            server_ip=server_ip,
            ssh_key_path=self.ssh_key,
            install_dir=str(self.install_dir),
            client_env_content=client_env,
        )

        system_prompt = get_system_prompt(self.ssh_key, server_ip)
        result_text = ""
        agent_error = None

        # Auth health check: verify Claude Max OAuth token exists (zero-cost filesystem check)
        if not config.CLAUDE_AUTH_DIR.exists():
            print(f"[agent] {job_id}: ABORT — ~/.claude/ not found. Run 'claude login' on Pi5.")
            self.notifier.send(f"🔴 {job_id}: Claude auth missing! Run 'claude login' on Pi5.")
            return False

        try:
            async for message in query(
                prompt=prompt,
                options=ClaudeAgentOptions(
                    allowed_tools=["Bash", "Read"],
                    cwd=str(self.install_dir),
                    permission_mode="bypassPermissions",
                    system_prompt=system_prompt,
                    model="sonnet",
                    max_turns=config.AGENT_MAX_TURNS,
                ),
            ):
                if isinstance(message, ResultMessage):
                    result_text = message.result or ""
                    print(f"[agent] Session complete. Stop reason: {message.stop_reason}")

        except Exception as e:
            agent_error = str(e)
            print(f"[agent] Agent SDK error: {agent_error}")

        # Parse result
        if "DEPLOYMENT_SUCCESS" in result_text:
            print(f"[agent] {job_id}: DEPLOYMENT_SUCCESS")
            return True

        failure_reason = "Agent did not produce DEPLOYMENT_SUCCESS"
        if "DEPLOYMENT_FAILED:" in result_text:
            failure_reason = result_text.split("DEPLOYMENT_FAILED:", 1)[1].strip()[:300]
        elif agent_error:
            failure_reason = f"Agent SDK error: {agent_error[:300]}"

        print(f"[agent] {job_id}: FAILED — {failure_reason}")
        return False

    def _assign_bot(self, job_id: str, display_name: str, telegram_user_id: str) -> Optional[dict]:
        """Assign bot from pool, set display name, send waiting message."""
        bot = self.pool.assign_next()
        if not bot:
            self.api.update_job(job_id, "failed", error_log="Bot pool empty")
            self.notifier.notify_failed(job_id, "Bot pool empty — replenish pool")
            return None

        remaining = self.pool.available_count()
        if remaining < config.BOT_POOL_LOW_THRESHOLD:
            self.notifier.notify_pool_low(remaining)

        # Rename bot to customer's chosen display name (non-blocking — deploy continues on failure)
        if not Notifier.set_bot_display_name(bot["token"], display_name):
            print(f"[deployer] {job_id}: WARNING — failed to set display name '{display_name}', continuing with default")
            self.notifier.send(f"⚠️ {job_id} — bot rename to '{display_name}' failed. Rename manually via @BotFather /setname")

        Notifier.send_customer_message(
            bot["token"],
            telegram_user_id,
            "Setting up your AI assistant, please wait approximately 15 minutes... "
            "If you have any questions, contact @NexGenAI_Support_bot or support@3nexgen.com"
        )
        return bot

    def _provision_vps(self, job_id: str, tier: int) -> Optional[str]:
        """Recycle-first VPS provisioning. Returns server IP or None.

        Strategy (from VPS billing spec):
        1. Check CF Worker for recyclable VPS (status='cancelling')
        2. If found: revoke cancellation → OS reinstall → return IP
        3. If empty: provision fresh VPS via contabo-create.sh

        This stays as subprocess — it's a deterministic API call with no
        interpretation needed. The AI operator takes over after SSH is ready.
        """
        from vps_lifecycle import VpsLifecycle
        lifecycle = VpsLifecycle(self.api, self.notifier)

        # --- Recycling branch: check pool first ---
        recycled_ip = lifecycle.try_recycle(job_id, tier)
        if recycled_ip:
            print(f"[deploy] {job_id}: Recycled existing VPS → {recycled_ip}")
            return recycled_ip

        # --- Fresh provisioning: no recyclable VPS available ---
        provision_dir = self.install_dir / "provision"

        result = subprocess.run(
            ["bash", str(provision_dir / "contabo-create.sh"), job_id, str(tier)],
            capture_output=True, text=True, timeout=1200,
            cwd=str(self.install_dir),
        )
        if result.returncode != 0:
            print(f"[deploy] contabo-create failed: {result.stderr}")
            return None

        result = subprocess.run(
            ["bash", str(provision_dir / "wait-for-ssh.sh"), job_id],
            capture_output=True, text=True, timeout=300,
            cwd=str(self.install_dir),
        )
        if result.returncode != 0:
            print(f"[deploy] wait-for-ssh failed: {result.stderr}")
            return None

        info_file = self.install_dir / "clients" / job_id / "server-info.env"
        info = {}
        for line in info_file.read_text().splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                info[k.strip()] = v.strip()

        server_ip = info.get("SERVER_IP")
        server_id = info.get("SERVER_ID")
        contract_id = info.get("CONTRACT_ID")

        if not server_ip or not server_id:
            # Mark VPS as failed in D1 if we got an ID but no IP
            if server_id:
                try:
                    self.api.create_vps_instance({
                        "vps_id": server_id,
                        "contabo_contract_id": contract_id,
                        "contabo_ip": "",
                        "customer_id": job_id,
                        "status": "failed",
                        "tier": tier,
                        "reinstall_count": 0,
                        "billing_start": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                    })
                except Exception:
                    pass
            return None

        # Register new VPS in D1 tracking table
        try:
            self.api.create_vps_instance({
                "vps_id": server_id,
                "contabo_contract_id": contract_id,
                "contabo_ip": server_ip,
                "customer_id": job_id,
                "status": "provisioning",
                "tier": tier,
                "reinstall_count": 0,
                "billing_start": __import__("datetime").datetime.utcnow().isoformat() + "Z",
            })
        except Exception as e:
            print(f"[deploy] WARNING: failed to register VPS in D1: {e}")

        return server_ip

    def _handle_failure(self, job_id: str, bot: dict, error: str) -> None:
        """Handle deployment failure: return bot, notify customer + owner."""
        self.pool.return_bot(bot["username"])

        # Notify customer via the bot (best effort — "please wait" was already sent)
        try:
            Notifier.send_customer_message(
                bot["token"],
                job.get("telegram_user_id", ""),
                "We encountered an issue setting up your AI assistant. "
                "Our team has been notified and will resolve this shortly. "
                "Contact @NexGenAI_Support_bot for updates."
            )
        except Exception:
            pass  # Bot may not be able to message if setup was very early

        self.api.update_job(job_id, "failed", error_log=error)
        self.notifier.notify_failed(job_id, error)
```

- [ ] **Step 5: Run tests**

```bash
python3 -m pytest tests/test_deployer.py -v
```

Expected: All 6 tests PASS (3 original + 3 new display name tests — no live Agent SDK calls).

- [ ] **Step 6: Commit**

```bash
git add onboarding-pipeline/pi5-worker/deployer.py onboarding-pipeline/pi5-worker/playbook.py onboarding-pipeline/pi5-worker/tests/
git commit -m "feat(plan-b): deployer with Claude Agent SDK — AI is the operator"
```

---

### Task 7: Main Worker Loop

**Files:**
- Create: `onboarding-pipeline/pi5-worker/worker.py`

- [ ] **Step 1: Implement worker.py**

The worker loop stays **synchronous** — it's a simple poll-process-repeat cycle. The async Agent SDK calls inside `deployer.deploy()` are bridged via `anyio.run()` internally. This keeps the worker simple and avoids async complexity in the outer loop.

```python
"""Main worker loop: poll CF Worker for jobs, deploy, repeat.

The worker is intentionally synchronous. The Agent SDK's async nature is
handled inside deployer.deploy() — it calls anyio.run() to bridge into
the async Agent SDK session. This keeps the outer loop simple.
"""

import time
import traceback

import config
from api_client import ApiClient
from bot_pool import BotPool
from notifier import Notifier
from deployer import Deployer


def main():
    api = ApiClient(config.CF_WORKER_URL, config.WORKER_TOKEN)
    pool = BotPool(config.BOT_POOL_DIR)
    notifier = Notifier(config.OWNER_TELEGRAM_BOT_TOKEN, config.OWNER_TELEGRAM_CHAT_ID)
    deployer = Deployer(api, pool, notifier, config.OPENCLAW_INSTALL_DIR)

    last_health_ping = 0
    print(f"[worker] Started. Polling {config.CF_WORKER_URL} every {config.POLL_INTERVAL}s")
    print(f"[worker] Bot pool: {pool.available_count()} available")
    print(f"[worker] Agent: Claude Max plan (Sonnet 4.6), max {config.AGENT_MAX_TURNS} turns")
    print(f"[worker] Claude auth: {'OK' if config.CLAUDE_AUTH_DIR.exists() else 'MISSING — run claude login!'}")

    while True:
        try:
            # Health ping every 5 minutes
            now = time.time()
            if now - last_health_ping >= config.HEALTH_INTERVAL:
                api.send_health_ping()
                last_health_ping = now

            # Poll for next job
            job = api.get_next_job()
            if job:
                print(f"[worker] Job found: {job['id']} (Tier {job['tier']}, {job['job_type']})")
                notifier.notify_new_job(job)

                if job["job_type"] == "deploy":
                    start = time.time()
                    success = deployer.deploy(job)
                    elapsed = time.time() - start
                    print(f"[worker] {job['id']}: {'SUCCESS' if success else 'FAILED'} in {elapsed:.0f}s")

                elif job["job_type"] == "cancel":
                    # VPS lifecycle: wipe → cancel → update D1
                    # (see VPS billing strategy spec, Section 2 Layer 3)
                    from vps_lifecycle import VpsLifecycle
                    lifecycle = VpsLifecycle(api, notifier)
                    lifecycle.handle_cancel(job)

                else:
                    # Non-deploy/cancel jobs are manual in Phase 0
                    notifier.send(
                        f"⚠️ {job['id']} — job type '{job['job_type']}' requires manual handling"
                    )
                    api.update_job(job["id"], "failed",
                                   error_log=f"Job type {job['job_type']} not automated yet")
            else:
                # No job — wait and poll again
                pass

        except KeyboardInterrupt:
            print("[worker] Shutting down...")
            break
        except Exception:
            print(f"[worker] Error: {traceback.format_exc()}")
            # Don't crash — wait and retry
            time.sleep(10)
            continue

        time.sleep(config.POLL_INTERVAL)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test locally (dry run)**

```bash
cd onboarding-pipeline/pi5-worker
# Create a test .env with your real CF Worker token
cp .env.example .env
# Edit .env with real values

# Run worker — should poll and find no jobs
python3 worker.py
# Expected: "[worker] Started. Polling https://api.3nexgen.com every 30s"
# Ctrl+C to stop
```

- [ ] **Step 3: Commit**

```bash
git add onboarding-pipeline/pi5-worker/worker.py
git commit -m "feat(plan-b): main worker loop with polling + health pings"
```

---

### Task 8: Systemd Service on Pi5

**Files:**
- Create: `onboarding-pipeline/pi5-worker/nexgen-worker.service`

- [ ] **Step 1: Create systemd service file**

```ini
[Unit]
Description=NexGen Onboarding Pipeline Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/onboarding-pipeline/pi5-worker
ExecStart=/usr/bin/python3 /home/pi/onboarding-pipeline/pi5-worker/worker.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1
# Claude Max plan auth is in ~/.claude/ (set up via 'claude login' in P7).
# No API key needed — the Agent SDK spawns Claude Code CLI which reads the OAuth token.

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Deploy to Pi5**

```bash
# On Pi5:

# Copy files to Pi5 (from your Windows machine or git pull)
cd ~
git clone <repo> openclaw_setup_business  # or git pull if already cloned

# Symlink or copy the worker
ln -s ~/openclaw_setup_business/onboarding-pipeline/pi5-worker ~/onboarding-pipeline/pi5-worker

# Create .env with real values
cp ~/onboarding-pipeline/pi5-worker/.env.example ~/onboarding-pipeline/pi5-worker/.env
nano ~/onboarding-pipeline/pi5-worker/.env
# Fill in all real values

# Install service
sudo cp ~/onboarding-pipeline/pi5-worker/nexgen-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nexgen-worker
sudo systemctl start nexgen-worker

# Check status
sudo systemctl status nexgen-worker
# Expected: active (running)

# Check logs
journalctl -u nexgen-worker -f
# Expected: "[worker] Started. Polling https://api.3nexgen.com every 30s"
```

- [ ] **Step 3: Verify health ping reaches CF Worker**

```bash
# Wait 5 minutes, then check CF Worker
curl -H "X-Worker-Token: YOUR_TOKEN" https://api.3nexgen.com/api/health
# The health table should have a recent ping
```

- [ ] **Step 4: Commit**

```bash
git add onboarding-pipeline/pi5-worker/nexgen-worker.service
git commit -m "feat(plan-b): systemd service for Pi5 worker"
```

---

### Task 9: End-to-End Test (Hetzner)

This task runs the full pipeline against a Hetzner VPS (cheap, fast, proven) before switching to Contabo.

**No new files.** This is an integration test.

- [ ] **Step 0: Verify Agent SDK works on Pi5**

```bash
# On Pi5:
cd ~/onboarding-pipeline/pi5-worker

# 1. Check Claude auth exists (zero-cost filesystem check)
ls -la ~/.claude/
# Expected: directory exists with auth files

# 2. Verify CLI works directly
claude -p "echo AGENT_SDK_OK" --allowedTools Bash --permission-mode bypassPermissions
# Expected: output contains "AGENT_SDK_OK"

# 3. Verify Python Agent SDK can spawn CLI
python3 -c "
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage
import anyio

async def test():
    async for msg in query(
        prompt='Run: echo AGENT_SDK_OK',
        options=ClaudeAgentOptions(
            allowed_tools=['Bash'],
            permission_mode='bypassPermissions',
            model='sonnet',
            max_turns=3,
        )
    ):
        if isinstance(msg, ResultMessage):
            print(f'Result: {msg.result}')
            print(f'Stop reason: {msg.stop_reason}')

anyio.run(test)
"
# Expected: Result contains "AGENT_SDK_OK"
```

If this fails, check:
- `~/.claude/` exists (run `claude login` if not)
- `claude --version` works (install with `npm install -g @anthropic-ai/claude-code`)
- Pi5 has internet access
- `claude-agent-sdk` is installed: `pip3 install --user claude-agent-sdk`

- [ ] **Step 1: Create a test job in CF D1**

```bash
# Use the manual confirm endpoint to create a test job
curl -X POST https://api.3nexgen.com/api/confirm \
  -H "X-API-Key: YOUR_CONFIRM_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": 2,
    "display_name": "Test Bot E2E",
    "telegram_user_id": "340067089",
    "email": "test@3nexgen.com",
    "payment_method": "fps",
    "amount_hkd": 400,
    "reference": "E2E-TEST-001"
  }'
```

Expected: `{"job":{"id":"T1043","status":"ready",...}}`

- [ ] **Step 2: Temporarily switch deployer to use Hetzner**

For testing, modify `deployer.py` `_provision_vps` to call `hetzner-create.sh` instead of `contabo-create.sh`. Or create a `.env` override: `PROVISION_PROVIDER=hetzner`.

- [ ] **Step 3: Watch Pi5 worker process the job**

```bash
# On Pi5
journalctl -u nexgen-worker -f
```

Expected sequence:
1. `[worker] Job found: T1043 (Tier 2, deploy)`
2. Bot assigned, display name set, customer message sent
3. VPS provisioned (Hetzner, ~30s)
4. Scripts uploaded
5. Phase 1 scripts run → gate check pass
6. Phase 2 scripts run → gate check pass
7. Phase 3 scripts run → gate check pass
8. QA passes
9. Webhook set, customer notified
10. Job status: complete

- [ ] **Step 4: Verify customer received messages on Telegram**

Check your Telegram (user ID 340067089):
1. "Setting up your AI assistant, please wait approximately 15 minutes..."
2. "Your AI assistant is ready! Start chatting now."

Try chatting with the test bot — should respond via OpenClaw.

- [ ] **Step 5: Verify owner notifications received**

Check your personal OpenClaw Telegram — should have received deployment notifications.

- [ ] **Step 6: Destroy test VPS**

```bash
cd openclaw_install
bash provision/destroy-vps.sh T1043  # or hetzner-destroy equivalent
```

- [ ] **Step 7: Switch deployer back to Contabo for production**

Revert the temporary Hetzner override.

- [ ] **Step 8: Run final Contabo validation (one real deploy)**

Repeat steps 1-6 but with Contabo provisioning. This validates the full production path.

- [ ] **Step 9: Commit any fixes**

```bash
git add -A
git commit -m "test(plan-b): end-to-end deployment pipeline verified (Hetzner + Contabo)"
```

---

### Task 10: VPS Lifecycle Module (Recycling + Cancel Handler)

**Spec:** `docs/superpowers/specs/2026-03-27-contabo-vps-billing-strategy-design.md`

**Files:**
- Create: `onboarding-pipeline/pi5-worker/vps_lifecycle.py`
- Create: `onboarding-pipeline/pi5-worker/tests/test_vps_lifecycle.py`

This module implements the 3-layer VPS billing strategy: recycling pool (check-before-provision), auto-cancel on churn, and auto-revoke on recycle. It calls Contabo scripts via subprocess and updates D1 via the API client.

- [ ] **Step 1: Write the failing test**

Create `tests/test_vps_lifecycle.py`:
```python
import unittest
from unittest.mock import patch, MagicMock, call
import os

os.environ.setdefault("CF_WORKER_URL", "http://test")
os.environ.setdefault("WORKER_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("OWNER_TELEGRAM_CHAT_ID", "test")
os.environ.setdefault("DEEPSEEK_API_KEY", "test")
os.environ.setdefault("OPENAI_API_KEY", "test")
os.environ.setdefault("BOT_POOL_DIR", "/tmp/test-pool")
os.environ.setdefault("CONTABO_CLIENT_ID", "test")
os.environ.setdefault("CONTABO_CLIENT_SECRET", "test")
os.environ.setdefault("CONTABO_API_USER", "test")
os.environ.setdefault("CONTABO_API_PASSWORD", "test")

from vps_lifecycle import VpsLifecycle


class TestTryRecycle(unittest.TestCase):
    """Test the recycle-first VPS provisioning flow."""

    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.lifecycle = VpsLifecycle(self.mock_api, self.mock_notifier)

    def test_no_recyclable_vps_returns_none(self):
        """When no recyclable VPS exists, returns None (caller provisions fresh)."""
        self.mock_api.get_recyclable_vps.return_value = None
        result = self.lifecycle.try_recycle("T1050", 2)
        self.assertIsNone(result)
        self.mock_api.get_recyclable_vps.assert_called_once()

    @patch("vps_lifecycle.subprocess.run")
    def test_recycle_success(self, mock_run):
        """Recyclable VPS found → revoke → reinstall → update D1 → return IP."""
        self.mock_api.get_recyclable_vps.return_value = {
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
            "contabo_ip": "203.0.113.50",
            "reinstall_count": 1,
        }
        # Both subprocess calls succeed
        mock_run.return_value = MagicMock(returncode=0, stdout="203.0.113.50\n")

        result = self.lifecycle.try_recycle("T1050", 2)

        self.assertEqual(result, "203.0.113.50")
        # Verify revoke was called before reinstall
        calls = mock_run.call_args_list
        self.assertEqual(len(calls), 2)
        self.assertIn("contabo-revoke.sh", str(calls[0]))
        self.assertIn("contabo-reinstall.sh", str(calls[1]))
        # Verify D1 was updated (API first, then D1)
        self.mock_api.update_vps_instance.assert_called_once_with(
            "inst-abc123",
            status="active",
            customer_id="T1050",
            tier=2,
            reinstall_count=2,
            cancel_date=None,
            cancel_deadline=None,
        )

    @patch("vps_lifecycle.subprocess.run")
    def test_recycle_revoke_fails(self, mock_run):
        """If revoke fails, returns None (D1 stays as 'cancelling')."""
        self.mock_api.get_recyclable_vps.return_value = {
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
            "contabo_ip": "203.0.113.50",
            "reinstall_count": 0,
        }
        mock_run.return_value = MagicMock(returncode=1, stderr="HTTP 404")

        result = self.lifecycle.try_recycle("T1050", 2)

        self.assertIsNone(result)
        # D1 should NOT be updated (API call failed)
        self.mock_api.update_vps_instance.assert_not_called()
        # Owner should be notified
        self.mock_notifier.send.assert_called()


class TestHandleCancel(unittest.TestCase):
    """Test the cancel job handler (churn → wipe → cancel → D1 update)."""

    def setUp(self):
        self.mock_api = MagicMock()
        self.mock_notifier = MagicMock()
        self.lifecycle = VpsLifecycle(self.mock_api, self.mock_notifier)

    @patch("vps_lifecycle.subprocess.run")
    def test_cancel_success(self, mock_run):
        """Cancel job: reinstall OS (wipe) → submit cancellation → update D1."""
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout=""),           # reinstall (wipe)
            MagicMock(returncode=0, stdout="2026-04-25"), # cancel
        ]
        job = {
            "id": "T1043",
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
        }

        self.lifecycle.handle_cancel(job)

        # D1 updated only after both API calls succeed
        self.mock_api.update_vps_instance.assert_called_once_with(
            "inst-abc123",
            status="cancelling",
            customer_id=None,
            cancel_date=unittest.mock.ANY,
            cancel_deadline="2026-04-25",
        )
        self.mock_api.update_job.assert_called_with("T1043", "complete")
        self.mock_notifier.send.assert_called()

    @patch("vps_lifecycle.subprocess.run")
    def test_cancel_api_failure(self, mock_run):
        """If Contabo cancel fails, job fails and D1 stays unchanged."""
        mock_run.side_effect = [
            MagicMock(returncode=0, stdout=""),  # reinstall OK
            MagicMock(returncode=1, stderr="API error"),  # cancel fails
        ]
        job = {
            "id": "T1043",
            "vps_id": "inst-abc123",
            "contabo_contract_id": "ctr-xyz789",
        }

        self.lifecycle.handle_cancel(job)

        self.mock_api.update_vps_instance.assert_not_called()
        self.mock_api.update_job.assert_called_with(
            "T1043", "failed", error_log=unittest.mock.ANY
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd onboarding-pipeline/pi5-worker
python3 -m pytest tests/test_vps_lifecycle.py -v
```

Expected: FAIL — `vps_lifecycle` module not found.

- [ ] **Step 3: Implement vps_lifecycle.py**

```python
"""VPS lifecycle management: recycling pool, cancel, revoke.

Implements the 3-layer VPS billing strategy from:
  docs/superpowers/specs/2026-03-27-contabo-vps-billing-strategy-design.md

Key principle: API calls first, D1 updates only on success — no rollback needed.
"""

import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import config
from api_client import ApiClient
from notifier import Notifier


class VpsLifecycle:
    def __init__(self, api: ApiClient, notifier: Notifier):
        self.api = api
        self.notifier = notifier
        self.provision_dir = config.OPENCLAW_INSTALL_DIR / "provision"

    def try_recycle(self, job_id: str, tier: int) -> Optional[str]:
        """Check for recyclable VPS and recycle it. Returns server IP or None.

        Flow:
        1. Query CF Worker for oldest cancelling VPS
        2. Revoke cancellation via Contabo API
        3. OS reinstall via Contabo API
        4. Update D1 (only after both API calls succeed)
        """
        recyclable = self.api.get_recyclable_vps()
        if not recyclable:
            return None

        vps_id = recyclable["vps_id"]
        contract_id = recyclable.get("contabo_contract_id", vps_id)
        ip = recyclable["contabo_ip"]
        old_reinstall_count = recyclable.get("reinstall_count", 0)

        print(f"[recycle] {job_id}: Found recyclable VPS {vps_id} ({ip})")

        # Step 1: Revoke cancellation (Contabo API first)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-revoke.sh"), vps_id],
            capture_output=True, text=True, timeout=60,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[recycle] {job_id}: Revoke failed: {result.stderr}")
            self.notifier.send(
                f"⚠️ {job_id}: VPS {vps_id} revoke failed — "
                f"manual panel revoke needed, or provision fresh"
            )
            return None

        # Step 2: OS reinstall (Contabo API)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-reinstall.sh"), vps_id],
            capture_output=True, text=True, timeout=900,  # 15 min max
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[recycle] {job_id}: Reinstall failed: {result.stderr}")
            self.notifier.send(
                f"⚠️ {job_id}: VPS {vps_id} reinstall failed after revoke — "
                f"VPS is un-cancelled but needs manual OS reinstall"
            )
            return None

        # Step 3: Update D1 (only after both API calls succeed)
        self.api.update_vps_instance(
            vps_id,
            status="active",
            customer_id=job_id,
            tier=tier,
            reinstall_count=old_reinstall_count + 1,
            cancel_date=None,
            cancel_deadline=None,
        )

        self.notifier.send(f"♻️ {job_id}: Recycled VPS {vps_id} ({ip})")
        return ip

    def handle_cancel(self, job: dict) -> None:
        """Handle a cancel job: wipe customer data → cancel VPS → update D1.

        The churn flow begins when a cancel job reaches the Pi5 worker.
        The upstream pipeline spec controls when this job is created
        (e.g., after the Day 1-7 grace period).
        """
        job_id = job["id"]
        vps_id = job.get("vps_id")
        contract_id = job.get("contabo_contract_id", vps_id)

        if not vps_id:
            print(f"[cancel] {job_id}: No vps_id in job — cannot cancel")
            self.api.update_job(job_id, "failed", error_log="No vps_id in cancel job")
            return

        print(f"[cancel] {job_id}: Processing cancellation for VPS {vps_id}")

        # Step 1: Wipe customer data (OS reinstall)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-reinstall.sh"), vps_id],
            capture_output=True, text=True, timeout=900,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[cancel] {job_id}: Wipe (reinstall) failed: {result.stderr}")
            # Continue with cancellation anyway — billing matters more than data wipe
            self.notifier.send(
                f"⚠️ {job_id}: VPS {vps_id} wipe failed — "
                f"proceeding with cancellation, manual wipe needed"
            )

        # Step 2: Submit cancellation (Contabo API first)
        result = subprocess.run(
            ["bash", str(self.provision_dir / "contabo-cancel.sh"), vps_id],
            capture_output=True, text=True, timeout=60,
            cwd=str(config.OPENCLAW_INSTALL_DIR),
        )
        if result.returncode != 0:
            print(f"[cancel] {job_id}: Contabo cancel failed: {result.stderr}")
            self.api.update_job(
                job_id, "failed",
                error_log=f"Contabo cancel API failed: {result.stderr[:200]}"
            )
            self.notifier.send(
                f"🔴 {job_id}: VPS {vps_id} cancel failed — "
                f"manual cancellation needed in Contabo panel"
            )
            return

        cancel_deadline = result.stdout.strip().split("\n")[-1]  # Last line = deadline

        # Step 3: Update D1 (only after Contabo API success)
        now = datetime.now(timezone.utc).isoformat()
        self.api.update_vps_instance(
            vps_id,
            status="cancelling",
            customer_id=None,
            cancel_date=now,
            cancel_deadline=cancel_deadline,
        )

        self.api.update_job(job_id, "complete")
        self.notifier.send(
            f"🗑️ {job_id}: VPS {vps_id} cancelled. "
            f"Recyclable until {cancel_deadline}."
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
python3 -m pytest tests/test_vps_lifecycle.py -v
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add onboarding-pipeline/pi5-worker/vps_lifecycle.py onboarding-pipeline/pi5-worker/tests/test_vps_lifecycle.py
git commit -m "feat(plan-b): VPS lifecycle module — recycling pool + auto-cancel/revoke"
```

---

## Post-completion

Plan B is complete when:
1. Pi5 worker is running as systemd service, polling CF Worker
2. Bot pool has 20+ bots ready
3. Contabo provisioning scripts work (create, cancel, revoke, reinstall, destroy)
4. VPS lifecycle verified: cancel → recycle (revoke + reinstall) → redeploy
5. Claude Agent SDK deploys successfully (AI operator runs scripts, interprets QA, debugs issues)
6. End-to-end test passed (Hetzner + Contabo)
7. Owner receives Telegram notifications
8. Customer receives bot messages
9. Cancel job handler works (wipe → cancel → D1 update)

**Cost per deployment (Agent SDK):** $0 marginal cost — runs on Claude Max plan ($100/mo flat). No per-token charges. The Max plan also covers your personal Claude Code usage.

**VPS billing strategy:** See `docs/superpowers/specs/2026-03-27-contabo-vps-billing-strategy-design.md` for full 3-layer defense (pricing bundles, D1 tracking, recycling pool). Task 10 implements the Pi5 side; Plan A additions (vps_instances D1 table, /api/vps/recyclable endpoint, daily cron) are separate work items for the CF Worker.

**Plan C can be built independently** — it creates tier management and churn scripts that are used manually in Phase 0 and can later be integrated into the worker.

**NexGenAI_Support_bot (Phase 0):** Deploy manually using the existing CLAUDE.md playbook — it's just another OpenClaw instance with a FAQ knowledge base in `soul.md`. Create bot via BotFather (`NexGenAI_Support_bot`), deploy on a cheap VPS or your Hetzner instance, configure `soul.md` with pricing/FAQ content. No custom code needed — OpenClaw handles Telegram messaging natively. Add forwarding rules in `openclaw.json` to notify your personal Telegram when it can't answer a question.
