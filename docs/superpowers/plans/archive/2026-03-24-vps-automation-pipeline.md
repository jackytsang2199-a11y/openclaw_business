# VPS Automation Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `openclaw_install/` project (under `F:\openclaw_setup_business\openclaw_install\`) via a Discovery Run on a real Hetzner VPS, producing tested provisioning scripts, installation scripts, QA suite, CLAUDE.md playbook, and config templates. Then port provisioning to Contabo for production deployment.

**Architecture:** Cloud-init handles base VPS setup (user, SSH, prerequisites, swap). Modular bash scripts handle each installation step (Docker, Node, OpenClaw, Qdrant, SearXNG, etc). A 5-layer QA suite verifies the full stack. Claude Code orchestrates via SSH from the operator's Windows machine. All scripts are written during the Discovery Run (Hetzner) by executing steps manually first, then capturing what worked. **Discovery notes are written in real-time — see Mandatory Rules below.** Provisioning scripts are then ported to Contabo for production.

**Tech Stack:** Bash scripts, Hetzner Cloud REST API, cloud-init YAML, SSH/SCP, Docker, Ubuntu 24.04 LTS

**Spec:** `docs/superpowers/specs/2026-03-24-vps-automation-pipeline-design.md`

**Stack Reference:** `technical/guides/openclaw-stack-reference.md` — Verified Pi5 dump (2026-03-25). Read this BEFORE each Discovery task. It contains exact config structures, systemd services, commands, and versions. **But do NOT copy blindly** — adapt per the diff table below.

### Pi5 vs VPS Adaptation Guide

| Area | Pi5 (reference) | VPS (what we do) | Why |
|------|-----------------|-------------------|-----|
| **Architecture** | ARM64 | x86_64 | Hetzner CX33 is Intel/AMD |
| **Mem0 LLM** | `gpt-4.1-nano` (OpenAI) | `deepseek-chat` (DeepSeek) | Cheaper, same key as main chat |
| **Mem0 embedder** | OpenAI `text-embedding-3-small` | Same | No change — DeepSeek has no embedder |
| **Auth profile** | `anthropic:default` | TBD — may need `deepseek:default` or OpenAI-compatible | Discovery Run decides |
| **Primary model** | `anthropic/claude-sonnet-4-6` | DeepSeek-Chat V3.2 | Cost: $0.28 vs $3/1M tokens |
| **Node.js** | v24.13.0 (nodesource 22.x) | Same setup | No change |
| **Chromium binary** | `chromium` (apt) | `chromium-browser` (Ubuntu x86) | Package name differs |
| **Chromium CDP port** | 9222 | 9222 | Pi5 ref says 9222 (not 18800 from old inventory) |
| **sqlite3 binding** | ARM64 needs manual symlink | x86 should auto-resolve with `npm rebuild` | Ref documents the fix if needed |
| **Qdrant page size** | Pi5 needs 4KB kernel fix | NOT needed on x86 | x86 default is already 4KB |
| **VPN** | WireGuard + watchdog | NOT installed | EU datacenter = no API restrictions |
| **VPN watchdog** | `vpn-watchdog.sh` | NOT installed | No VPN = no watchdog |
| **ACPX + Claude Code CLI** | Installed (code agent) | Install — tier assignment TBD | Discovery Run installs all tools; tier bundling decided later |
| **ClawTeam** | Installed (multi-agent) | Install — tier assignment TBD | Same as above |
| **Home directory** | `/home/jacky999` | `/home/deploy` | VPS uses `deploy` user |
| **Workspace** | `~/clawd` | TBD during Discovery | May use `~/openclaw-workspace` |
| **SSH systemctl** | Needs `XDG_RUNTIME_DIR` export | Same caveat on VPS | Scripts must include this |
| **soul.md** | Personalized | Empty (populated after setup) | Per our decision |
| **Gateway bind** | `lan` | TBD — `localhost` or `lan` | VPS may not need LAN bind |

---

## MANDATORY RULES — READ BEFORE ANY TASK

These rules apply to **every task** in this plan. Violating them means the Discovery Run output is incomplete and unusable.

### Rule 1: Real-Time Discovery Notes (NON-NEGOTIABLE)

Every SSH command you run MUST be logged to the relevant `discovery/*.md` file **immediately after execution** — before running the next command. Do NOT batch notes at the end of a task. Do NOT summarize from memory.

**The pattern for every SSH command:**

```
1. Run SSH command on VPS
2. IMMEDIATELY write to discovery note: the command, its full output, and any observation
3. Only then proceed to the next command
```

**What to write per command:**
- The exact command run
- The full output (truncate only if >50 lines, keeping first/last 10)
- Any unexpected behavior, errors, or deviations from the plan
- Resource snapshot (`free -h`, `df -h`) after major installs

**Which file to write to:**
| Task | Discovery File |
|------|----------------|
| Task 3 (base system) | `discovery/00-base-system.md` |
| Task 4 Step 1 (OpenClaw) | `discovery/01-openclaw-core.md` |
| Task 4 Step 2 (Qdrant) | `discovery/02-qdrant.md` |
| Task 4 Step 3 (Mem0) | `discovery/03-mem0.md` |
| Task 4 Step 4 (SearXNG) | `discovery/04-searxng.md` |
| Task 5 Step 1 (Watchdog) | `discovery/05-watchdog.md` |
| Task 5 Step 2 (Security) | `discovery/06-security.md` |
| Task 5 Step 3 (Chromium) | `discovery/07-chromium.md` |
| Task 5 Step 4 (ACPX) | `discovery/08-acpx.md` |
| Task 5 Step 5 (ClawTeam) | `discovery/09-clawteam.md` |
| Task 5 Step 6 (Env config) | `discovery/10-configure-env.md` |

### Rule 2: Script Writing Follows Discovery

Do NOT write a script before you have manually run and verified the commands on the VPS. The workflow is:

```
1. SSH into VPS, run command manually
2. Log to discovery note (Rule 1)
3. If it works → add to the script being built
4. If it fails → debug, log the fix, then add the working version to the script
```

Scripts are the **artifact of discovery**, not the starting point.

### Rule 3: Stop on Failure

If a command fails and you cannot fix it within 3 attempts, STOP and ask the user. Do not skip components or proceed with a broken stack.

---

## Pre-work: What YOU Must Do Before Starting

These tasks cannot be automated. Complete them all before Task 1.

- [ ] **P1: Create Hetzner Cloud account**
  - Go to https://console.hetzner.cloud/
  - Register, verify email, complete identity verification
  - Create a new project (e.g. "nexgen-customers")

- [ ] **P2: Generate Hetzner API token**
  - In Hetzner console → your project → Security → API Tokens
  - Create token with Read/Write permissions
  - Copy token — you will need it for `.env`

- [ ] **P3: Create SSH keypair for automation**
  ```bash
  ssh-keygen -t ed25519 -f ~/.ssh/nexgen_automation -C "NexGen-automation"
  ```
  - Do NOT set a passphrase (needed for unattended SSH)

