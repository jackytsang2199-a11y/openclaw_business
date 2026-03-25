#!/bin/bash
set -euo pipefail
SCRIPT_NAME="01-system-update"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive

log "Updating package lists..."
sudo apt-get update -y

log "Upgrading packages..."
sudo apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"

log "Installing essential packages..."
sudo apt-get install -y curl git ufw fail2ban ca-certificates gnupg htop jq python3 python3-venv

log "Cleaning up..."
sudo apt-get autoremove -y
sudo apt-get clean

log "System update complete."
