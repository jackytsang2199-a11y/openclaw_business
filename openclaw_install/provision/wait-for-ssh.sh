#!/bin/bash
set -euo pipefail

CLIENT_ID="${1:?Usage: wait-for-ssh.sh <CLIENT_ID>}"
source "$(dirname "$0")/../.env"
source "$(dirname "$0")/../clients/$CLIENT_ID/server-info.env"

echo "[wait-ssh] Waiting for $SERVER_IP to accept SSH..."

MAX_ATTEMPTS=18  # 18 * 10s = 3 minutes
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
     -o ConnectTimeout=5 -i "$SSH_KEY_PATH" \
     deploy@"$SERVER_IP" "echo 'SSH ready'" 2>/dev/null; then
    echo "[wait-ssh] SSH is ready!"

    # Check cloud-init completion (5 min timeout)
    echo "[wait-ssh] Checking cloud-init completion..."
    CI_STATUS=$(ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      -i "$SSH_KEY_PATH" deploy@"$SERVER_IP" \
      "timeout 300 cloud-init status --wait 2>&1; echo EXIT:\$?" 2>/dev/null)

    if echo "$CI_STATUS" | grep -q "status: done"; then
      echo "[wait-ssh] Cloud-init complete. VPS ready for installation."
    elif echo "$CI_STATUS" | grep -q "status: error"; then
      echo "[wait-ssh] WARNING: Cloud-init finished with errors. Check /var/log/cloud-init-output.log"
      echo "[wait-ssh] VPS is usable but some runcmd steps may have failed."
    fi
    exit 0
  fi

  ATTEMPT=$((ATTEMPT + 1))
  echo "[wait-ssh] Attempt $ATTEMPT/$MAX_ATTEMPTS - not ready yet, waiting 10s..."
  sleep 10
done

echo "[wait-ssh] ERROR: SSH not available after 3 minutes"
exit 1
