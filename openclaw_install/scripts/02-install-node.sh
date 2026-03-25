#!/bin/bash
set -euo pipefail
SCRIPT_NAME="02-install-node"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Idempotent check
if command -v node &>/dev/null; then
  NODE_VER=$(node --version)
  log "Node.js already installed: $NODE_VER. Skipping."
  exit 0
fi

log "Installing Node.js LTS via nodesource..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

log "Verifying installation..."
node --version
npm --version

log "Node.js installation complete."
