#!/bin/bash
# Contabo API does NOT support revoking cancellations.
# Verified 2026-04-06: PATCH/DELETE /cancel endpoints return 404.
# PATCH /instances/{id} with cancelDate accepts 200 but ignores the field.
#
# Revocation MUST be done manually via Contabo control panel:
#   https://my.contabo.com/compute → instance → "Undo cancellation"
#
# This script now VERIFIES that revocation was done (checks cancelDate is cleared)
# rather than attempting to revoke via API.
#
# Usage: ./contabo-revoke.sh <INSTANCE_ID>
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-revoke.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID=$(python3 -c "import uuid; print(uuid.uuid4())")

echo "[revoke] Checking cancellation status for instance $INSTANCE_ID..."

RESPONSE=$(curl -s \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}")

CANCEL_DATE=$(echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
inst = data.get('data', [{}])
if isinstance(inst, list):
    inst = inst[0] if inst else {}
print(inst.get('cancelDate') or 'NONE')
" 2>/dev/null || echo "ERROR")

if [ "$CANCEL_DATE" = "NONE" ]; then
  echo "[revoke] Cancellation already revoked (no cancelDate). OK to proceed."
  exit 0
elif [ "$CANCEL_DATE" = "ERROR" ]; then
  echo "[revoke] ERROR: Could not query instance status" >&2
  exit 1
else
  echo "[revoke] BLOCKED: Instance $INSTANCE_ID still has cancelDate=$CANCEL_DATE" >&2
  echo "[revoke] Please revoke manually in Contabo panel:" >&2
  echo "[revoke]   https://my.contabo.com/compute → instance $INSTANCE_ID → Undo cancellation" >&2
  echo "[revoke] Then re-run this script to verify." >&2
  exit 1
fi
