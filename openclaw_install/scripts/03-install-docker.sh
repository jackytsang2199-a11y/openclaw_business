#!/bin/bash
set -euo pipefail
SCRIPT_NAME="03-install-docker"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Idempotent check
if command -v docker &>/dev/null; then
  DOCKER_VER=$(docker --version)
  log "Docker already installed: $DOCKER_VER. Skipping."
  exit 0
fi

log "Installing Docker CE..."
curl -fsSL https://get.docker.com | sh

log "Adding deploy user to docker group..."
sudo usermod -aG docker deploy

log "Docker installation complete."
docker --version

log "NOTE: You may need to re-login for docker group to take effect."
log "Run 'newgrp docker' or reconnect SSH to use docker without sudo."
