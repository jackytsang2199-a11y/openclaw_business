#!/bin/bash
set -euo pipefail
CLIENT_ID="${1:?Usage: contabo-destroy.sh <CLIENT_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

source "$SCRIPT_DIR/../.env"
source "$SCRIPT_DIR/../clients/$CLIENT_ID/server-info.env"

if [ "${PROVIDER:-}" != "contabo" ]; then
  echo "[destroy] ERROR: $CLIENT_ID is not a Contabo instance (provider=${PROVIDER:-unknown})"
  exit 1
fi

echo "[destroy] Getting Contabo auth token..."
TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")

echo "[destroy] Cancelling instance $SERVER_ID (nexgen-$CLIENT_ID)..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.contabo.com/v1/compute/instances/${SERVER_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: $(python3 -c 'import uuid; print(uuid.uuid4())')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[destroy] Instance $SERVER_ID cancellation requested."
else
  echo "[destroy] WARNING: HTTP $HTTP_CODE — check Contabo dashboard."
  echo "$RESPONSE" | head -1
fi