- [ ] **P4: Upload SSH public key to Hetzner**
  - In Hetzner console → your project → Security → SSH Keys
  - Add public key from `~/.ssh/nexgen_automation.pub`
  - Name it `NexGen-automation` (you will reference this name in `.env`)

- [ ] **P5: Create Telegram test bot**
  - Open Telegram, message @BotFather
  - `/newbot` → name it something like "NexGen Test Bot"
  - Copy the bot token

- [ ] **P6: Get API keys**
  - **DeepSeek API key** from https://platform.deepseek.com/ — used for main chat LLM AND Mem0 memory extraction (DeepSeek-Chat V3.2, $0.28/$0.42 per 1M tokens)
  - **OpenAI API key** from https://platform.openai.com/ — used ONLY for Mem0 embeddings (`text-embedding-3-small`, $0.02/1M tokens). DeepSeek has no embedding model, so OpenAI is required for this.
  - Top up small amount for testing: ~$5 DeepSeek, ~$5 OpenAI should be more than enough

- [ ] **P6b: Review stack reference + Mem0 docs**
  - **Pi5 stack reference** (already done): `technical/guides/openclaw-stack-reference.md` — contains exact openclaw.json, Mem0 config, systemd services, all verified
  - Mem0 DeepSeek LLM config: https://docs.mem0.ai/components/llms/models/deepseek
  - Mem0 general config: https://docs.mem0.ai/components/llms/config
  - Review the **Pi5 vs VPS Adaptation Guide** table at the top of this plan — know what to change before starting

- [ ] **P7: Verify SSH works from your machine**
  ```bash
  ssh -V
  ```
  - Confirm OpenSSH is available in your terminal (Git Bash or Windows OpenSSH)

- [ ] **P8: Verify `curl` and `jq` are installed locally**
  ```bash
  curl --version && jq --version
  ```
  - Git Bash includes `curl` but NOT `jq`. If `jq` is missing: `choco install jq` or download from https://jqlang.github.io/jq/download/
  - `hetzner-create.sh` uses both to parse API responses

- [ ] **P9: Get your Telegram user ID**
  - Send any message to `@userinfobot` on Telegram
  - It replies with your numeric user ID (e.g. `123456789`)
  - This goes in `T001_TELEGRAM_ALLOWED_USERS` in `.env`
  - This is NOT the same as your bot token

- [ ] **P10: Test Hetzner API token works**
  ```bash
  curl -s -H "Authorization: Bearer YOUR_TOKEN_HERE" \
    https://api.hetzner.cloud/v1/servers | jq '.servers | length'
  ```
  - Should return `0` (no servers yet). If error, token is wrong or has wrong permissions.

> **Hetzner server limit:** Default is 5 servers. Sufficient for Discovery Run (T001 + T002). If you later need more Hetzner VPS (e.g., as fallback for heavy-use customers), request a limit increase via Hetzner support after your first successful deployment.

> **Provider strategy:** Hetzner is used for Discovery Run only (Tasks 1-9). Production customers deploy on Contabo (Task 10). Installation scripts are provider-agnostic — only provisioning scripts differ.

Once all P1-P10 done, tell Claude Code: **"Pre-work done. Start Task 1."**

---

## File Structure

```
F:\openclaw_setup_business\openclaw_install\
├── CLAUDE.md                        ← Task 7: Playbook for future Production Runs
├── .env.example                     ← Task 1: Template showing required env vars
├── .env                             ← Task 1: Your actual secrets (gitignored)
├── .gitignore                       ← Task 1: Excludes .env, clients/*, logs/*, discovery/
├── provision/
│   ├── hetzner-create.sh            ← Task 2: Create VPS via Hetzner API (Discovery)
│   ├── contabo-create.sh            ← Task 10: Create VPS via Contabo API (Production)
│   ├── contabo-destroy.sh           ← Task 10: Destroy Contabo VPS
│   ├── cloud-init.yaml              ← Task 2: Base setup config (works for both providers)
│   └── wait-for-ssh.sh              ← Task 2: Poll until SSH ready (3min Hetzner, 15min Contabo)
├── scripts/
│   ├── 00-swap-setup.sh             ← Task 3
│   ├── 01-system-update.sh          ← Task 3
│   ├── 02-install-node.sh           ← Task 3
│   ├── 03-install-docker.sh         ← Task 3
│   ├── 04-install-openclaw.sh       ← Task 4
│   ├── 05-setup-qdrant.sh           ← Task 4
│   ├── 06-setup-mem0.sh             ← Task 4
│   ├── 07-setup-searxng.sh          ← Task 4
│   ├── 08-setup-watchdogs.sh        ← Task 5
│   ├── 09-security-hardening.sh     ← Task 5
│   ├── 10-configure-env.sh          ← Task 5
│   ├── 11-setup-chromium.sh         ← Task 5
│   ├── 12-setup-acpx.sh            ← Task 5
│   └── 13-setup-clawteam.sh        ← Task 5
├── qa/
│   ├── 01-health-check.sh           ← Task 6
│   ├── 02-port-check.sh             ← Task 6
│   ├── 03-api-check.sh              ← Task 6
│   ├── 04-telegram-test.sh          ← Task 6
│   └── 05-full-integration.sh       ← Task 6
├── configs/
│   └── templates/
│       ├── openclaw.env.template     ← Task 5
│       ├── openclaw.json.template    ← Task 4
│       ├── docker-compose.yml        ← Task 4 (if needed)
│       ├── searxng-settings.yml      ← Task 4
│       └── soul.md.default           ← Task 5 (empty)
├── discovery/                        ← Per-tool notes, written in real-time during Discovery
│   ├── 00-base-system.md            ← Task 3: swap, update, node, docker
│   ├── 01-openclaw-core.md          ← Task 4: daemon, gateway, systemd, openclaw.json
│   ├── 02-qdrant.md                 ← Task 4: Docker, collection, health
│   ├── 03-mem0.md                   ← Task 4: plugin, DeepSeek LLM, embeddings, config
│   ├── 04-searxng.md               ← Task 4: Docker, settings, JSON API
│   ├── 05-watchdog.md              ← Task 5: script, systemd, logic
│   ├── 06-security.md              ← Task 5: UFW, fail2ban, SSH
│   ├── 07-chromium.md              ← Task 5: headless, CDP, systemd
│   ├── 08-acpx.md                  ← Task 5: Claude Code CLI, plugin
│   ├── 09-clawteam.md             ← Task 5: venv, tmux, pip
│   ├── 10-configure-env.md        ← Task 5: env injection, service startup
│   └── summary.md                  ← Task 7: timings, costs, resource totals
├── clients/
│   └── T001/
│       ├── .env                      ← Task 2
│       └── setup-report.md           ← Task 6
└── logs/
    └── T001-2026-03-XX.log           ← Task 3-6
```

---

## Task 1: Project Scaffolding + Environment Setup

**Files:**
- Create: `openclaw_install/.gitignore`
- Create: `openclaw_install/.env.example`
- Create: `openclaw_install/discovery/` (per-tool notes directory)

This task sets up the local project structure. No VPS involved yet.

