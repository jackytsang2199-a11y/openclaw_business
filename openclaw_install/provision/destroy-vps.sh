#!/bin/bash
set -euo pipefail
CLIENT_ID="${1:?Usage: destroy-vps.sh <CLIENT_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

source "$SCRIPT_DIR/../.env"
source "$SCRIPT_DIR/../clients/$CLIENT_ID/server-info.env"

echo "[destroy] Deleting server $SERVER_ID (nexgen-$CLIENT_ID)..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE \
  "https://api.hetzner.cloud/v1/servers/$SERVER_ID" \
  -H "Authorization: Bearer $HETZNER_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[destroy] Server $SERVER_ID deleted successfully."
else
  echo "[destroy] WARNING: HTTP $HTTP_CODE — server may already be deleted."
  echo "$RESPONSE" | head -1
fi
