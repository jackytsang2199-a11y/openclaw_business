#!/bin/bash
# QA Layer 2: Port Check — verify expected ports are listening
set -euo pipefail
PASS=0; FAIL=0

check_port() {
  local name="$1" port="$2" bind="${3:-any}"
  if ss -tlnp | grep -q ":${port} "; then
    if [ "$bind" = "localhost" ]; then
      if ss -tlnp | grep ":${port} " | grep -qE '127\.0\.0\.1|::1'; then
        echo "[PASS] $name (port $port, localhost only)"
        PASS=$((PASS+1))
      else
        echo "[FAIL] $name (port $port, expected localhost but bound to 0.0.0.0)"
        FAIL=$((FAIL+1))
      fi
    else
      echo "[PASS] $name (port $port)"
      PASS=$((PASS+1))
    fi
  else
    echo "[FAIL] $name (port $port not listening)"
    FAIL=$((FAIL+1))
  fi
}

echo "=== QA Layer 2: Port Check ==="

check_port "Qdrant" 6333
check_port "SearXNG" 8888
check_port "OpenClaw gateway" 18789 localhost
check_port "Chrome CDP" 9222 localhost

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
