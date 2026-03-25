#!/bin/bash
# QA Layer 3: API Check — verify service APIs respond correctly
set -euo pipefail
PASS=0; FAIL=0

check_api() {
  local name="$1" cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo "[PASS] $name"
    PASS=$((PASS+1))
  else
    echo "[FAIL] $name"
    FAIL=$((FAIL+1))
  fi
}

echo "=== QA Layer 3: API Check ==="

# Qdrant health
check_api "Qdrant health" "curl -sf http://localhost:6333/healthz"

# Qdrant collections endpoint
check_api "Qdrant collections" "curl -sf http://localhost:6333/collections"

# SearXNG JSON search
check_api "SearXNG JSON search" "curl -sf 'http://localhost:8888/search?q=test&format=json' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert \"results\" in d'"

# Chrome CDP
check_api "Chrome CDP version" "curl -sf http://localhost:9222/json/version | python3 -c 'import json,sys; d=json.load(sys.stdin); assert \"Browser\" in d'"

# OpenClaw gateway (check if it responds — may not have a health endpoint)
check_api "OpenClaw gateway" "curl -sf --max-time 5 http://localhost:18789/ || curl -sf --max-time 5 -o /dev/null -w '%{http_code}' http://localhost:18789/ | grep -qE '2[0-9]{2}|401|403'"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
