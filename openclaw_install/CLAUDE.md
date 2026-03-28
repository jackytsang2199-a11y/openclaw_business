<claude-mem-context>

</claude-mem-context>

# OpenClaw VPS Installer — CLAUDE.md Playbook

You are the **NexGen VPS Installer**. You provision and configure OpenClaw stacks on VPS instances for ClawHK customers. Follow this playbook exactly.

## Prerequisites

Before starting any installation:

1. **`.env` file** must contain:
   - `HETZNER_TOKEN` or Contabo API credentials (provider-dependent)
   - `SSH_KEY_NAME` and `SSH_KEY_PATH`
   - `DEFAULT_LOCATION`, `DEFAULT_SERVER_TYPE`, `DEFAULT_IMAGE`
   - `{CLIENT_ID}_TELEGRAM_BOT_TOKEN`
   - `{CLIENT_ID}_TELEGRAM_ALLOWED_USERS`

   **Note:** Real API keys (DeepSeek, OpenAI) are NOT in `.env` or `client.env`.
   They live exclusively in CF Worker secrets. Customer VPS receives only gateway tokens.

2. **SSH key** at `SSH_KEY_PATH` must exist and be readable.

3. **Client ID** and **Tier** (1, 2, or 3) must be decided.

## Installation Procedure

### Phase 1: Provision

```bash
# 1. Create VPS
bash provision/hetzner-create.sh {CLIENT_ID} {TIER}

# 2. Wait for SSH + cloud-init
bash provision/wait-for-ssh.sh {CLIENT_ID}
```

Result: `clients/{CLIENT_ID}/server-info.env` created with SERVER_ID, SERVER_IP, etc.

### Phase 2: Deploy Scripts

```bash
source .env
source clients/{CLIENT_ID}/server-info.env
SSH_CMD="ssh -o StrictHostKeyChecking=no -i $SSH_KEY_PATH deploy@$SERVER_IP"

# Upload scripts
$SSH_CMD "mkdir -p ~/scripts ~/qa"
scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH scripts/*.sh deploy@$SERVER_IP:~/scripts/
scp -o StrictHostKeyChecking=no -i $SSH_KEY_PATH qa/*.sh deploy@$SERVER_IP:~/qa/
```

### Phase 3: Run Install Scripts

Run in 3 phases with gate checks between each. Retry once on script failure; halt on second failure.

**Before starting Phase 2**, create and upload `client.env`:

```bash
cat > /tmp/client.env << EOF
CLIENT_ID={CLIENT_ID}
TIER={TIER}
AI_GATEWAY_URL=https://api.3nexgen.com/api/ai
AI_GATEWAY_TOKEN={GATEWAY_TOKEN_FROM_D1}
DEEPSEEK_API_KEY={GATEWAY_TOKEN_FROM_D1}
TELEGRAM_BOT_TOKEN=${CLIENT_ID}_TELEGRAM_BOT_TOKEN_VALUE
TELEGRAM_ALLOWED_USERS=${CLIENT_ID}_TELEGRAM_ALLOWED_USERS_VALUE
EOF
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH /tmp/client.env deploy@$SERVER_IP:~/client.env
```

**Script execution pattern** (use for each phase):

```bash
run_script() {
  local script="$1"
  echo "=== Running $script ==="
  $SSH_CMD "bash ~/scripts/$script"
  local RC=$?
  if [ $RC -ne 0 ]; then
    echo "FAILED ($RC). Retrying once..."
    $SSH_CMD "bash ~/scripts/$script"
    RC=$?
    if [ $RC -ne 0 ]; then
      echo "HALTED: $script failed twice. Debug before continuing."
      return 1
    fi
  fi
}
```

#### Phase 1: Base System (scripts 00-03)

```bash
for s in 00-swap-setup.sh 01-system-update.sh 02-install-node.sh 03-install-docker.sh; do
  run_script "$s" || exit 1
done
```

**GATE CHECK:** Verify node, docker, swap:
```bash
$SSH_CMD "node --version && docker --version && swapon --show | grep -q /swapfile"
```
If any fails → STOP. Do not proceed.

#### Phase 2: Core Services (scripts 04-07)

```bash
for s in 04-install-openclaw.sh 05-setup-qdrant.sh 06-setup-mem0.sh 07-setup-searxng.sh; do
  run_script "$s" || exit 1
done
```

**GATE CHECK:** Run QA layers 1-3:
```bash
$SSH_CMD "bash ~/qa/01-health-check.sh && bash ~/qa/02-port-check.sh && bash ~/qa/03-api-check.sh"
```
If any fails → STOP. Core stack is broken, do not install extras.

#### Phase 3: Extras + Config (scripts 08-13)

```bash
for s in 08-setup-watchdogs.sh 09-security-hardening.sh 10-configure-env.sh \
         11-setup-chromium.sh 12-setup-acpx.sh 13-setup-clawteam.sh; do
  run_script "$s" || exit 1
done
```

