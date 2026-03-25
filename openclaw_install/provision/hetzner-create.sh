#!/bin/bash
set -euo pipefail

# Usage: ./hetzner-create.sh <CLIENT_ID> [TIER]
CLIENT_ID="${1:?Usage: hetzner-create.sh <CLIENT_ID> [TIER]}"
TIER="${2:-2}"

SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/../.env"

echo "[provision] Creating VPS for $CLIENT_ID (Tier $TIER)..."

# Inject SSH public key into cloud-init template
SSH_PUB_KEY=$(cat "${SSH_KEY_PATH}.pub")
CLOUD_INIT=$(sed "s|SSH_PUBLIC_KEY_PLACEHOLDER|${SSH_PUB_KEY}|" "$SCRIPT_DIR/cloud-init.yaml")
CLOUD_INIT_JSON=$(echo "$CLOUD_INIT" | jq -Rs .)

RESPONSE=$(curl -s -X POST https://api.hetzner.cloud/v1/servers \
  -H "Authorization: Bearer $HETZNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"nexgen-${CLIENT_ID}\",
    \"server_type\": \"${DEFAULT_SERVER_TYPE}\",
    \"image\": \"${DEFAULT_IMAGE}\",
    \"location\": \"${DEFAULT_LOCATION}\",
    \"ssh_keys\": [\"${SSH_KEY_NAME}\"],
    \"user_data\": ${CLOUD_INIT_JSON},
    \"labels\": {
      \"customer\": \"${CLIENT_ID}\",
      \"tier\": \"${TIER}\",
      \"managed-by\": \"NexGen-automation\"
    },
    \"start_after_create\": true
  }")

# Extract results
SERVER_ID=$(echo "$RESPONSE" | jq -r '.server.id')
SERVER_IP=$(echo "$RESPONSE" | jq -r '.server.public_net.ipv4.ip')
ERROR=$(echo "$RESPONSE" | jq -r '.error.message // empty')

if [ -n "$ERROR" ]; then
  echo "[provision] ERROR: $ERROR"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo "[provision] Server created: ID=$SERVER_ID IP=$SERVER_IP"
echo "[provision] Saving to clients/$CLIENT_ID/"

CLIENT_DIR="$SCRIPT_DIR/../clients/$CLIENT_ID"
mkdir -p "$CLIENT_DIR"
cat > "$CLIENT_DIR/server-info.env" <<EOF
SERVER_ID=$SERVER_ID
SERVER_IP=$SERVER_IP
SERVER_TYPE=${DEFAULT_SERVER_TYPE}
LOCATION=${DEFAULT_LOCATION}
TIER=$TIER
CREATED=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "[provision] Done. Now run: ./provision/wait-for-ssh.sh $CLIENT_ID"
