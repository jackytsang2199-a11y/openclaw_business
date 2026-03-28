# OpenClaw Stack Reference Guide

> Verified against a live Raspberry Pi 5 (arm64) deployment on 2026-03-25.
> Target audience: recreating this stack on a fresh **Ubuntu 24.04 VPS (x86_64)**.

---

## 1. OpenClaw Core

### What it is
OpenClaw is a Node.js-based AI gateway that bridges LLM providers (Anthropic, OpenAI) with messaging channels (Telegram). It runs as a long-lived daemon serving HTTP, WebSocket, and Telegram long-polling on a single port.

### Installation

```bash
# Requires Node.js 22+
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install OpenClaw globally
sudo npm install -g openclaw@latest

# Verify
openclaw --version
# Expected: OpenClaw 2026.3.13 (or newer)
```

### Config: `~/.openclaw/openclaw.json`

This is the single source of truth for the entire stack. Below is the full structure with all secrets redacted:

```json
{
  "meta": {
    "lastTouchedVersion": "2026.3.13",
    "lastTouchedAt": "2026-03-21T18:26:42.745Z"
  },
  "wizard": {
    "lastRunAt": "2026-03-05T15:46:51.028Z",
    "lastRunVersion": "2026.3.2",
    "lastRunCommand": "configure",
    "lastRunMode": "local"
  },
  "browser": {
    "enabled": true,
    "defaultProfile": "user",
    "profiles": {
      "user": {
        "driver": "existing-session",
        "attachOnly": true,
        "color": "#00AA00"
      }
    }
  },
  "auth": {
    "profiles": {
      "anthropic:default": {
        "provider": "anthropic",
        "mode": "token"
      }
    }
  },
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": true
    },
    "backend": "acpx",
    "defaultAgent": "claude",
    "allowedAgents": ["claude", "codex"],
    "maxConcurrentSessions": 4
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": [
          "anthropic/claude-opus-4-5",
          "anthropic/claude-opus-4-6"
        ]
      },
      "models": {
        "anthropic/claude-opus-4-5": { "alias": "opus" },
        "anthropic/claude-opus-4-6": { "alias": "opus46" },
        "anthropic/claude-sonnet-4-6": {}
      },
      "workspace": "/home/PLACEHOLDER_USER/clawd",
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "1h"
      },
      "compaction": {
        "mode": "safeguard"
      },
      "heartbeat": {
        "every": "1h"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8,
        "model": "anthropic/claude-sonnet-4-6"
      }
    }
  },
  "messages": {
    "ackReactionScope": "group-mentions"
  },
  "commands": {
    "native": "auto",
    "nativeSkills": "auto",
    "restart": true,
    "ownerDisplay": "raw"
  },
  "session": {
    "dmScope": "main",
    "identityLinks": {
      "PLACEHOLDER_USERNAME": [
        "telegram:PLACEHOLDER_TELEGRAM_ID"
      ]
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "allowlist",
      "botToken": "PLACEHOLDER_BOT_TOKEN",
      "allowFrom": ["PLACEHOLDER_TELEGRAM_ID"],
      "groupPolicy": "allowlist",
      "streaming": "partial"
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "lan",
    "controlUi": {
      "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789"
      ]
    },
    "auth": {
      "mode": "token",
      "token": "PLACEHOLDER_GATEWAY_TOKEN"
    },
    "tailscale": {
      "mode": "off",
      "resetOnExit": false
    }
  },
  "skills": {
    "install": {
      "nodeManager": "npm"
    }
  },
  "plugins": {
    "load": {
      "paths": [
        "/usr/lib/node_modules/openclaw/extensions/acpx"
      ]
    },
    "slots": {
      "memory": "openclaw-mem0"
    },
    "entries": {
      "telegram": { "enabled": true },
      "openclaw-mem0": {
        "enabled": true,
        "config": "... (see Section 2 below)"
      },
      "memory-core": { "enabled": false },
      "memory-lancedb": { "enabled": false },
      "acpx": { "enabled": true }
    },
    "installs": {
      "openclaw-mem0": {
        "source": "npm",
        "spec": "@mem0/openclaw-mem0",
        "installPath": "/home/PLACEHOLDER_USER/.openclaw/extensions/openclaw-mem0",
        "version": "0.1.2",
        "resolvedName": "@mem0/openclaw-mem0",
        "resolvedVersion": "0.1.2"
      },
      "acpx": {
        "source": "path",
        "spec": "@openclaw/acpx",
        "sourcePath": "/usr/lib/node_modules/openclaw/extensions/acpx",
        "installPath": "/usr/lib/node_modules/openclaw/extensions/acpx"
      }
    }
  }
}
```

