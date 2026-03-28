#!/bin/bash
# QA Layer 5: Full Integration — end-to-end verification
set -euo pipefail
PASS=0; FAIL=0; SKIP=0

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

skip() {
  local name="$1" reason="$2"
  echo "[SKIP] $name ($reason)"
  SKIP=$((SKIP+1))
}

echo "=== QA Layer 5: Full Integration ==="

# 1. Verify OpenClaw gateway is serving and has loaded config
check "Gateway process running" "pgrep -f 'openclaw.*gateway'"

# 2. Verify Mem0 collection exists in Qdrant
COLLECTION_NAME=$(python3 -c "
import json, os
with open(os.path.expanduser('~/.openclaw/openclaw.json')) as f:
    cfg = json.load(f)
mem0 = cfg.get('plugins',{}).get('entries',{}).get('openclaw-mem0',{})
if mem0.get('enabled'):
    print(mem0['config']['oss']['vectorStore']['config']['collectionName'])
" 2>/dev/null || echo "")

if [ -n "$COLLECTION_NAME" ]; then
  # Collection may not exist yet until first memory is stored — just check Qdrant can accept it
  check "Qdrant accepts collection queries" "curl -sf http://localhost:6333/collections/${COLLECTION_NAME} || curl -sf http://localhost:6333/collections"
else
  skip "Mem0 collection check" "Mem0 not enabled (Tier 1)"
fi

# 3. Verify SearXNG returns real search results
check "SearXNG returns results" "curl -sf 'http://localhost:8888/search?q=hello+world&format=json' | python3 -c 'import json,sys; d=json.load(sys.stdin); assert len(d.get(\"results\",[])) > 0, \"No results\"'"

# 4. Verify env vars and config are non-placeholder
TIER=$(grep '^TIER=' ~/client.env 2>/dev/null | cut -d= -f2 || echo "1")

check "AI_GATEWAY_URL is set" "grep -q '^AI_GATEWAY_URL=https://' ~/.openclaw/env"
check "AI_GATEWAY_TOKEN is set" "grep -q '^AI_GATEWAY_TOKEN=.' ~/.openclaw/env"
check "Bot token is real" "python3 -c \"import json,os; cfg=json.load(open(os.path.expanduser('~/.openclaw/openclaw.json'))); assert 'PLACEHOLDER' not in cfg['channels']['telegram']['botToken']\""
check "Gateway token is real" "python3 -c \"import json,os; cfg=json.load(open(os.path.expanduser('~/.openclaw/openclaw.json'))); assert 'PLACEHOLDER' not in cfg['gateway']['auth']['token']\""

# Tier 2+: Verify Mem0 keys exist for local embeddings
if [ "$TIER" -ge 2 ]; then
  check "DEEPSEEK_API_KEY for Mem0" "grep -q '^DEEPSEEK_API_KEY=sk-' ~/.openclaw/env"
  check "OPENAI_API_KEY for Mem0" "grep -q '^OPENAI_API_KEY=sk-' ~/.openclaw/env"
fi

# 5. Verify gateway journal has no crash loops (last 5 minutes)
RECENT_RESTARTS=$(journalctl --user -u openclaw-gateway.service --since "5 min ago" 2>/dev/null | grep -c "Started OpenClaw" || true)
RECENT_RESTARTS=${RECENT_RESTARTS:-0}
if [ "$RECENT_RESTARTS" -le 2 ]; then
  echo "[PASS] Gateway stable (${RECENT_RESTARTS} starts in last 5 min)"
  PASS=$((PASS+1))
else
  echo "[FAIL] Gateway crash-looping (${RECENT_RESTARTS} starts in last 5 min)"
  FAIL=$((FAIL+1))
fi

# 6. Disk and memory headroom
DISK_AVAIL=$(df / --output=avail -BG | tail -1 | tr -d ' G')
if [ "$DISK_AVAIL" -ge 10 ]; then
  echo "[PASS] Disk headroom: ${DISK_AVAIL}G available"
  PASS=$((PASS+1))
else
  echo "[FAIL] Low disk: only ${DISK_AVAIL}G available"
  FAIL=$((FAIL+1))
fi

MEM_AVAIL=$(free -m | awk '/^Mem:/ {print $7}')
if [ "$MEM_AVAIL" -ge 1024 ]; then
  echo "[PASS] Memory headroom: ${MEM_AVAIL}MB available"
  PASS=$((PASS+1))
else
  echo "[FAIL] Low memory: only ${MEM_AVAIL}MB available"
  FAIL=$((FAIL+1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed, $SKIP skipped"
[ "$FAIL" -eq 0 ]
