#!/bin/bash
# QA Layer 4: Telegram Test — verify bot token is valid and API reachable
set -euo pipefail
PASS=0; FAIL=0

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

echo "=== QA Layer 4: Telegram Test ==="

# Read bot token from openclaw.json
BOT_TOKEN=$(python3 -c "
import json, os
with open(os.path.expanduser('~/.openclaw/openclaw.json')) as f:
    cfg = json.load(f)
print(cfg['channels']['telegram']['botToken'])
")

if [ -z "$BOT_TOKEN" ] || [ "$BOT_TOKEN" = "TELEGRAM_BOT_TOKEN_PLACEHOLDER" ]; then
  echo "[FAIL] Bot token not configured in openclaw.json"
  exit 1
fi

# Test getMe
check "Telegram getMe" "curl -sf https://api.telegram.org/bot${BOT_TOKEN}/getMe | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d[\"ok\"]'"

# Get bot info
BOT_INFO=$(curl -sf "https://api.telegram.org/bot${BOT_TOKEN}/getMe" 2>/dev/null)
if [ -n "$BOT_INFO" ]; then
  BOT_NAME=$(echo "$BOT_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['username'])" 2>/dev/null || echo "unknown")
  echo "  Bot username: @$BOT_NAME"
fi

# Test getUpdates (verifies polling works)
check "Telegram getUpdates" "curl -sf 'https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=1&timeout=1'"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