### Environment file: `~/.openclaw/env`

Sensitive keys live here, **not** in openclaw.json. Referenced by the systemd service via `EnvironmentFile=`.

```
ANTHROPIC_API_KEY=PLACEHOLDER_ANTHROPIC_KEY
OPENAI_API_KEY=PLACEHOLDER_OPENAI_KEY
```

```bash
chmod 600 ~/.openclaw/env
```

### Systemd service: `~/.config/systemd/user/openclaw-gateway.service`

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /usr/lib/node_modules/openclaw/dist/entry.js gateway --port 18789
Restart=always
RestartSec=10
EnvironmentFile=/home/PLACEHOLDER_USER/.openclaw/env
Environment=OPENCLAW_GATEWAY_PORT=18789

[Install]
WantedBy=default.target
```

### How to run

```bash
# Enable user linger (services run without login session)
loginctl enable-linger $USER

# Create service directory
mkdir -p ~/.config/systemd/user/

# After creating the service file:
systemctl --user daemon-reload
systemctl --user enable openclaw-gateway.service
systemctl --user start openclaw-gateway.service
```

> **SSH caveat:** `systemctl --user` requires these exports when run over SSH:
> ```bash
> export XDG_RUNTIME_DIR=/run/user/$(id -u)
> export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus
> ```

### Port

| Port | Protocol | Purpose |
|------|----------|---------|
| 18789 | HTTP/WS | Gateway API, Dashboard, WebSocket control plane |

### Health check

```bash
# CLI
openclaw status --verbose
openclaw doctor
openclaw channels status --probe

# HTTP
curl -s http://localhost:18789/healthz

# Live logs
openclaw logs --follow
```

### ARM vs x86 differences
- **None for core OpenClaw.** Pure Node.js, runs identically on both architectures.

---

## 2. Mem0 OSS Plugin (@mem0/openclaw-mem0)

### What it is
A memory plugin that auto-captures conversation context into vector embeddings and auto-recalls relevant memories on each message. Uses Qdrant as vector backend, OpenAI for embeddings and extraction.

### Installation

```bash
# Install via OpenClaw plugin system
openclaw plugins install @mem0/openclaw-mem0

# Verify it landed
ls ~/.openclaw/extensions/openclaw-mem0/
```

**Installed version:** 0.1.2

### Config (inside openclaw.json `plugins.entries.openclaw-mem0`)

```json
{
  "enabled": true,
  "config": {
    "mode": "open-source",
    "userId": "PLACEHOLDER_USERNAME",
    "autoCapture": true,
    "autoRecall": true,
    "enableGraph": false,
    "topK": 5,
    "searchThreshold": 0.3,
    "oss": {
      "embedder": {
        "provider": "openai",
        "config": {
          "model": "text-embedding-3-small",
          "embeddingDims": 1536,
          "apiKey": "PLACEHOLDER_OPENAI_KEY"
        }
      },
      "vectorStore": {
        "provider": "qdrant",
        "config": {
          "url": "http://localhost:6333",
          "collectionName": "PLACEHOLDER_COLLECTION_NAME",
          "embeddingModelDims": 1536
        }
      },
      "llm": {
        "provider": "openai",
        "config": {
          "model": "gpt-4.1-nano",
          "apiKey": "PLACEHOLDER_OPENAI_KEY"
        }
      },
      "historyDbPath": "/home/PLACEHOLDER_USER/clawd/mem0-history.db"
    }
  }
}
```

The plugin must be registered in the memory slot:

```json
"plugins": {
  "slots": {
    "memory": "openclaw-mem0"
  }
}
```

### Key settings explained

| Setting | Value | Purpose |
|---------|-------|---------|
| `mode` | `open-source` | Self-hosted (not Mem0 cloud) |
| `autoCapture` | `true` | Automatically extract + store memories from conversations |
| `autoRecall` | `true` | Automatically retrieve relevant memories on each message |
| `topK` | `5` | Return top 5 most relevant memories |
| `searchThreshold` | `0.3` | Minimum similarity score (0-1) to include a result |
| `enableGraph` | `false` | Knowledge graph feature (disabled) |
| `embedder.model` | `text-embedding-3-small` | OpenAI embedding model (1536 dims) |
| `llm.model` | `gpt-4.1-nano` | LLM used for memory extraction (cheapest option) |

### Dependencies
- **Qdrant** (Section 3) must be running on `localhost:6333`
- **OpenAI API key** for embeddings and LLM extraction
- **SQLite3** native binding (see troubleshooting below)

### Health check

```bash
# Check Qdrant collections
curl -s http://localhost:6333/collections | python3 -m json.tool

