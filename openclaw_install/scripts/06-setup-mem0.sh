#!/bin/bash
set -euo pipefail
SCRIPT_NAME="06-setup-mem0"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus

# Idempotent check
if [ -d ~/.openclaw/extensions/openclaw-mem0 ]; then
  log "Mem0 plugin already installed. Skipping install."
else
  log "Installing @mem0/openclaw-mem0 plugin..."
  # Stop gateway for plugin install
  systemctl --user stop openclaw-gateway.service 2>/dev/null || true
  openclaw plugins install @mem0/openclaw-mem0
fi

# Rebuild sqlite3 for current arch
log "Rebuilding sqlite3 native binding..."
cd ~/.openclaw/extensions/openclaw-mem0
npm rebuild sqlite3

# Create workspace dir for history DB
mkdir -p ~/clawd

log "Mem0 plugin installed. Config must be set in openclaw.json by configure-env.sh"
log "Required config: oss.embedder (OpenAI), oss.vectorStore (Qdrant), oss.llm (DeepSeek)"
