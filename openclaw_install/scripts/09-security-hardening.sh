#!/bin/bash
set -euo pipefail
SCRIPT_NAME="09-security-hardening"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive

# UFW setup (idempotent)
log "Configuring UFW..."
sudo ufw default deny incoming 2>/dev/null || true
sudo ufw default allow outgoing 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || true
sudo ufw --force enable 2>/dev/null || true

# SSH hardening (idempotent)
log "Hardening SSH..."
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# fail2ban (idempotent)
log "Configuring fail2ban..."
if ! dpkg -l | grep -q fail2ban; then
  sudo apt-get install -y fail2ban
fi

# Create jail.local if it doesn't exist
if [ ! -f /etc/fail2ban/jail.local ]; then
  sudo tee /etc/fail2ban/jail.local > /dev/null << 'JAIL_EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
JAIL_EOF
fi

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# Verify
log "Verification:"
sudo ufw status | head -10
sudo fail2ban-client status sshd 2>/dev/null || log "fail2ban sshd jail not active yet"

# Permissions
chmod 700 ~/.openclaw 2>/dev/null || true
chmod 600 ~/.openclaw/openclaw.json 2>/dev/null || true
chmod 600 ~/.openclaw/env 2>/dev/null || true

log "Security hardening complete."
