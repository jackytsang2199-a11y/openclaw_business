#!/bin/bash
set -euo pipefail
SCRIPT_NAME="05-setup-qdrant"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

# Idempotent check
if docker ps --filter name=qdrant --format '{{.Names}}' 2>/dev/null | grep -q qdrant; then
  log "Qdrant already running. Skipping."
  exit 0
fi

# Check if stopped container exists
if docker ps -a --filter name=qdrant --format '{{.Names}}' 2>/dev/null | grep -q qdrant; then
  log "Qdrant container exists but stopped. Starting..."
  docker start qdrant
else
  log "Starting Qdrant..."
  docker run -d --name qdrant --restart unless-stopped \
    -p 6333:6333 \
    -v qdrant_data:/qdrant/storage \
    qdrant/qdrant:latest
fi

# Wait for health
log "Waiting for Qdrant to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:6333/healthz &>/dev/null; then
    log "Qdrant is healthy."
    docker ps --filter name=qdrant --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
    exit 0
  fi
  sleep 1
done

error "Qdrant failed to become healthy within 30s"