### Already completed (pre-work session 2026-03-25):
- `openclaw_install/` directory created
- `.env` created with all real credentials (Hetzner token, DeepSeek key, OpenAI key, Telegram bot token + user ID)
- SSH keypair generated at `~/.ssh/nexgen_automation` (ed25519), uploaded to Hetzner as `NexGen-automation`
- Hetzner API token verified (returns 0 servers)
- `jq` installed at `/c/Users/User/.local/bin/jq.exe` — add to PATH: `export PATH="/c/Users/User/.local/bin:$PATH"`

### Remaining steps:

- [ ] **Step 1: Create subdirectories**

  ```bash
  cd /f/openclaw_setup_business/openclaw_install
  mkdir -p provision scripts qa configs/templates clients/T001 logs discovery
  ```

- [ ] **Step 2: Create `.gitignore`**

  ```
  .env
  clients/*/.env
  clients/*/soul.md
  logs/
  *.log
  ```

- [ ] **Step 3: Create `.env.example`**

  ```bash
  # Hetzner Cloud (Discovery Run)
  HETZNER_TOKEN=your_hetzner_api_token
  SSH_KEY_NAME=NexGen-automation
  SSH_KEY_PATH=/c/Users/User/.ssh/nexgen_automation
  DEFAULT_LOCATION=fsn1
  DEFAULT_SERVER_TYPE=cx33
  DEFAULT_IMAGE=ubuntu-24.04

  # API Keys (shared across all customers)
  DEEPSEEK_API_KEY=your_deepseek_key_here
  OPENAI_API_KEY=your_openai_key_for_embeddings_only

  # Contabo (Production — added in Task 10)
  # CONTABO_CLIENT_ID=your_contabo_oauth_client_id
  # CONTABO_CLIENT_SECRET=your_contabo_oauth_client_secret
  # CONTABO_API_USER=your_contabo_api_username
  # CONTABO_API_PASSWORD=your_contabo_api_password

  # DeepSeek-Chat V3.2 is used for:
  #   1. Primary chat LLM (via OpenClaw)
  #   2. Mem0 memory extraction LLM
  # OpenAI key is used ONLY for Mem0 embeddings (text-embedding-3-small, $0.02/1M tokens)

  # Test Customer T001
  T001_TELEGRAM_BOT_TOKEN=your_test_bot_token
  T001_TELEGRAM_ALLOWED_USERS=your_telegram_user_id
  ```

- [ ] **Step 4: Verify `.env` exists and has required keys**

  Check non-empty values for: `HETZNER_TOKEN`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `T001_TELEGRAM_BOT_TOKEN`, `T001_TELEGRAM_ALLOWED_USERS`. Do NOT print values.

- [ ] **Step 5: Create discovery note templates**

  Create each file in `discovery/` using this standard template:

  ```markdown
  # [Tool Name] — Discovery Notes

  **Script:** scripts/XX-name.sh
  **Started:** {TIMESTAMP}

  ## Commands Run
  <!-- Log each command + output AS YOU GO, not after -->

  ## Gotchas
  <!-- Things that surprised us -->

  ## Verification
  <!-- Health check result -->

  ## Resource Snapshot
  <!-- free -h, df -h, docker stats after this step -->

  ## Time Taken
  <!-- Start → end -->
  ```

  Create placeholder files:
  ```bash
  cd openclaw_install/discovery
  for f in 00-base-system 01-openclaw-core 02-qdrant 03-mem0 04-searxng 05-watchdog 06-security 07-chromium 08-acpx 09-clawteam 10-configure-env; do
    echo "# ${f} — Discovery Notes" > "${f}.md"
  done
  ```

- [ ] **Step 6: Initialize git repo**

  ```bash
  cd /f/openclaw_setup_business/openclaw_install
  git init && git add .gitignore .env.example discovery/
  git commit -m "chore: scaffold openclaw_install project"
  ```

---

## Task 2: Provision — Hetzner API + Cloud-Init + SSH Wait

**Files:**
- Create: `provision/cloud-init.yaml`
- Create: `provision/hetzner-create.sh`
- Create: `provision/wait-for-ssh.sh`
- Create: `clients/T001/.env`

This is the first real infrastructure step. Creates a VPS and waits for it.

- [ ] **Step 1: Write `provision/cloud-init.yaml`**

  ```yaml
  #cloud-config
  users:
    - name: deploy
      sudo: ALL=(ALL) NOPASSWD:ALL
      shell: /bin/bash
      ssh_authorized_keys:
        - SSH_PUBLIC_KEY_PLACEHOLDER

  package_update: true
  packages:
    - curl
    - git
    - ufw
    - fail2ban
    - ca-certificates
    - gnupg
    - htop
    - jq

  timezone: Asia/Hong_Kong

  swap:
    filename: /swapfile
    size: 2G
    maxsize: 2G

  runcmd:
    - ufw allow OpenSSH
    - ufw --force enable
    - sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
    - sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    - systemctl restart sshd
  ```

  Note: `SSH_PUBLIC_KEY_PLACEHOLDER` is replaced at runtime by `hetzner-create.sh` with the actual public key content. Hetzner's `ssh_keys` API parameter injects the key for root, but we need it for the `deploy` user too — so we inject via both channels.

- [ ] **Step 2: Write `provision/hetzner-create.sh`**

  ```bash
  #!/bin/bash
  set -euo pipefail

  # Usage: ./hetzner-create.sh <CLIENT_ID> [TIER]
  CLIENT_ID="${1:?Usage: hetzner-create.sh <CLIENT_ID> [TIER]}"
  TIER="${2:-2}"

  SCRIPT_DIR="$(dirname "$0")"
  source "$SCRIPT_DIR/../.env"

  echo "[provision] Creating VPS for $CLIENT_ID (Tier $TIER)..."

  # Inject SSH public key into cloud-init template
  SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")
  CLOUD_INIT=$(sed "s|SSH_PUBLIC_KEY_PLACEHOLDER|${SSH_PUB_KEY}|" "$SCRIPT_DIR/cloud-init.yaml")
  CLOUD_INIT_JSON=$(echo "$CLOUD_INIT" | jq -Rs .)

  RESPONSE=$(curl -s -X POST https://api.hetzner.cloud/v1/servers \
    -H "Authorization: Bearer $HETZNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"nexgen-${CLIENT_ID}\",
      \"server_type\": \"${DEFAULT_SERVER_TYPE}\",
      \"image\": \"${DEFAULT_IMAGE}\",
      \"location\": \"${DEFAULT_LOCATION}\",
      \"ssh_keys\": [\"${SSH_KEY_NAME}\"],
      \"user_data\": ${CLOUD_INIT_JSON},
      \"labels\": {
        \"customer\": \"${CLIENT_ID}\",
        \"tier\": \"${TIER}\",
        \"managed-by\": \"NexGen-automation\"
      },
      \"start_after_create\": true
    }")

  # Extract results
  SERVER_ID=$(echo "$RESPONSE" | jq -r '.server.id')
  SERVER_IP=$(echo "$RESPONSE" | jq -r '.server.public_net.ipv4.ip')
  ERROR=$(echo "$RESPONSE" | jq -r '.error.message // empty')

  if [ -n "$ERROR" ]; then
    echo "[provision] ERROR: $ERROR"
    echo "$RESPONSE" | jq .
    exit 1
  fi

  echo "[provision] Server created: ID=$SERVER_ID IP=$SERVER_IP"
  echo "[provision] Saving to clients/$CLIENT_ID/"

  CLIENT_DIR="$SCRIPT_DIR/../clients/$CLIENT_ID"
  mkdir -p "$CLIENT_DIR"
  # No indentation in heredoc to avoid leading whitespace in output
  cat > "$CLIENT_DIR/server-info.env" <<EOF
SERVER_ID=$SERVER_ID
SERVER_IP=$SERVER_IP
SERVER_TYPE=${DEFAULT_SERVER_TYPE}
LOCATION=${DEFAULT_LOCATION}
TIER=$TIER
CREATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

  echo "[provision] Done. Now run: ./provision/wait-for-ssh.sh $CLIENT_ID"
  ```