# Check memory history DB exists
ls -la ~/clawd/mem0-history.db

# Check plugin loads in gateway logs
openclaw logs --follow --plain | grep -i "mem0\|memory"
```

### Troubleshooting: sqlite3 native binding

On ARM64 (Pi5), jiti (OpenClaw's runtime) may fail to locate the sqlite3 native binary:

```bash
# Rebuild sqlite3 in the plugin directory
cd ~/.openclaw/extensions/openclaw-mem0
npm rebuild sqlite3

# If jiti still can't find it, symlink manually:
find /usr/lib/node_modules -name "node_sqlite3.node" 2>/dev/null
# Then symlink to where jiti expects it (adjust node version as needed):
sudo mkdir -p /usr/lib/node_modules/openclaw/node_modules/jiti/lib/binding/node-v137-linux-arm64/
sudo ln -s /path/to/node_sqlite3.node \
  /usr/lib/node_modules/openclaw/node_modules/jiti/lib/binding/node-v137-linux-arm64/node_sqlite3.node
```

### ARM vs x86 differences
- **sqlite3 binding path differs.** On x86 it would be `node-v137-linux-x64` instead of `node-v137-linux-arm64`. The rebuild step should handle this automatically on x86 without needing the manual symlink.

---

## 3. Qdrant

### What it is
Open-source vector database. Stores memory embeddings for the Mem0 plugin. Runs as a Docker container.

### Installation

```bash
# Install Docker first
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in

# Run Qdrant
docker run -d --name qdrant \
  -p 6333:6333 \
  -v /home/$USER/qdrant-data:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant
```

### Docker state (verified)

| Property | Value |
|----------|-------|
| Image | `qdrant/qdrant` |
| Restart policy | `unless-stopped` |
| Volume | `/home/$USER/qdrant-data` -> `/qdrant/storage` |
| Port mapping | `0.0.0.0:6333 -> 6333/tcp` |
| Also exposes | `6334/tcp` (gRPC, not mapped to host) |

### Collections (current state)

```bash
curl -s http://localhost:6333/collections
```

Response shows collections created by Mem0. Each bot personality gets its own collection. A `memory_migrations` collection is also auto-created by the plugin.

### Port

| Port | Protocol | Purpose |
|------|----------|---------|
| 6333 | HTTP | Qdrant REST API |
| 6334 | gRPC | Qdrant gRPC API (not mapped) |

### Health check

```bash
# REST health
curl -s http://localhost:6333/healthz
# Expected: {"title":"qdrant - vectorass engine","version":"..."}

# List collections
curl -s http://localhost:6333/collections | python3 -m json.tool

