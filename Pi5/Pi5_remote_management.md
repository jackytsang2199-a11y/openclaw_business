## Pi5 Remote Management

### SSH Access

```bash
ssh jacky999@192.168.1.30
```

Key-based auth is configured (`~/.ssh/id_ed25519`). No password needed.

### Common SSH Commands

```bash
# Run a single command
ssh jacky999@192.168.1.30 "command here"

# For systemctl --user commands, always export these first:
ssh jacky999@192.168.1.30 "export XDG_RUNTIME_DIR=/run/user/1000 && export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus && systemctl --user status openclaw-gateway.service"

# SCP files to Pi5
scp F:/Marigold_gif/marigold_info/SOUL.md jacky999@192.168.1.30:~/clawd/SOUL.md

# SCP files from Pi5
scp jacky999@192.168.1.30:~/clawd/SOUL.md F:/Marigold_gif/marigold_info/SOUL.md
```

### OpenClaw CLI (on Pi5)

```bash
openclaw config get <key>           # Read config
openclaw config set <key> <value>   # Write config
openclaw config validate            # Validate openclaw.json
openclaw logs --follow              # Live tail gateway logs
openclaw status --verbose           # Gateway status
openclaw doctor                     # Full diagnostics
openclaw channels status --probe    # Telegram channel health
openclaw gateway restart            # Restart gateway
openclaw browser profiles           # List browser profiles
openclaw browser --browser-profile user status  # Chrome status
```

## Pi5 Architecture

### Services (systemd user services)

| Service | Description | Port |
|---------|-------------|------|
| `openclaw-gateway.service` | Main AI gateway | 18789 |
| `openclaw-watchdog.service` | Telegram API health check (60s interval) | - |
| `vpn-watchdog.service` | VPN connectivity check (30s interval) | - |
| `chromium-debug.service` | Headless Chromium for browser automation | 9222 |

### Docker Containers

| Container | Description | Port |
|-----------|-------------|------|
| `qdrant` | Vector database for mem0 memories | 6333 |

### Key Paths on Pi5

```
~/.openclaw/openclaw.json    # Main config
~/.openclaw/env              # API keys (chmod 600)
~/clawd/                     # Workspace (SOUL.md, MEMORY.md, etc.)
~/clawd/stickers/            # Production stickers
~/clawd/backups/             # Pre-upgrade backups
~/clawd/skills/clawteam/     # ClawTeam skill
~/scripts/gateway-watchdog.sh
~/scripts/vpn-watchdog.sh
~/bin/clawteam               # ClawTeam CLI symlink
~/clawteam-env/              # ClawTeam Python venv
~/.clawteam/                 # ClawTeam data (teams, tasks, inboxes)
~/.chromium-openclaw/        # Headless Chromium user data
```

### VPN (WireGuard / Surfshark)

Pi5 is in a restricted country. VPN is required for Claude API + Telegram access.

```
/etc/wireguard/wg0.conf          # Active config (copy of current server)
/etc/wireguard/wg0-server1.conf  # Primary (45.144.227.20)
/etc/wireguard/wg0-server2.conf  # JP Tokyo
/etc/wireguard/wg0-server3.conf  # SG Singapore
```

VPN watchdog cycles through servers on failure: server1 → server2 → server3 → server1.

Passwordless restart: `/etc/sudoers.d/wg-quick` allows `jacky999` to run `wg-quick` without sudo password.

### Installed Tools (2026-03-22)

| Tool | Purpose | How to Use |
|------|---------|-----------|
| **Sub-Agent Model** | Sub-agents use Sonnet 4.6 (cheaper) | Automatic — Marigold spawns sub-agents as needed |
| **Chrome Headless** | Browser automation on Pi5 | Telegram: "用 browser 開 https://..." |
| **ACPX** | Delegate coding to Claude Code | Telegram: "用 ACP 幫我寫..." / `/acp doctor` |
| **ClawTeam** | Multi-agent swarm coordination | Telegram: "用 clawteam 開 team..." / `clawteam` CLI |
| **Claude Code CLI** | Coding agent (v2.1.81) | Used by ACPX, not directly |

### Memory System

- **Plugin:** openclaw-mem0 (Qdrant + OpenAI embeddings)
- **Collection:** marigold-memories (~220 vectors)
- **Embedder:** text-embedding-3-small (1536 dims)
- **LLM extraction:** gpt-4.1-nano
- **History DB:** ~/clawd/mem0-history.db