- [ ] **Step 3: Write `provision/wait-for-ssh.sh`**

  ```bash
  #!/bin/bash
  set -euo pipefail

  CLIENT_ID="${1:?Usage: wait-for-ssh.sh <CLIENT_ID>}"
  source "$(dirname "$0")/../.env"
  source "$(dirname "$0")/../clients/$CLIENT_ID/server-info.env"

  echo "[wait-ssh] Waiting for $SERVER_IP to accept SSH..."

  MAX_ATTEMPTS=18  # 18 * 10s = 3 minutes
  ATTEMPT=0

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
       -o ConnectTimeout=5 -i "$SSH_KEY_PATH" \
       deploy@"$SERVER_IP" "echo 'SSH ready'" 2>/dev/null; then
      echo "[wait-ssh] SSH is ready!"

      # Check cloud-init completion (5 min timeout)
      echo "[wait-ssh] Checking cloud-init completion..."
      ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        -i "$SSH_KEY_PATH" deploy@"$SERVER_IP" \
        "timeout 300 cloud-init status --wait" 2>/dev/null

      echo "[wait-ssh] Cloud-init complete. VPS ready for installation."
      exit 0
    fi

    ATTEMPT=$((ATTEMPT + 1))
    echo "[wait-ssh] Attempt $ATTEMPT/$MAX_ATTEMPTS - not ready yet, waiting 10s..."
    sleep 10
  done

  echo "[wait-ssh] ERROR: SSH not available after 3 minutes"
  exit 1
  ```

- [ ] **Step 4: Run `hetzner-create.sh T001` to create the test VPS**

  This is the moment of truth. Execute from your Windows machine:
  ```bash
  cd openclaw_install && bash provision/hetzner-create.sh T001 2
  ```
  Expected: Server created, IP printed, `clients/T001/server-info.env` written.

  If it fails: debug the API response, fix the script, retry.

- [ ] **Step 5: Run `wait-for-ssh.sh T001`**

  ```bash
  bash provision/wait-for-ssh.sh T001
  ```
  Expected: SSH connects within 1-3 minutes. Cloud-init completes.

  If SSH fails: check Hetzner console for VPS status, verify SSH key name matches.

- [ ] **Step 6: Verify cloud-init results on VPS**

  SSH in manually and check:
  ```bash
  ssh -o StrictHostKeyChecking=no -i $SSH_KEY_PATH deploy@$SERVER_IP
  # Once connected:
  cat /etc/timezone                    # Should show Asia/Hong_Kong
  free -h                              # Should show swap
  dpkg -l | grep -E "curl|git|ufw|fail2ban|jq"  # All should be installed
  sudo ufw status                      # Should show active, SSH allowed
  whoami                               # Should be deploy
  sudo -l                              # Should show NOPASSWD
  ```

  Record results in `discovery/`. Note any cloud-init failures from `/var/log/cloud-init-output.log`.

- [ ] **Step 7: Update scripts if needed, commit**

  Fix any issues found in cloud-init.yaml or provision scripts.
  ```bash
  git add provision/ clients/T001/server-info.env discovery/
  git commit -m "feat: add VPS provisioning (Hetzner API + cloud-init)"
  ```

---

## Task 3: Discovery Install — Base System (scripts 00-03)

> **REMINDER:** Mandatory Rules apply. Log every SSH command + output to `discovery/00-base-system.md` IMMEDIATELY. Run manually first, then build scripts from what worked.

**Files:**
- Create: `scripts/00-swap-setup.sh`
- Create: `scripts/01-system-update.sh`
- Create: `scripts/02-install-node.sh`
- Create: `scripts/03-install-docker.sh`
- Update: `discovery/00-base-system.md` (write as you go, not after)

For each script: run commands manually on VPS first, **immediately log command + output to `discovery/00-base-system.md`**, capture what works into script, SCP to VPS, verify script runs cleanly.

- [ ] **Step 1: SSH into VPS, check current state**

  ```bash
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -i $SSH_KEY_PATH deploy@$SERVER_IP
  ```
  Check: `free -h` (swap from cloud-init?), `df -h` (disk), `uname -a` (kernel), `cat /etc/os-release`

- [ ] **Step 2: Write `scripts/00-swap-setup.sh`**

  If cloud-init already created swap, this script should detect and skip. If not, create 2GB swap.
  Run manually first, observe, then write the script locally.

  Key pattern for every script:
  ```bash
  #!/bin/bash
  set -euo pipefail
  SCRIPT_NAME="00-swap-setup"
  log() { echo "[$SCRIPT_NAME] $1"; }
  error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

  # Idempotent check
  if swapon --show | grep -q '/swapfile'; then
    log "Swap already active. Skipping."
    exit 0
  fi
  # ... create swap ...
  ```

- [ ] **Step 3: SCP and test `00-swap-setup.sh` on VPS**

  ```bash
  scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH \
    scripts/00-swap-setup.sh deploy@$SERVER_IP:/tmp/
  ssh ... deploy@$SERVER_IP 'sudo bash /tmp/00-swap-setup.sh'
  ```
  Verify: `free -h` shows swap. Record timing in discovery-notes.

- [ ] **Step 4: Write, SCP, test `scripts/01-system-update.sh`**

  Manually run `sudo apt update && sudo apt upgrade -y` first. Observe time, any held packages, any prompts. Write script. Test.

