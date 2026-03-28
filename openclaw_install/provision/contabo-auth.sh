#!/bin/bash
# Returns a Contabo OAuth access token to stdout.
# Usage: TOKEN=$(bash contabo-auth.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env"

RESPONSE=$(curl -s -X POST \
  "https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token" \
  -d "client_id=${CONTABO_CLIENT_ID}" \
  -d "client_secret=${CONTABO_CLIENT_SECRET}" \
  -d "grant_type=password" \
  -d "username=${CONTABO_API_USER}" \
  -d "password=${CONTABO_API_PASSWORD}")

TOKEN=$(echo "$RESPONSE" | jq -r '.access_token // empty')
if [ -z "$TOKEN" ]; then
  echo "[contabo-auth] ERROR: Failed to get access token" >&2
  echo "$RESPONSE" | jq . >&2
  exit 1
fi

echo "$TOKEN"
