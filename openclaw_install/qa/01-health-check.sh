#!/bin/bash
# QA Layer 1: Health Check — verify all services and containers are running
set -euo pipefail
PASS=0; FAIL=0; WARN=0

export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus

check() {
  local name="$1" cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "[PASS] $name"
    PASS=$((PASS+1))
  else
    echo "[FAIL] $name"
    FAIL=$((FAIL+1))
  fi
}

check_warn() {
  local name="$1" cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "[PASS] $name"
    PASS=$((PASS+1))
  else
    echo "[WARN] $name (optional)"
    WARN=$((WARN+1))
  fi
}

echo "=== QA Layer 1: Health Check ==="

# Core services
check "OpenClaw gateway" "systemctl --user is-active openclaw-gateway.service"
check "Qdrant container" "docker ps --filter name=qdrant --filter status=running -q | grep -q ."
check "SearXNG container" "docker ps --filter name=searxng --filter status=running -q | grep -q ."
check "Gateway watchdog" "systemctl --user is-active openclaw-watchdog.service"

# Tier 3 services (optional)
check_warn "Chromium headless" "systemctl --user is-active chromium-debug.service"

# System health
check "Docker daemon" "docker info"
check "Swap enabled" "swapon --show | grep -q ."

echo ""
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
[ "$FAIL" -eq 0 ]