# Docker status
docker ps --filter name=qdrant
docker logs qdrant --tail 20
```

### ARM vs x86 differences
- **CRITICAL (ARM only):** Raspberry Pi 5 defaults to 16KB page sizes which causes jemalloc crashes in Qdrant. Fix by setting `kernel=kernel8.img` in `/boot/firmware/config.txt` and rebooting. **This is NOT needed on x86 VPS.**

---

## 4. SearXNG

### What it is
Self-hosted metasearch engine. Provides web search capability without needing Google/Bing API keys. OpenClaw connects to it via HTTP JSON API.

### Installation

```bash
docker run -d --name searxng \
  -p 8888:8080 \
  --restart always \
  -e SEARXNG_BASE_URL=http://localhost:8888 \
  searxng/searxng:latest
```

### Docker state (verified)

| Property | Value |
|----------|-------|
| Image | `searxng/searxng:latest` |
| Version | 2026.3.3 |
| Restart policy | `always` |
| Port mapping | `0.0.0.0:8888 -> 8080/tcp` |
| Volumes | Anonymous Docker volumes for `/etc/searxng` and `/var/cache/searxng` |
| Internal server | Granian (WSGI, 4 blocking threads) |

### Config: `/etc/searxng/settings.yml` (inside container)

Default SearXNG config with these notable settings:

```yaml
general:
  debug: false
  instance_name: "SearXNG"
  enable_metrics: true

search:
  safe_search: 0
  autocomplete: ""
  default_lang: "auto"
  ban_time_on_fail: 5
  max_ban_time_on_fail: 120
```

No customization was needed — defaults work fine.

### How OpenClaw connects

SearXNG is **NOT** configured in `openclaw.json`. Instead, it's accessed via:

1. **JSON API** — direct HTTP call from within the agent:
   ```
   http://localhost:8888/search?q=QUERY&format=json
   ```

2. **Shell script** (optional helper):
   ```bash
   # scripts/searxng-search.sh "query" [count]
   curl -s "http://localhost:8888/search?q=${1}&format=json" | python3 -m json.tool
   ```

3. **From chat** — Marigold uses `web_fetch` or `exec` tools to call the JSON API.

This is documented in the workspace file `~/clawd/TOOLS.md` so the agent knows how to use it.

### Port

| Port | Protocol | Purpose |
|------|----------|---------|
| 8888 | HTTP | SearXNG web UI + JSON API |

### Health check

```bash
# Web UI
curl -s http://localhost:8888 | head -5

# JSON API search test
curl -s "http://localhost:8888/search?q=test&format=json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d.get(\"results\",[]))} results')"

# Docker status
docker ps --filter name=searxng
docker logs searxng --tail 20
```

### ARM vs x86 differences
- **None.** SearXNG Docker image supports both architectures natively.

---

## 5. Chromium Headless

### What it is
Headless Chromium browser running as a systemd service, exposing Chrome DevTools Protocol (CDP) on port 9222. OpenClaw connects to it in "attach mode" for browser automation tasks.

### Installation

```bash
# On Debian/Ubuntu
sudo apt install -y chromium

# On Ubuntu (may need snap or chromium-browser package)
sudo apt install -y chromium-browser
```

**Installed version:** Chromium 144.0.7559.59

### Systemd service: `~/.config/systemd/user/chromium-debug.service`

```ini
[Unit]
Description=Chromium with Remote Debugging
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/chromium --headless --no-sandbox --disable-gpu --remote-debugging-port=9222 --user-data-dir=/home/PLACEHOLDER_USER/.chromium-openclaw
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable chromium-debug.service
systemctl --user start chromium-debug.service
```

> **Note:** On Ubuntu x86, the binary may be `chromium-browser` instead of `chromium`. Adjust `ExecStart` accordingly.

### OpenClaw config (in openclaw.json)

```json
{
  "browser": {
    "enabled": true,
    "defaultProfile": "user",
    "profiles": {
      "user": {
        "driver": "existing-session",
        "attachOnly": true,
        "color": "#00AA00"
      }
    }
  }
}
```

OpenClaw auto-detects the CDP endpoint at `localhost:9222`.

### Key paths

| Path | Purpose |
|------|---------|
| `/home/$USER/.chromium-openclaw/` | Chromium user data directory (cookies, cache, sessions) |

### Port

| Port | Protocol | Purpose |
|------|----------|---------|
| 9222 | HTTP/WS | Chrome DevTools Protocol (CDP) |

### Health check

```bash
# Check CDP is responding
curl -s http://localhost:9222/json/version | python3 -m json.tool

