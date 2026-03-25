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

log "Creating 2GB swap..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Persist across reboots
if ! grep -q '/swapfile' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

log "Swap created and enabled."
swapon --show
