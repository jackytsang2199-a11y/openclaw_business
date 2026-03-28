#!/bin/bash
set -euo pipefail

# Usage: ./contabo-create.sh <CLIENT_ID> [TIER]
CLIENT_ID="${1:?Usage: contabo-create.sh <CLIENT_ID> [TIER]}"
TIER="${2:-2}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

echo "[provision] Getting Contabo auth token..."
TOKEN=$(bash "$SCRIPT_DIR/contabo-auth.sh")

# SSH key ID (registered via Contabo API: POST /v1/secrets)
SSH_KEY_ID="${CONTABO_SSH_KEY_ID:?Set CONTABO_SSH_KEY_ID in .env (numeric ID from Contabo secrets API)}"
SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")

echo "[provision] Creating Contabo VPS for $CLIENT_ID (Tier $TIER)..."

# Contabo API: create instance
# productId: V92 = Cloud VPS 10 SSD (4 vCPU, 8GB, 150GB SSD)
# region: EU = European Union
# imageId: Ubuntu 24.04
REQUEST_ID=$(python3 -c "import uuid; print(uuid.uuid4())")

# Root password secret ID (registered via Contabo API: POST /v1/secrets, type=password)
ROOT_PASSWORD_ID="${CONTABO_ROOT_PASSWORD_ID:?Set CONTABO_ROOT_PASSWORD_ID in .env (numeric ID from Contabo secrets API)}"

RESPONSE=$(curl -s -X POST "https://api.contabo.com/v1/compute/instances" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "x-request-id: ${REQUEST_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"imageId\": \"${CONTABO_IMAGE_ID:-d64d5c6c-9dda-4e38-8174-0ee282474d8a}\",
    \"productId\": \"${CONTABO_PRODUCT_ID:-V92}\",
    \"region\": \"${CONTABO_REGION:-EU}\",
    \"displayName\": \"nexgen-${CLIENT_ID}\",
    \"defaultUser\": \"root\",
    \"rootPassword\": ${ROOT_PASSWORD_ID},
    \"sshKeys\": [${SSH_KEY_ID}],
    \"userData\": $(cat "$SCRIPT_DIR/cloud-init.yaml" | sed "s|SSH_PUBLIC_KEY_PLACEHOLDER|${SSH_PUB_KEY}|" | jq -Rs .)
  }")

# Extract results
INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.data[0].instanceId // empty')
CONTRACT_ID=$(echo "$RESPONSE" | jq -r '.data[0].contractId // empty')
ERROR=$(echo "$RESPONSE" | jq -r '.statusCode // empty')

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "null" ]; then
  echo "[provision] ERROR creating VPS:"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo "[provision] Instance created: ID=$INSTANCE_ID"
echo "[provision] Waiting for IP assignment (Contabo can take 5-15 min)..."

# Poll for IP address (Contabo is slow to assign IPs)
MAX_ATTEMPTS=30  # 30 * 30s = 15 minutes
ATTEMPT=0
SERVER_IP=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  TOKEN_REFRESH=$(bash "$SCRIPT_DIR/contabo-auth.sh")
  IP_RESPONSE=$(curl -s \
    -H "Authorization: Bearer ${TOKEN_REFRESH}" \
    -H "x-request-id: $(python3 -c 'import uuid; print(uuid.uuid4())')" \
    "https://api.contabo.com/v1/compute/instances/${INSTANCE_ID}")

  SERVER_IP=$(echo "$IP_RESPONSE" | jq -r '.data[0].ipConfig.v4.ip // empty')
  STATUS=$(echo "$IP_RESPONSE" | jq -r '.data[0].status // empty')

  if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" != "null" ] && [ "$STATUS" = "running" ]; then
    echo "[provision] VPS running: IP=$SERVER_IP"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "[provision] Attempt $ATTEMPT/$MAX_ATTEMPTS — status: $STATUS, waiting 30s..."
  sleep 30
done

if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "null" ]; then
  echo "[provision] ERROR: VPS not ready after 15 minutes"
  exit 1
fi

# Save server info
CLIENT_DIR="$SCRIPT_DIR/../clients/$CLIENT_ID"
mkdir -p "$CLIENT_DIR"
cat > "$CLIENT_DIR/server-info.env" <<EOF
SERVER_ID=$INSTANCE_ID
CONTRACT_ID=${CONTRACT_ID:-unknown}
SERVER_IP=$SERVER_IP
SERVER_TYPE=${CONTABO_PRODUCT_ID:-V92}
LOCATION=${CONTABO_REGION:-EU}
PROVIDER=contabo
TIER=$TIER
CREATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "[provision] Saved to clients/$CLIENT_ID/server-info.env"
echo "[provision] Done. Now run: ./provision/wait-for-ssh.sh $CLIENT_ID"
