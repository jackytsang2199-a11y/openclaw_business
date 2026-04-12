#!/bin/bash
# Reinstall OS on an existing Contabo VPS (for recycling).
# Usage: ./contabo-reinstall.sh <INSTANCE_ID>
# After reinstall, SSH will be ready in ~5-15 minutes.
set -euo pipefail

INSTANCE_ID="${1:?Usage: contabo-reinstall.sh <INSTANCE_ID>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")
REQUEST_ID=$(python3 -c "import uuid; print(uuid.uuid4())")
SSH_KEY_ID="${CONTABO_SSH_KEY_ID:?Set CONTABO_SSH_KEY_ID in .env}"
ROOT_PASSWORD_ID="${CONTABO_ROOT_PASSWORD_ID:?Set CONTABO_ROOT_PASSWORD_ID in .env}"
SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")

echo "[reinstall] Reinstalling OS on instance $INSTANCE_ID..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
  "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageId\": \"${CONTABO_IMAGE_ID:-d64d5c6c-9dda-4e38-8174-0ee282474d8a}\",
    \"defaultUser\": \"root\",
    \"rootPassword\": ${ROOT_PASSWORD_ID},
    \"sshKeys\": [${SSH_KEY_ID}],
    \"userData\": $(cat "$SCRIPT_DIR/cloud-init.yaml" | sed "s|SSH_PUBLIC_KEY_PLACEHOLDER|${SSH_PUB_KEY}|" | jq -Rs .)
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "[reinstall] OS reinstall initiated. Waiting for SSH..."

  # Poll for SSH readiness
  SERVER_IP=$(curl -s \
    -H "Authorization: Bearer $(bash "$SCRIPT_DIR/contabo-auth.sh")" \
    -H "x-request-id: $(python3 -c 'import uuid; print(uuid.uuid4())')" \
    "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}" \
    | jq -r '.data[0].ipConfig.v4.ip // empty')

  MAX_ATTEMPTS=40
  for i in $(seq 1 $MAX_ATTEMPTS); do
    # Try deploy user first (cloud-init creates it), fall back to root
    if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 \
       -i "$SSH_KEY_PATH" deploy@"$SERVER_IP" "echo SSH_READY" 2>/dev/null | grep -q SSH_READY ||
       ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=5 \
       -i "$SSH_KEY_PATH" root@"$SERVER_IP" "echo SSH_READY" 2>/dev/null | grep -q SSH_READY; then
      echo "[reinstall] SSH ready at $SERVER_IP"
      echo "$SERVER_IP"
      exit 0
    fi
    echo "[reinstall] Attempt $i/$MAX_ATTEMPTS — waiting 30s..."
    sleep 30
  done

  echo "[reinstall] WARNING: SSH not ready after $((MAX_ATTEMPTS * 30))s" >&2
  exit 1
else
  echo "[reinstall] ERROR: HTTP $HTTP_CODE" >&2
  echo "$RESPONSE" | head -1 | jq . >&2
  exit 1
fi
