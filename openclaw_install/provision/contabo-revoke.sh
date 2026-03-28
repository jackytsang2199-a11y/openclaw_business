#!/bin/bash
# Revoke a pending Contabo cancellation (for VPS recycling).
# Usage: ./contabo-revoke.sh <INSTANCE_ID>
# Must be called BEFORE the scheduled termination date.
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-revoke.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID=$(python3 -c "import uuid; print(uuid.uuid4())")

echo "[revoke] Revoking cancellation for instance $INSTANCE_ID..."

# NOTE: Exact endpoint TBD — verify during P2 testing.
# Contabo support confirmed revocation is possible via control panel.
# API endpoint may be: PATCH /v1/compute/instances/{id} with cancel=false
# or: DELETE /v1/compute/instances/{id}/cancel
# Adjust after P2 testing.
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d '{"cancel": false}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[revoke] Cancellation revoked successfully."
else
  echo "[revoke] ERROR: HTTP $HTTP_CODE — may need manual panel revocation" >&2
  echo "$RESPONSE" | head -1 | jq . >&2
  exit 1
fi