# Via OpenClaw CLI
openclaw browser profiles
openclaw browser --browser-profile user status

# Service status
systemctl --user status chromium-debug.service
```

### RAM usage
~870MB on the Pi5. Expect similar or slightly lower on x86 VPS with more efficient memory management.

### ARM vs x86 differences
- **Binary name may differ.** `chromium` on Debian/Pi OS, `chromium-browser` on Ubuntu.
- **`--no-sandbox`** is needed when running as a non-root systemd user service on both architectures.
- **`--disable-gpu`** is essential for headless (no GPU available).

---

## 6. ACPX (Agent Client Protocol)

### What it is
A bundled OpenClaw plugin that bridges the gateway to external coding agents (Claude Code, Codex) via the Agent Client Protocol. When Marigold needs to do coding work, she delegates to a Claude Code session running in the background.

### Installation

ACPX is **bundled with OpenClaw** — no separate installation needed. But the backend agent (Claude Code CLI) must be installed:

```bash
# Install Claude Code CLI
sudo npm install -g @anthropic/claude-code

# Verify
claude --version
# Expected: 2.1.81 (Claude Code) or newer
```

The ACPX plugin is registered from its bundled path:

```json
"plugins": {
  "load": {
    "paths": [
      "/usr/lib/node_modules/openclaw/extensions/acpx"
    ]
  },
  "entries": {
    "acpx": { "enabled": true }
  },
  "installs": {
    "acpx": {
      "source": "path",
      "spec": "@openclaw/acpx",
      "sourcePath": "/usr/lib/node_modules/openclaw/extensions/acpx",
      "installPath": "/usr/lib/node_modules/openclaw/extensions/acpx"
    }
  }
}
```

### Config (in openclaw.json)

```json
{
  "acp": {
    "enabled": true,
    "dispatch": {
      "enabled": true
    },
    "backend": "acpx",
    "defaultAgent": "claude",
    "allowedAgents": ["claude", "codex"],
    "maxConcurrentSessions": 4
  }
}
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `backend` | `acpx` | Use the bundled ACPX plugin |
| `defaultAgent` | `claude` | Default to Claude Code for coding tasks |
| `allowedAgents` | `["claude", "codex"]` | Also allow OpenAI Codex if installed |
| `maxConcurrentSessions` | `4` | Max parallel coding sessions |

### No dedicated port
ACPX communicates with Claude Code via stdio (spawns a subprocess). No network port needed.

### Health check

```bash
# From Telegram chat:
/acp doctor

# Or verify Claude Code CLI is accessible:
claude --version
which claude
# Expected: /usr/bin/claude
```

### Dependencies
- Claude Code CLI (`@anthropic/claude-code`) installed globally
- `ANTHROPIC_API_KEY` in the environment (provided via `~/.openclaw/env`)

### ARM vs x86 differences
- **None.** Both Claude Code CLI and ACPX are pure Node.js.

---

## 7. ClawTeam

### What it is
A Python CLI tool for orchestrating multi-agent swarms. Creates teams of AI agents (each in its own tmux window + git worktree), with filesystem-based messaging, task dependencies, and kanban monitoring.

### Installation

