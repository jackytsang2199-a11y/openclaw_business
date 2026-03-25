#!/bin/bash
set -euo pipefail
SCRIPT_NAME="12-setup-acpx"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Install Claude Code CLI
if command -v claude &>/dev/null; then
  log "Claude Code CLI already installed: $(claude --version 2>/dev/null || echo 'unknown')"
else
  log "Installing Claude Code CLI..."
  sudo npm install -g @anthropic-ai/claude-code
  log "Claude Code CLI installed: $(claude --version)"
fi

# ACPX is bundled with OpenClaw, just needs config in openclaw.json
# This will be done by configure-env.sh when enabling the tier

log "ACPX setup complete. Claude Code CLI available at: $(which claude)"
log "ACPX plugin is bundled with OpenClaw — enable in openclaw.json when needed."
