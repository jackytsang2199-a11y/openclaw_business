# Gateway Watchdog — Discovery Notes

**Script:** scripts/08-setup-watchdogs.sh
**Started:** 2026-03-25

## Commands Run

```bash
# Create watchdog script
$ mkdir -p ~/scripts
$ cat > ~/scripts/gateway-watchdog.sh << 'EOF'
#!/bin/bash
TOKEN=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/openclaw.json'))['telegram']['token'])")
FAIL=0
while true; do
    if curl -sf "https://api.telegram.org/bot${TOKEN}/getMe" > /dev/null 2>&1; then
        FAIL=0
    else
        FAIL=$((FAIL+1))
        echo "$(date) FAIL $FAIL" >> /tmp/openclaw/watchdog.log
    fi
    if [ "$FAIL" -ge 3 ]; then
        echo "$(date) Restarting openclaw-gateway.service" >> /tmp/openclaw/watchdog.log
        systemctl --user restart openclaw-gateway.service
        FAIL=0
    fi
    sleep 60
done
EOF
$ chmod +x ~/scripts/gateway-watchdog.sh

# Create systemd user service
$ mkdir -p ~/.config/systemd/user
$ cat > ~/.config/systemd/user/openclaw-watchdog.service << EOF
[Unit]
Description=OpenClaw Gateway Watchdog
After=openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=simple
Environment=XDG_RUNTIME_DIR=/run/user/$(id -u)
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus
ExecStart=%h/scripts/gateway-watchdog.sh
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

$ systemctl --user daemon-reload
$ systemctl --user enable --now openclaw-watchdog.service

$ systemctl --user status openclaw-watchdog.service
# Active: active (running)
```

## Gotchas
- **Bot token read from openclaw.json via python3** — no jq on the system, so python3 JSON parsing is the standard approach throughout.
- **XDG_RUNTIME_DIR and DBUS_SESSION_BUS_ADDRESS** must be set as Environment= in the unit file, otherwise systemd user services fail to interact with the session bus.
- **Requires= and After= openclaw-gateway.service** — watchdog depends on gateway; if gateway isn't loaded the watchdog won't start.
- **Log directory /tmp/openclaw/** must exist — the watchdog script appends to `/tmp/openclaw/watchdog.log`.
- Pings Telegram API every 60 seconds. Three consecutive failures trigger a restart, then failure counter resets.

## Verification
```
$ systemctl --user status openclaw-watchdog.service
  Active: active (running)

$ cat /tmp/openclaw/watchdog.log
# (empty or contains timestamped entries — no failures during test)
```

## Resource Snapshot
Negligible — bash loop + curl every 60s.

## Time Taken
~3 minutes