```bash
# Install tmux
sudo apt install -y tmux

# Verify
tmux -V
# Expected: tmux 3.5a (or newer)

# Create Python venv
python3 -m venv ~/clawteam-env

# Install ClawTeam from GitHub
~/clawteam-env/bin/pip install git+https://github.com/win4r/ClawTeam-OpenClaw.git

# Verify
~/clawteam-env/bin/clawteam --version
# Expected: clawteam v0.3.0

# Create symlink for PATH access
mkdir -p ~/bin
ln -sf ~/clawteam-env/bin/clawteam ~/bin/clawteam

# Add to PATH (add to ~/.bashrc)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Installed version:** 0.1.1 (pip package) / v0.3.0 (CLI reports)
**Dependencies:** pydantic, rich, typer (auto-installed)

### Key paths

| Path | Purpose |
|------|---------|
| `~/clawteam-env/` | Python virtual environment |
| `~/bin/clawteam` | Symlink to venv binary |
| `~/.clawteam/` | ClawTeam data directory (teams, tasks, inboxes) |
| `~/clawd/skills/clawteam/SKILL.md` | OpenClaw skill file (273 lines) |

### How it runs
ClawTeam is **on-demand, not a daemon**. It spawns tmux sessions when you create teams and agents. Each agent runs as a separate process inside a tmux window.

### OpenClaw integration
A skill file at `~/clawd/skills/clawteam/SKILL.md` teaches the agent how to use ClawTeam commands. From Telegram, you can say things like:
- "Create a team to review my code"
- "Spawn 3 agents to research X, Y, Z"

The agent then runs `clawteam` CLI commands via `exec`.

### No dedicated port
Uses tmux + filesystem IPC. The optional web board serves on a user-specified port:

```bash
clawteam board serve --port 8080  # Optional, on-demand only
```

### Health check

```bash
# CLI works
clawteam --version
clawteam config health

# Tmux available
tmux -V

# List existing teams
clawteam team list
```

### Quick reference

```bash
# Create a team
clawteam team spawn-team my-team -d "Task description" -n leader

# Spawn worker agents
clawteam spawn --team my-team --agent-name alice --task "Sub-task 1"
clawteam spawn --team my-team --agent-name bob --task "Sub-task 2"

# Monitor
clawteam board show my-team       # Terminal kanban
clawteam board live my-team       # Auto-refresh
clawteam board attach my-team     # Tiled tmux view

# Messaging
clawteam inbox send my-team leader "Status update"
clawteam inbox receive my-team
clawteam inbox peek my-team

# Task management
clawteam task list my-team
clawteam task create my-team "New task" --blocked-by "other-task"
clawteam task wait my-team

# Templates
clawteam launch hedge-fund --team fund1 --goal "Analyze AAPL"
clawteam launch code-review --team review1
```

### ARM vs x86 differences
- **None.** Pure Python + tmux. Runs identically on both architectures.

---

## 8. Gateway Watchdog

### What it is
A bash script that monitors Telegram API reachability every 60 seconds. After 3 consecutive failures, it automatically restarts the OpenClaw gateway service. Designed to handle VPN dropouts and transient network issues.

### Script: `~/scripts/gateway-watchdog.sh`

```bash
#!/bin/bash
# OpenClaw Gateway Watchdog
# Pings Telegram API every 60s. 3 consecutive failures -> restart gateway.

LOG=/tmp/openclaw/watchdog.log
MAX_FAILS=3
FAIL_COUNT=0
CHECK_INTERVAL=60