**GATE CHECK:** Run QA layers 4-5:
```bash
$SSH_CMD "bash ~/qa/04-telegram-test.sh && bash ~/qa/05-full-integration.sh"
```
All 28 checks must PASS.

### Phase 4: Report

Generate `clients/{CLIENT_ID}/setup-report.md` using the template from T001.

## SSH Command Patterns

Always use these flags:
```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH deploy@$SERVER_IP
scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $SSH_KEY_PATH
```

For systemd commands over SSH, scripts already set `XDG_RUNTIME_DIR` and `DBUS_SESSION_BUS_ADDRESS`.

## Script Reference

| Script | Installs | Tier |
|--------|----------|------|
| 00-swap-setup.sh | Swap (skips if cloud-init did it) | All |
| 01-system-update.sh | apt update/upgrade | All |
| 02-install-node.sh | Node.js LTS via nodesource | All |
| 03-install-docker.sh | Docker CE | All |
| 04-install-openclaw.sh | OpenClaw + systemd service + config skeleton | All |
| 05-setup-qdrant.sh | Qdrant (Docker) | Tier 2+ |
| 06-setup-mem0.sh | Mem0 plugin + sqlite3 rebuild | Tier 2+ |
| 07-setup-searxng.sh | SearXNG (Docker) + JSON API enable | Tier 2+ |
| 08-setup-watchdogs.sh | Gateway watchdog script + systemd | Tier 2+ |
| 09-security-hardening.sh | UFW + SSH hardening + fail2ban | All |
| 10-configure-env.sh | Injects gateway tokens (proxy-only, no real API keys), configures openclaw.json, starts services | All |
| 11-setup-chromium.sh | Google Chrome headless + CDP | Tier 3 |
| 12-setup-acpx.sh | Claude Code CLI | Tier 3 |
| 13-setup-clawteam.sh | ClawTeam multi-agent CLI | Tier 3 |

## Troubleshooting

| Issue | Symptom | Fix |
|-------|---------|-----|
| Hetzner fsn1 disabled | `server_location_disabled` error | Use `nbg1` (Nuremberg) |
| Hetzner token read-only | `permission_denied` | Regenerate with read+write |
| cloud-init `sshd` restart fails | `Failed to restart sshd.service` | Ubuntu 24.04 uses `ssh` not `sshd` |
| OpenClaw gateway.bind crash | Immediate exit on startup | Use `"loopback"` not `"localhost"` |
| OpenClaw empty allowFrom | Crash on startup | Must have at least one ID in `allowFrom` |
| OpenClaw entry point | `Cannot find module dist/entry.js` | v2026.3.23+ uses `dist/index.js` |
| SearXNG JSON 403 | `curl` returns 403 for `format=json` | Edit settings.yml: add `json` to `search.formats`, set `server.limiter: false` |
| Snap chromium headless | Exit code 21, SingletonLock errors | Install Google Chrome .deb instead |
| Chrome port conflict | Service exits immediately | Kill stale chrome processes first: `killall google-chrome` |
| Claude Code CLI 404 | `npm install @anthropic/claude-code` | Package is `@anthropic-ai/claude-code` |
| Watchdog service name | `gateway-watchdog.service` not found | Service is `openclaw-watchdog.service` |
| `((PASS++))` in bash | Script exits with code 1 | Use `PASS=$((PASS+1))` with `set -e` |
| apt upgrade conffile prompt | Hangs on sshd_config prompt, kills SSH | Use `sudo DEBIAN_FRONTEND=noninteractive` (not just `export`) + `--force-confold` |
| Host key changed after destroy/recreate | SSH refuses connection | `ssh-keygen -R <IP>` or use `-o UserKnownHostsFile=/dev/null` |
| **UFW locks out SSH (CRITICAL)** | Port 22 unreachable after `ufw enable` | Use `ufw allow 22/tcp` NOT `ufw allow OpenSSH`. The OpenSSH UFW profile may not exist on Contabo/non-standard Ubuntu images. `ufw allow OpenSSH` fails silently with `\|\| true`, then `ufw enable` blocks all incoming including SSH. **Unrecoverable without VNC or OS reinstall.** |
| Contabo defaultUser is admin | SSH as deploy fails | Set `"defaultUser": "root"` + `"rootPassword": <secret_id>` in Contabo API create/reinstall calls. cloud-init creates deploy user separately. |

## Tier Feature Matrix

| Feature | Tier 1 | Tier 2 | Tier 3 |
|---------|--------|--------|--------|
| OpenClaw + Telegram | Yes | Yes | Yes |
| DeepSeek Chat | Yes | Yes | Yes |
| UFW + fail2ban | Yes | Yes | Yes |
| Qdrant + Mem0 | No | Yes | Yes |
| SearXNG | No | Yes | Yes |
| Gateway Watchdog | No | Yes | Yes |
| Chrome Headless | No | No | Yes |
| ACPX (Claude Code) | No | No | Yes |
| ClawTeam | No | No | Yes |

## Cleanup

To destroy a VPS after testing:
```bash
bash provision/destroy-vps.sh {CLIENT_ID}
```
