#!/bin/bash
# nexgen-backup-pull.sh — Runs on admin PC at 23:00 HKT
# Pulls latest backups from Pi5 to PC for versioned cold storage.
#
# Usage: ./nexgen-backup-pull.sh
# Schedule: Windows Task Scheduler or cron at 23:00 HKT
#
# Spec: docs/superpowers/specs/2026-03-27-customer-backup-strategy-design.md
set -euo pipefail

# === Configuration ===
PI5_USER="${PI5_USER:-jacky999}"
PI5_IP="${PI5_IP:?Set PI5_IP environment variable (e.g. 192.168.1.30)}"
PI5_SSH_KEY="${PI5_SSH_KEY:-$HOME/.ssh/id_ed25519}"
PC_BACKUP_DIR="${PC_BACKUP_DIR:-$HOME/nexgen-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-28}"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15 -i ${PI5_SSH_KEY}"

# === Date-stamped target ===
TODAY=$(date +%Y-%m-%d)
WEEKLY_DIR="${PC_BACKUP_DIR}/weekly/${TODAY}"
LOG_FILE="${PC_BACKUP_DIR}/pull.log"

mkdir -p "${WEEKLY_DIR}"
mkdir -p "${PC_BACKUP_DIR}/churn"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $1" | tee -a "${LOG_FILE}"
}

# === Step 1: SCP active backups ===
log "Pulling active backups from Pi5 (${PI5_IP})..."
if scp -r ${SSH_OPTS} \
    "${PI5_USER}@${PI5_IP}:/home/jacky999/backups/active/." \
    "${WEEKLY_DIR}/" 2>>"${LOG_FILE}"; then
    log "Active backups copied to ${WEEKLY_DIR}"
else
    log "ERROR: Failed to scp active backups from Pi5"
    exit 1
fi

# === Step 2: Copy churn archives ===
log "Copying churn archives..."
if scp -r ${SSH_OPTS} \
    "${PI5_USER}@${PI5_IP}:/home/jacky999/backups/churn/." \
    "${PC_BACKUP_DIR}/churn/" 2>>"${LOG_FILE}"; then
    log "Churn archives copied"
else
    log "WARNING: Failed to scp churn archives (non-fatal)"
fi

# === Step 3: Cleanup old weeklies ===
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${PC_BACKUP_DIR}/weekly" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>>"${LOG_FILE}"
REMAINING=$(ls -d "${PC_BACKUP_DIR}/weekly"/*/ 2>/dev/null | wc -l)
log "Cleanup done. ${REMAINING} weekly snapshots retained."

log "Pull complete."