# Read bot token from config
BOT_TOKEN=$(python3 -c "
import json
with open('/home/PLACEHOLDER_USER/.openclaw/openclaw.json') as f:
    cfg = json.load(f)
print(cfg['channels']['telegram']['botToken'])
")

if [ -z "$BOT_TOKEN" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] Cannot read bot token from config" >> $LOG
    exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') [START] Watchdog started (check every ${CHECK_INTERVAL}s, max fails: ${MAX_FAILS})" >> $LOG

while true; do
    if curl -sf --max-time 10 "https://api.telegram.org/bot${BOT_TOKEN}/getMe" > /dev/null 2>&1; then
        if [ $FAIL_COUNT -gt 0 ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') [RECOVERED] Connection restored after ${FAIL_COUNT} failure(s)" >> $LOG
        fi
        FAIL_COUNT=0
    else
        ((FAIL_COUNT++))
        echo "$(date '+%Y-%m-%d %H:%M:%S') [FAIL] Telegram API unreachable (${FAIL_COUNT}/${MAX_FAILS})" >> $LOG
        if [ $FAIL_COUNT -ge $MAX_FAILS ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') [RESTART] Restarting openclaw-gateway.service" >> $LOG
            systemctl --user restart openclaw-gateway.service
            FAIL_COUNT=0
            sleep 30
            continue
        fi
    fi
    sleep $CHECK_INTERVAL
done
```

### Setup

```bash
mkdir -p ~/scripts /tmp/openclaw

# Create the script (paste content above)
nano ~/scripts/gateway-watchdog.sh
chmod +x ~/scripts/gateway-watchdog.sh
```

### Systemd service: `~/.config/systemd/user/openclaw-watchdog.service`

```ini
[Unit]
Description=OpenClaw Gateway Watchdog
After=openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=simple
ExecStart=/home/PLACEHOLDER_USER/scripts/gateway-watchdog.sh
Restart=always
RestartSec=5
Environment=XDG_RUNTIME_DIR=/run/user/PLACEHOLDER_UID
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/PLACEHOLDER_UID/bus

[Install]
WantedBy=default.target
```

> Replace `PLACEHOLDER_UID` with the output of `id -u` (typically `1000`).

```bash
systemctl --user daemon-reload
systemctl --user enable openclaw-watchdog.service
systemctl --user start openclaw-watchdog.service
```

### Logic flow

```
Every 60s:
  curl Telegram getMe API (10s timeout)
    |
    +-- OK     --> reset fail count
    +-- FAIL   --> increment fail count
                   |
                   +-- < 3 fails  --> continue
                   +-- >= 3 fails --> restart gateway, sleep 30s, reset
```

### Health check

```bash
# Service running
systemctl --user status openclaw-watchdog.service

# View logs
tail -50 /tmp/openclaw/watchdog.log

# Expected log entries:
# [START] Watchdog started ...
# [FAIL] Telegram API unreachable (1/3)
# [RECOVERED] Connection restored after 2 failure(s)
# [RESTART] Restarting openclaw-gateway.service
```

### Dependencies
- `curl` (pre-installed on Ubuntu)
- `python3` (for reading bot token from JSON config)
- OpenClaw gateway service must be registered as a systemd user service

### ARM vs x86 differences
- **None.** Pure bash script.

---

## Component Dependency Map

```
                    Internet
                       |
              [WireGuard VPN (optional)]
                       |
         +-------------+-------------+
         |                           |
  SearXNG :8888               Telegram API
  (Docker, no auth)                  |
         |                           |
         +----------+  +------------+
                    |  |
              OpenClaw Gateway :18789
              (systemd user service)
                    |
       +------------+------------+--------+
       |            |            |        |
   Mem0 Plugin   Browser     ACPX     ClawTeam
       |         (CDP)     (stdio)    (tmux)
       |            |            |
   Qdrant :6333  Chromium    Claude Code
   (Docker)      :9222         CLI
                 (systemd)
```

### Startup order

1. Docker containers (Qdrant, SearXNG) — auto-start via `--restart` policy
2. Chromium headless — systemd user service
3. OpenClaw Gateway — systemd user service (reads config, connects to Qdrant + Chromium)
4. Gateway Watchdog — systemd user service (depends on gateway)
5. VPN Watchdog — systemd user service (if using VPN)
6. ClawTeam — on-demand only, not a daemon

---

## Version Summary (as of 2026-03-25)

| Component | Version | Package |
|-----------|---------|---------|
| Node.js | v24.13.0 | nodesource |
| npm | 11.6.2 | bundled |
| OpenClaw | 2026.3.13 | `openclaw` (npm global) |
| Mem0 plugin | 0.1.2 | `@mem0/openclaw-mem0` (npm) |
| Qdrant | latest | `qdrant/qdrant` (Docker) |
| SearXNG | 2026.3.3 | `searxng/searxng:latest` (Docker) |
| Chromium | 144.0.7559.59 | `chromium` (apt) |
| Claude Code CLI | 2.1.81 | `@anthropic/claude-code` (npm global) |
| ClawTeam | v0.3.0 | `git+https://github.com/win4r/ClawTeam-OpenClaw.git` (pip) |
| tmux | 3.5a | `tmux` (apt) |
| Python | 3.13.5 | system |
