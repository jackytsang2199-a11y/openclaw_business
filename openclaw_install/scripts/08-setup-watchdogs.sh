#!/bin/bash
set -euo pipefail
SCRIPT_NAME="08-setup-watchdogs"
log() { echo "[$SCRIPT_NAME] $1"; }
error() { echo "[$SCRIPT_NAME] ERROR: $1" >&2; exit 1; }

export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus

mkdir -p ~/scripts /tmp/openclaw

# Create gateway watchdog script
cat > ~/scripts/gateway-watchdog.sh << 'SCRIPT_EOF'
#!/bin/bash
LOG=/tmp/openclaw/watchdog.log
MAX_FAILS=3
FAIL_COUNT=0
CHECK_INTERVAL=60

export XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus

BOT_TOKEN=$(python3 -c "
import json, os
with open(os.path.expanduser('~/.openclaw/openclaw.json')) as f:
    cfg = json.load(f)
print(cfg['channels']['telegram']['botToken'])
")

if [ -z "$BOT_TOKEN" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] Cannot read bot token from config" >> $LOG
    exit 1
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') [START] Watchdog started (check every ${CHECK_INTERVAL}s, max fails: ${MAX_FAILS})" >> $LOG

while true; do
    if curl -sf --max-time 10 "https://api.telegram.org/bot${BOT_TOKEN}/getMe" > /dev/null 2>&1; then
        if [ $FAIL_COUNT -gt 0 ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') [RECOVERED] Connection restored after ${FAIL_COUNT} failure(s)" >> $LOG
        fi
        FAIL_COUNT=0
    else
        ((FAIL_COUNT++))
        echo "$(date '+%Y-%m-%d %H:%M:%S') [FAIL] Telegram API unreachable (${FAIL_COUNT}/${MAX_FAILS})" >> $LOG
        if [ $FAIL_COUNT -ge $MAX_FAILS ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') [RESTART] Restarting openclaw-gateway.service" >> $LOG
            systemctl --user restart openclaw-gateway.service
            FAIL_COUNT=0
            sleep 30
            continue
        fi
    fi
    sleep $CHECK_INTERVAL
done
SCRIPT_EOF
chmod +x ~/scripts/gateway-watchdog.sh

# Create systemd service
UID_NUM=$(id -u)
cat > ~/.config/systemd/user/openclaw-watchdog.service << SVC_EOF
[Unit]
Description=OpenClaw Gateway Watchdog
After=openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=simple
ExecStart=$HOME/scripts/gateway-watchdog.sh
Restart=always
RestartSec=5
Environment=XDG_RUNTIME_DIR=/run/user/$UID_NUM
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$UID_NUM/bus

[Install]
WantedBy=default.target
SVC_EOF

systemctl --user daemon-reload
systemctl --user enable openclaw-watchdog.service

log "Gateway watchdog installed and enabled."
log "Start with: systemctl --user start openclaw-watchdog.service"
