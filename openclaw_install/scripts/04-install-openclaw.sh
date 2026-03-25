#!/bin/bash
set -euo pipefail
SCRIPT_NAME="04-install-openclaw"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Idempotent check
if command -v openclaw &>/dev/null; then
  OC_VER=$(openclaw --version 2>/dev/null || echo "unknown")
  log "OpenClaw already installed: $OC_VER. Skipping install."
else
  log "Installing OpenClaw..."
  sudo npm install -g openclaw@latest
  log "OpenClaw installed: $(openclaw --version)"
fi

# Ensure directories exist
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/agents/main/sessions
mkdir -p ~/clawd
mkdir -p ~/scripts
mkdir -p ~/.config/systemd/user
chmod 700 ~/.openclaw

# Create compile cache
mkdir -p /var/tmp/openclaw-compile-cache

# Enable user linger for systemd user services
loginctl enable-linger $(whoami) 2>/dev/null || true

export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus

# Create openclaw.json from template if not exists
if [ ! -f ~/.openclaw/openclaw.json ]; then
  log "Creating openclaw.json..."
  cat > ~/.openclaw/openclaw.json << 'JSON_EOF'
{
  "browser": {
    "enabled": false
  },
  "auth": {
    "profiles": {
      "deepseek:default": {
        "provider": "openai-compatible",
        "mode": "token"
      }
    }
  },
  "acp": {
    "enabled": false
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "deepseek/deepseek-chat"
      },
      "workspace": "WORKSPACE_PLACEHOLDER",
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
        "model": "deepseek/deepseek-chat"
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
      "owner": ["telegram:TELEGRAM_USER_ID_PLACEHOLDER"]
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "dmPolicy": "allowlist",
      "botToken": "TELEGRAM_BOT_TOKEN_PLACEHOLDER",
      "allowFrom": ["TELEGRAM_USER_ID_PLACEHOLDER"],
      "groupPolicy": "allowlist",
      "streaming": "partial"
    }
  },
  "gateway": {
    "port": 18789,
    "mode": "local",
    "bind": "loopback",
    "controlUi": {
      "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789"
      ]
    },
    "auth": {
      "mode": "token",
      "token": "GATEWAY_TOKEN_PLACEHOLDER"
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
      "paths": []
    },
    "slots": {},
    "entries": {
      "telegram": { "enabled": true }
    },
    "installs": {}
  }
}
JSON_EOF
  # Replace placeholders
  WORKSPACE=$(echo ~/clawd)
  sed -i "s|WORKSPACE_PLACEHOLDER|$WORKSPACE|g" ~/.openclaw/openclaw.json
  chmod 600 ~/.openclaw/openclaw.json
  log "openclaw.json created. Placeholders need to be filled by configure-env.sh"
else
  log "openclaw.json already exists. Skipping."
fi

# Create env file if not exists
if [ ! -f ~/.openclaw/env ]; then
  log "Creating env file..."
  cat > ~/.openclaw/env << 'ENV_EOF'
DEEPSEEK_API_KEY=PLACEHOLDER
OPENAI_API_KEY=PLACEHOLDER
ENV_EOF
  chmod 600 ~/.openclaw/env
  log "env file created. Keys need to be injected by configure-env.sh"
else
  log "env file already exists. Skipping."
fi

# Create systemd service
cat > ~/.config/systemd/user/openclaw-gateway.service << 'SVC_EOF'
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /usr/lib/node_modules/openclaw/dist/index.js gateway --port 18789
Restart=always
RestartSec=5
EnvironmentFile=%h/.openclaw/env
Environment=OPENCLAW_GATEWAY_PORT=18789
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Environment=OPENCLAW_NO_RESPAWN=1
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=default.target
SVC_EOF

systemctl --user daemon-reload
systemctl --user enable openclaw-gateway.service

log "OpenClaw installation complete. Gateway service enabled."
log "Start with: systemctl --user start openclaw-gateway.service"