- [ ] **Step 5: Write, SCP, test `scripts/02-install-node.sh`**

  Install Node.js LTS via nodesource. Manually first:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
  sudo apt install -y nodejs
  node --version && npm --version
  ```
  Observe version, any issues. Write script. Test.

- [ ] **Step 6: Write, SCP, test `scripts/03-install-docker.sh`**

  Install Docker CE from official repo. Manually first:
  ```bash
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker deploy
  # Need to re-login for group change
  docker --version
  docker compose version
  ```
  Note: group change requires new SSH session. Script must handle this. Write script. Test.

- [ ] **Step 7: Record resource snapshot**

  ```bash
  free -h && df -h && docker info 2>/dev/null | head -20
  ```
  Add to `discovery/`: RAM used, disk used, time taken for each script.

- [ ] **Step 8: Commit**

  ```bash
  git add scripts/0{0,1,2,3}-*.sh discovery/
  git commit -m "feat: add base system scripts (swap, update, node, docker)"
  ```

---

## Task 4: Discovery Install — OpenClaw + Services (scripts 04-07)

> **REMINDER:** Mandatory Rules apply. Log every SSH command to the matching discovery file (`01-openclaw-core.md`, `02-qdrant.md`, `03-mem0.md`, `04-searxng.md`) IMMEDIATELY. Run manually first, then build scripts.

**Files:**
- Create: `scripts/04-install-openclaw.sh`
- Create: `scripts/05-setup-qdrant.sh`
- Create: `scripts/06-setup-mem0.sh`
- Create: `scripts/07-setup-searxng.sh`
- Create: `configs/templates/searxng-settings.yml`
- Create: `configs/templates/docker-compose.yml` (if needed)
- Update: `discovery/01-openclaw-core.md`, `discovery/02-qdrant.md`, `discovery/03-mem0.md`, `discovery/04-searxng.md`

This is the most complex task. OpenClaw installation may have undocumented steps. Expect failures — that's the point of Discovery. **Log every command + output to the relevant discovery file immediately.**

- [ ] **Step 1: Install OpenClaw manually, document every step**

  Reference: `technical/guides/openclaw-stack-reference.md` Section 1 (OpenClaw Core) — has exact install commands, full `openclaw.json` structure, systemd service file, and env file location.
  Run `sudo npm install -g openclaw@latest` (requires Node 22+). Document:
  - Exact install command
  - Config file locations (especially `openclaw.json`)
  - How to start daemon + gateway
  - What ports they use (daemon: 3000 localhost, gateway: 18789)
  - Any error messages
  - **Create systemd user services** for `openclaw-daemon` and `openclaw-gateway` (so they auto-start on reboot and watchdog can restart them)
  - **Create `configs/templates/openclaw.json.template`** capturing all custom settings:
    - `gateway.bind`, `gateway.auth.mode` = token
    - `agents.defaults.maxConcurrent`, `subagents.maxConcurrent`
    - `channels.telegram.dmPolicy` = allowlist
    - `plugins.slots.memory` = openclaw-mem0 (configured in script 06)
    - Primary LLM: DeepSeek-Chat via `DEEPSEEK_API_KEY`
    - Exact structure TBD during Discovery — Pi5 inventory is reference only

  Write `scripts/04-install-openclaw.sh`. SCP and test.

- [ ] **Step 2: Setup Qdrant via Docker**

  ```bash
  docker run -d --name qdrant --restart unless-stopped \
    -p 6333:6333 -p 6334:6334 \
    -v qdrant_data:/qdrant/storage \
    qdrant/qdrant:latest
  ```
  Verify: `curl http://localhost:6333/healthz`
  Write `scripts/05-setup-qdrant.sh`. SCP and test.

- [ ] **Step 3: Setup Mem0 OSS plugin**

  Reference: `technical/guides/openclaw-stack-reference.md` Section 2 (Mem0) — has exact plugin config JSON, all settings explained. Also reference Mem0 docs (see P6b).
  **Key change from Pi5:** Replace `llm.provider: "openai"` / `model: "gpt-4.1-nano"` with `provider: "deepseek"` / `model: "deepseek-chat"`. Embedder stays OpenAI.

  Key configuration points to discover and document:
  - Install `@mem0/openclaw-mem0` plugin via npm (exact command TBD during Discovery)
  - **LLM provider:** DeepSeek-Chat for memory extraction (`DEEPSEEK_API_KEY` from client.env)
  - **Embedding model:** OpenAI `text-embedding-3-small` 1536 dims (`OPENAI_API_KEY` from client.env)
  - **Vector store:** Qdrant at `http://localhost:6333`, collection name per-customer (e.g. `client-{CLIENT_ID}-memories`)
  - **Auto-capture:** ON (extract memories from conversations automatically)
  - **Auto-recall:** ON (search relevant memories before responding)
  - **History DB:** SQLite path (discover location during install)
  - Configure in `openclaw.json`: `plugins.slots.memory` = `openclaw-mem0`

  Write `scripts/06-setup-mem0.sh`. SCP and test. Verify a memory can be stored and recalled.

- [ ] **Step 4: Setup SearXNG via Docker**

  ```bash
  docker run -d --name searxng --restart always \
    -p 8888:8080 \
    -v searxng_data:/etc/searxng \
    searxng/searxng:latest
  ```
  Create `configs/templates/searxng-settings.yml` from working config.
  Verify: `curl "http://localhost:8888/search?q=test&format=json" | head`
  Write `scripts/07-setup-searxng.sh`. SCP and test.

- [ ] **Step 5: Record resource snapshot**

  ```bash
  free -h && df -h && docker ps && docker stats --no-stream
  ```
  Critical: check RAM usage. All containers + OpenClaw should fit in 8GB with headroom.
  Add to `discovery/`.

- [ ] **Step 6: Commit**

  ```bash
  git add scripts/0{4,5,6,7}-*.sh configs/templates/ discovery/
  git commit -m "feat: add OpenClaw + Qdrant + Mem0 + SearXNG scripts"
  ```

---

## Task 5: Discovery Install — Watchdogs, Security, Config, Chromium (scripts 08-11)

> **REMINDER:** Mandatory Rules apply. Log every SSH command to the matching discovery file (`05-watchdog.md`, `06-security.md`, `07-chromium.md`, `08-acpx.md`, `09-clawteam.md`, `10-configure-env.md`) IMMEDIATELY. Run manually first, then build scripts.

**Files:**
- Create: `scripts/08-setup-watchdogs.sh`
- Create: `scripts/09-security-hardening.sh`
- Create: `scripts/10-configure-env.sh`
- Create: `scripts/11-setup-chromium.sh`
- Create: `configs/templates/openclaw.env.template`
- Create: `configs/templates/soul.md.default`
- Update: `discovery/05-watchdog.md`, `discovery/06-security.md`, `discovery/07-chromium.md`, `discovery/08-acpx.md`, `discovery/09-clawteam.md`, `discovery/10-configure-env.md`

- [ ] **Step 1: Write + test `scripts/08-setup-watchdogs.sh`**

  Create gateway watchdog script + systemd service. Reference: `technical/guides/openclaw-stack-reference.md` Section 8 — has complete script source, systemd service file, and logic flow diagram.
  Adapt for VPS: change home path to `/home/deploy`, set correct UID in systemd env vars. No VPN watchdog needed (EU DC has no restrictions).
  Test: stop OpenClaw gateway manually, verify watchdog restarts it within 60s.

- [ ] **Step 2: Write + test `scripts/09-security-hardening.sh`**

  - UFW: allow SSH (22), deny incoming by default, allow 18789 (gateway) if needed externally
  - fail2ban: configure for SSH brute force protection
  - SSH: disable password auth, disable root login (may already be done by cloud-init — make idempotent)
  - Verify: `sudo ufw status`, `sudo fail2ban-client status sshd`

