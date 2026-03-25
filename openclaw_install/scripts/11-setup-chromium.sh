#!/bin/bash
set -euo pipefail
SCRIPT_NAME="11-setup-chromium"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus

# Install Google Chrome (snap chromium-browser fails headless on Ubuntu 24.04)
if command -v google-chrome &>/dev/null; then
  log "Google Chrome already installed: $(google-chrome --version 2>/dev/null)"
else
  log "Installing Google Chrome..."
  cd /tmp
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt-get update -y
  sudo apt-get install -y ./google-chrome-stable_current_amd64.deb
  rm -f google-chrome-stable_current_amd64.deb

  if ! command -v google-chrome &>/dev/null; then
    error "Failed to install Google Chrome"
  fi
  log "Installed: $(google-chrome --version)"
fi

CHROME_PATH=$(which google-chrome)
log "Using binary: $CHROME_PATH ($(google-chrome --version 2>/dev/null))"

# Create user data dir
mkdir -p ~/.chromium-openclaw

# Create systemd service
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/chromium-debug.service << SVC_EOF
[Unit]
Description=Chrome Headless with Remote Debugging
After=network-online.target

[Service]
Type=simple
ExecStart=$CHROME_PATH --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9222 --user-data-dir=$HOME/.chromium-openclaw
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
SVC_EOF

systemctl --user daemon-reload
systemctl --user enable chromium-debug.service
systemctl --user restart chromium-debug.service

sleep 3

# Verify CDP
log "Verifying Chrome DevTools Protocol..."
if curl -sf http://localhost:9222/json/version &>/dev/null; then
  curl -s http://localhost:9222/json/version | python3 -m json.tool
  log "Chrome headless is running with CDP on port 9222."
else
  log "WARNING: CDP not responding yet. Check: systemctl --user status chromium-debug.service"
fi
