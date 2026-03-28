#!/bin/bash
# QA Layer 3: API Check — verify service APIs respond correctly
# Tier-aware: reads TIER from ~/client.env
set -euo pipefail
PASS=0; FAIL=0

TIER=$(grep '^TIER=' ~/client.env 2>/dev/null | cut -d= -f2 || echo "1")

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

skip() {
  local name="$1" reason="$2"
  echo "[SKIP] $name ($reason)"
}

echo "=== QA Layer 3: API Check (Tier $TIER) ==="

# OpenClaw gateway (all tiers)
check_api "OpenClaw gateway" "curl -sf --max-time 5 http://localhost:18789/ || curl -sf --max-time 5 -o /dev/null -w '%{http_code}' http://localhost:18789/ | grep -qE '2[0-9]{2}|401|403'"

# Qdrant (Tier 2+)
if [ "$TIER" -ge 2 ]; then
  check_api "Qdrant health" "curl -sf http://localhost:6333/healthz"
  check_api "Qdrant collections" "curl -sf http://localhost:6333/collections"
else
  skip "Qdrant" "Tier 1"
fi

# SearXNG (Tier 2+)
if [ "$TIER" -ge 2 ]; then
  check_api "SearXNG JSON search" "curl -sf 'http://localhost:8888/search?q=test&format=json' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert \"results\" in d'"
else
  skip "SearXNG" "Tier 1"
fi

# Chrome CDP (Tier 3 only)
if [ "$TIER" -ge 3 ]; then
  check_api "Chrome CDP version" "curl -sf http://localhost:9222/json/version | python3 -c 'import json,sys; d=json.load(sys.stdin); assert \"Browser\" in d'"
else
  skip "Chrome CDP" "Tier $TIER"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