- [ ] **Step 3: Create `clients/T001/.env` and SCP to VPS**

  Create the client-specific env file locally from your main `.env`:
  ```bash
  # clients/T001/.env (created manually or by script)
  TELEGRAM_BOT_TOKEN=<from T001_TELEGRAM_BOT_TOKEN in .env>
  TELEGRAM_ALLOWED_USERS=<from T001_TELEGRAM_ALLOWED_USERS in .env>
  DEEPSEEK_API_KEY=<from .env>
  OPENAI_API_KEY=<from .env>
  CLIENT_ID=T001
  TIER=2
  ```
  Note: `DEEPSEEK_API_KEY` is used for both main chat and Mem0 memory extraction. `OPENAI_API_KEY` is for Mem0 embeddings only.
  Then SCP it to the VPS:
  ```bash
  scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH \
    clients/T001/.env deploy@$SERVER_IP:/home/deploy/openclaw_install/client.env
  ```

- [ ] **Step 4: Write + test `scripts/10-configure-env.sh`**

  This script:
  - Reads `client.env` from `/home/deploy/openclaw_install/client.env`
  - Generates OpenClaw auth token: `openssl rand -hex 32`
  - Pre-checks that OpenClaw, Qdrant, SearXNG are installed before configuring
  - Applies `DEEPSEEK_API_KEY` as primary LLM key in OpenClaw config
  - Applies `OPENAI_API_KEY` for Mem0 embeddings
  - Applies `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USERS`
  - Generates `openclaw.json` from template with client-specific values
  - Creates empty `soul.md` (will be populated per-customer after setup is complete)
  - Starts/restarts all services (daemon, gateway, Qdrant, SearXNG, watchdog)
  - Creates `configs/templates/openclaw.env.template` from working config

- [ ] **Step 4b: Create config templates**

  Extract from working VPS:
  - `configs/templates/openclaw.env.template` — with placeholder values
  - `configs/templates/openclaw.json.template` — all OpenClaw settings with placeholders for client-specific values
  - `configs/templates/soul.md.default` — empty file (populated after setup)

- [ ] **Step 5: Write + test `scripts/11-setup-chromium.sh`**

  Install Chromium headless, configure CDP debug port 9222, create systemd service.
  Reference: `technical/guides/openclaw-stack-reference.md` Section 5 — has systemd service file, OpenClaw browser config, health check commands.
  **Key VPS change:** Binary is `chromium-browser` on Ubuntu x86 (not `chromium`). User data dir: `/home/deploy/.chromium-openclaw/`.
  Test: `curl -s http://localhost:9222/json/version` should return Chrome version JSON.

- [ ] **Step 5b: Write + test `scripts/12-setup-acpx.sh`**

  Reference: `technical/guides/openclaw-stack-reference.md` Section 6 — ACPX is bundled with OpenClaw, but needs Claude Code CLI installed globally.
  Install `sudo npm install -g @anthropic/claude-code`, verify `claude --version`.
  ACPX config is already in openclaw.json (Section 1 of reference). No separate port needed (stdio).
  Needs `ANTHROPIC_API_KEY` in `~/.openclaw/env`.

- [ ] **Step 5c: Write + test `scripts/13-setup-clawteam.sh`**

  Reference: `technical/guides/openclaw-stack-reference.md` Section 7 — Python venv + tmux + pip install from GitHub.
  ```bash
  sudo apt install -y tmux python3-venv
  python3 -m venv ~/clawteam-env
  ~/clawteam-env/bin/pip install git+https://github.com/win4r/ClawTeam-OpenClaw.git
  ```
  Create symlink in `~/bin/clawteam`. No systemd service (on-demand only).

- [ ] **Step 6: Record final resource snapshot**

  Full system state with everything running:
  ```bash
  free -h && df -h && docker ps && docker stats --no-stream
  systemctl --user list-units --type=service --state=running
  ss -tlnp
  ```
  Add to `discovery/`.

- [ ] **Step 7: Commit**

  ```bash
  git add scripts/0{8,9}-*.sh scripts/1{0,1}-*.sh configs/templates/ discovery/
  git commit -m "feat: add watchdogs, security, config, chromium scripts"
  ```

---

## Task 6: QA Suite + Setup Report + T001 Completion

**Files:**
- Create: `qa/01-health-check.sh`
- Create: `qa/02-port-check.sh`
- Create: `qa/03-api-check.sh`
- Create: `qa/04-telegram-test.sh`
- Create: `qa/05-full-integration.sh`
- Create: `clients/T001/setup-report.md`
- Update: `discovery/`

Write each QA script by manually verifying the check first, then capturing it.

- [ ] **Step 1: Write + test `qa/01-health-check.sh`**

  Check all systemd services and Docker containers are running.
  ```bash
  check "OpenClaw daemon" "systemctl --user is-active openclaw-daemon"
  check "Qdrant container" "docker ps --filter name=qdrant --filter status=running -q"
  # ... etc for all services
  ```
  SCP to VPS, run, verify all PASS.

- [ ] **Step 2: Write + test `qa/02-port-check.sh`**

  Check ports are listening:
  - 6333 (Qdrant)
  - 8888 (SearXNG)
  - 18789 (Gateway)
  - 3000 on localhost only (daemon — verify NOT on 0.0.0.0)

- [ ] **Step 3: Write + test `qa/03-api-check.sh`**

  HTTP calls to verify APIs respond:
  - `curl -sf http://localhost:6333/healthz`
  - `curl -sf http://localhost:8888/search?q=test&format=json`
  - OpenClaw API health endpoint (discover during testing)

- [ ] **Step 4: Write + test `qa/04-telegram-test.sh`**

  - Call Telegram API `getMe` with bot token
  - Optionally send a test message to allowed user
  - Requires `T001_TELEGRAM_BOT_TOKEN` from env

- [ ] **Step 5: Write + test `qa/05-full-integration.sh`**

  End-to-end test:
  - Send a chat message via OpenClaw API
  - Wait for response
  - Check Qdrant for new memory entry (if Mem0 auto-capture is on)
  - Trigger a search-dependent query to verify SearXNG integration
  This is the hardest QA script. Document what works.

- [ ] **Step 6: Run full QA suite sequentially**

  ```bash
  for qa in qa/0{1,2,3,4,5}-*.sh; do
    echo "=== Running $qa ==="
    ssh ... deploy@$SERVER_IP "bash /home/deploy/openclaw_install/$qa"
    echo "Exit code: $?"
  done
  ```
  All must PASS. Debug and fix any failures. Update scripts accordingly.

- [ ] **Step 7: Generate `clients/T001/setup-report.md`**

  Follow the report template from the spec. Fill in real values from this Discovery Run.

- [ ] **Step 8: Commit**

  ```bash
  git add qa/ clients/T001/setup-report.md discovery/
  git commit -m "feat: add 5-layer QA suite + T001 setup report"
  ```

---

## Task 7: CLAUDE.md Playbook + Final Discovery Notes

