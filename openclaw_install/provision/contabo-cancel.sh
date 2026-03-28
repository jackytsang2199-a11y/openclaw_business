#!/bin/bash
# Submit Contabo billing cancellation for a VPS.
# Usage: ./contabo-cancel.sh <INSTANCE_ID>
# The VPS stays running until Contabo's scheduled termination date (~4 weeks).
# Cancellation can be revoked before that date (see contabo-revoke.sh).
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-cancel.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID=$(python3 -c "import uuid; print(uuid.uuid4())")

echo "[cancel] Submitting cancellation for instance $INSTANCE_ID..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Product not needed anymore"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  CANCEL_DATE=$(echo "$BODY" | jq -r '.data[0].cancelDate // .data.cancelDate // "unknown"')
  echo "[cancel] Cancellation submitted. Termination date: $CANCEL_DATE"
  echo "$CANCEL_DATE"
else
  echo "[cancel] ERROR: HTTP $HTTP_CODE" >&2
  echo "$BODY" | jq . >&2
  exit 1
fi