**Files:**
- Create: `CLAUDE.md`
- Finalize: `discovery/`

- [ ] **Step 1: Write `CLAUDE.md` playbook**

  This is the "training manual" for future Claude Code sessions (Production Runs). Content:

  1. **Identity:** "You are the NexGen VPS installer."
  2. **Prerequisites checklist:** What must exist in `.env` and `clients/{CLIENT_ID}/`
  3. **Step-by-step procedure:** Provision → Deploy scripts → Run scripts 00-11 → Run QA → Generate report
  4. **SSH command patterns:** Exact SSH flags to use
  5. **Script execution rules:** Run each, check exit code, retry once on fail, halt on second fail
  6. **Troubleshooting table:** Every issue found during Discovery Run + its fix
  7. **Script list:** Which scripts exist and what they install (tier bundling decided separately)

  Write this from real experience gained in Tasks 2-6.

- [ ] **Step 2: Create `discovery/summary.md`**

  Aggregate from all per-tool discovery notes:
  - Total Discovery Run time
  - Per-tool timing breakdown
  - Total number of issues encountered
  - Scripts that needed the most iteration
  - Final RAM/disk usage with full stack running
  - Recommended improvements for next run

- [ ] **Step 3: Commit**

  ```bash
  git add CLAUDE.md discovery/
  git commit -m "feat: add CLAUDE.md playbook + finalize discovery notes"
  ```

---

## Task 8: Validation Run (T002)

**Files:**
- Create: `clients/T002/server-info.env`
- Create: `clients/T002/setup-report.md`
- Create: `provision/destroy-vps.sh`

This proves the scripts work without Discovery-mode exploration. Pure execution.

- [ ] **Step 1: Write `provision/destroy-vps.sh`**

  ```bash
  #!/bin/bash
  set -euo pipefail
  CLIENT_ID="${1:?Usage: destroy-vps.sh <CLIENT_ID>}"
  source "$(dirname "$0")/../.env"
  source "$(dirname "$0")/../clients/$CLIENT_ID/server-info.env"

  echo "[destroy] Deleting server $SERVER_ID (nexgen-$CLIENT_ID)..."
  curl -s -X DELETE "https://api.hetzner.cloud/v1/servers/$SERVER_ID" \
    -H "Authorization: Bearer $HETZNER_TOKEN"
  echo "[destroy] Server $SERVER_ID deleted."
  ```

- [ ] **Step 2: Destroy T001**

  ```bash
  bash provision/destroy-vps.sh T001
  ```
  Verify in Hetzner console: server gone, billing stopped.

- [ ] **Step 3: Provision T002**

  ```bash
  bash provision/hetzner-create.sh T002 2
  bash provision/wait-for-ssh.sh T002
  ```

- [ ] **Step 4: Create T002 client .env**

  Reuse T001's Telegram bot token for testing:
  ```bash
  cp clients/T001/.env clients/T002/.env
  # Update CLIENT_ID=T002 in the file
  ```

- [ ] **Step 5: Deploy all scripts + client env to T002**

  ```bash
  source clients/T002/server-info.env
  # Create target directory first
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
    -i $SSH_KEY_PATH deploy@$SERVER_IP 'mkdir -p /home/deploy/openclaw_install'
  # Deploy everything
  scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH -r \
    scripts/ qa/ configs/ deploy@$SERVER_IP:/home/deploy/openclaw_install/
  scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH \
    clients/T002/.env deploy@$SERVER_IP:/home/deploy/openclaw_install/client.env
  ```

- [ ] **Step 6: Run all install scripts sequentially — record timing**

  ```bash
  START_TIME=$(date +%s)
  ```
  Follow CLAUDE.md playbook exactly. Run ALL scripts 00 through 13.
  No manual intervention — scripts only.
  ```bash
  END_TIME=$(date +%s)
  echo "Total install time: $(( (END_TIME - START_TIME) / 60 )) minutes"
  ```
  Record in discovery/. Compare with Discovery Run time.

- [ ] **Step 7: Run full QA suite**

  All 5 layers must PASS without manual fixes.

- [ ] **Step 8: Test idempotency — re-run scripts 04 and 05**

  Re-run two scripts to verify they skip already-installed components cleanly:
  ```bash
  ssh ... deploy@$SERVER_IP 'bash /home/deploy/openclaw_install/scripts/04-install-openclaw.sh'
  ssh ... deploy@$SERVER_IP 'bash /home/deploy/openclaw_install/scripts/05-setup-qdrant.sh'
  ```
  Expected: both should log "already installed, skipping" and exit 0.

- [ ] **Step 9: Generate T002 setup report**

  If all QA passes: Discovery Run is complete. Scripts are production-ready.
  Note: Discovery Run installs all tools. Tier bundling (which tools per pricing tier) is decided separately after Discovery.

- [ ] **Step 10: Destroy T002 + Commit**

  ```bash
  bash provision/destroy-vps.sh T002
  git add provision/destroy-vps.sh clients/T002/
  git commit -m "feat: validation run T002 passed — scripts production-ready"
  ```

---

## Task 9: Final Review + Summary

- [ ] **Step 1: Review all files in `openclaw_install/`**

  Verify:
  - All scripts have `set -euo pipefail` and idempotent checks
  - `.env.example` lists every required variable
  - `.gitignore` covers all secrets
  - `CLAUDE.md` is complete and accurate
  - No secrets committed to git

- [ ] **Step 2: Update spec with findings**

  If any design decisions changed during Discovery (different ports, different install methods, etc), update `docs/superpowers/specs/2026-03-24-vps-automation-pipeline-design.md`.

- [ ] **Step 3: Final commit**

  ```bash
  git add -A && git commit -m "docs: update spec with Discovery Run findings"
  ```

- [ ] **Step 4: Summary to user**

  Report:
  - Total files created
  - Total Discovery Run time
  - Cost incurred (Hetzner billing)
  - What's ready for production
  - What needs manual work per customer (bot creation, env setup)
  - Next steps (Task 10: port to Contabo for production)

---

## Task 10: Port Provisioning to Contabo (Production)

**Files:**
- Create: `provision/contabo-create.sh`
- Create: `provision/contabo-destroy.sh`
- Modify: `provision/wait-for-ssh.sh` (increase timeout)
- Modify: `.env.example` (uncomment Contabo keys)
- Modify: `.env` (add real Contabo credentials)
- Modify: `CLAUDE.md` (add Contabo provisioning option)

Discovery Run is complete. Installation scripts (00-13) and QA scripts are proven on Hetzner. This task ports **only the provisioning layer** to Contabo. SSH-based install/QA scripts are provider-agnostic and need zero changes.

### Pre-work for Task 10

- [ ] **P11: Create Contabo account**
  - Go to https://contabo.com/
  - Register, complete verification
  - Add payment method

- [ ] **P12: Generate Contabo API credentials**
  - Contabo uses OAuth2 (not simple bearer tokens like Hetzner)
  - Go to Contabo Customer Panel → API → Create API credentials
  - Note: Client ID, Client Secret, API User, API Password

- [ ] **Step 1: Research Contabo API**

  Read Contabo API docs: https://api.contabo.com/
  Key differences from Hetzner:
  - **Auth:** OAuth2 token flow (POST to `/auth/realms/contabo/protocol/openid-connect/token`)
  - **Create:** `POST /v1/compute/instances`
  - **Different parameters:** `productId` instead of `server_type`, `region` instead of `location`
  - **Slower provisioning:** 5-15 min (design polling accordingly)

- [ ] **Step 2: Write `provision/contabo-create.sh`**

  ```bash
  #!/bin/bash
  set -euo pipefail

  CLIENT_ID="${1:?Usage: contabo-create.sh <CLIENT_ID> [TIER]}"
  TIER="${2:-2}"

  SCRIPT_DIR="$(dirname "$0")"
  source "$SCRIPT_DIR/../.env"

  echo "[provision:contabo] Creating VPS for $CLIENT_ID (Tier $TIER)..."

  # Step 1: Get OAuth2 token
  TOKEN=$(curl -s -X POST "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
    -d "client_id=$CONTABO_CLIENT_ID" \
    -d "client_secret=$CONTABO_CLIENT_SECRET" \
    -d "username=$CONTABO_API_USER" \
    -d "password=$CONTABO_API_PASSWORD" \
    -d "grant_type=password" | jq -r '.access_token')

  if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "[provision:contabo] ERROR: OAuth2 authentication failed"
    exit 1
  fi

  # Step 2: Create instance
  # NOTE: productId, region, imageId TBD during first Contabo deployment
  # Placeholder values below — update after researching Contabo API catalog
  RESPONSE=$(curl -s -X POST "https://api.contabo.com/v1/compute/instances" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-request-id: $(uuidgen)" \
    -H "Content-Type: application/json" \
    -d "{
      \"productId\": \"V45\",
      \"region\": \"SIN\",
      \"imageId\": \"ubuntu-24.04\",
      \"displayName\": \"nexgen-${CLIENT_ID}\",
      \"sshKeys\": [$(cat "${SSH_KEY_PATH}.pub" | jq -Rs .)]
    }")

  INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.data[0].instanceId')
  ERROR=$(echo "$RESPONSE" | jq -r '.statusCode // empty')

  if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
    echo "[provision:contabo] ERROR: $ERROR"
    echo "$RESPONSE" | jq .
    exit 1
  fi

  echo "[provision:contabo] Instance ordered: ID=$INSTANCE_ID"
  echo "[provision:contabo] Waiting for IP assignment (Contabo can take 5-15 min)..."

  # Step 3: Poll for IP assignment
  for i in $(seq 1 60); do
    sleep 15
    STATUS_RESP=$(curl -s "https://api.contabo.com/v1/compute/instances/$INSTANCE_ID" \
      -H "Authorization: Bearer $TOKEN" \
      -H "x-request-id: $(uuidgen)")
    SERVER_IP=$(echo "$STATUS_RESP" | jq -r '.data[0].ipConfig.v4.ip // empty')
    STATUS=$(echo "$STATUS_RESP" | jq -r '.data[0].status // empty')
    echo "[provision:contabo] Poll $i: status=$STATUS ip=$SERVER_IP"
    if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "null" ] && [ "$STATUS" = "running" ]; then
      break
    fi
  done

  if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "null" ]; then
    echo "[provision:contabo] ERROR: Timed out waiting for IP (15 min)"
    exit 1
  fi

  CLIENT_DIR="$SCRIPT_DIR/../clients/$CLIENT_ID"
  mkdir -p "$CLIENT_DIR"
  cat > "$CLIENT_DIR/server-info.env" <<EOF
  SERVER_ID=$INSTANCE_ID
  SERVER_IP=$SERVER_IP
  SERVER_TYPE=VPS_S
  LOCATION=SIN
  PROVIDER=contabo
  TIER=$TIER
  CREATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  EOF

  echo "[provision:contabo] Done. IP=$SERVER_IP. Now run: ./provision/wait-for-ssh.sh $CLIENT_ID"
  ```

  > **Note:** `productId`, `region`, `imageId` are placeholders. Research Contabo API catalog during this step to get exact values. The script structure is correct but parameter values need verification.

- [ ] **Step 3: Write `provision/contabo-destroy.sh`**

  ```bash
  #!/bin/bash
  set -euo pipefail
  CLIENT_ID="${1:?Usage: contabo-destroy.sh <CLIENT_ID>}"
  source "$(dirname "$0")/../.env"
  source "$(dirname "$0")/../clients/$CLIENT_ID/server-info.env"

  TOKEN=$(curl -s -X POST "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
    -d "client_id=$CONTABO_CLIENT_ID" \
    -d "client_secret=$CONTABO_CLIENT_SECRET" \
    -d "username=$CONTABO_API_USER" \
    -d "password=$CONTABO_API_PASSWORD" \
    -d "grant_type=password" | jq -r '.access_token')

  echo "[destroy:contabo] Cancelling instance $SERVER_ID (nexgen-$CLIENT_ID)..."
  curl -s -X POST "https://api.contabo.com/v1/compute/instances/$SERVER_ID/cancel" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-request-id: $(uuidgen)"
  echo "[destroy:contabo] Cancellation requested for $SERVER_ID."
  ```

- [ ] **Step 4: Update `wait-for-ssh.sh` for Contabo timeout**

  Add provider detection: if `server-info.env` has `PROVIDER=contabo`, use 15-min SSH timeout instead of 3-min.

- [ ] **Step 5: Update `.env` with Contabo credentials**

  Uncomment and fill in `CONTABO_CLIENT_ID`, `CONTABO_CLIENT_SECRET`, `CONTABO_API_USER`, `CONTABO_API_PASSWORD`.

- [ ] **Step 6: Test Contabo provisioning (T003)**

  ```bash
  bash provision/contabo-create.sh T003 2
  bash provision/wait-for-ssh.sh T003
  ```
  Then run the full install + QA suite (same scripts as Hetzner):
  ```bash
  # Deploy scripts
  source clients/T003/server-info.env
  scp -r scripts/ qa/ configs/ deploy@$SERVER_IP:/home/deploy/openclaw_install/
  # Run all install scripts 00-13
  # Run all QA layers 01-05
  ```

- [ ] **Step 7: Compare Contabo vs Hetzner performance**

  Record in `discovery/summary.md`:
  - Provisioning time (Contabo vs Hetzner)
  - Install script total time
  - `free -h` / `df -h` / `docker stats` comparison
  - Any scripts that needed Contabo-specific fixes
  - Overall: acceptable for production? Y/N

- [ ] **Step 8: Update CLAUDE.md playbook**

  Add Contabo as the default provider for Production Runs. Hetzner remains available as fallback.

- [ ] **Step 9: Destroy T003 + Commit**

  ```bash
  bash provision/contabo-destroy.sh T003
  git add provision/contabo-create.sh provision/contabo-destroy.sh
  git add -A && git commit -m "feat: add Contabo provisioning for production deployment"
  ```
