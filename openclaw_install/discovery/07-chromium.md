# Chromium Headless — Discovery Notes

**Script:** scripts/11-setup-chromium.sh
**Started:** 2026-03-25

## Commands Run

```bash
# FAILED ATTEMPT: snap chromium
$ snap install chromium
$ chromium --headless=new --no-sandbox --disable-gpu --dump-dom https://example.com
# Exit code 21, SingletonLock issues — snap confinement breaks headless mode

# WORKING SOLUTION: Google Chrome .deb
$ wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
$ sudo apt install -y ./google-chrome-stable_current_amd64.deb

$ google-chrome --version
Google Chrome 146.0.7680.164

# Create systemd user service
$ cat > ~/.config/systemd/user/chromium-debug.service << EOF
[Unit]
Description=Chrome Headless CDP
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9222 --user-data-dir=%h/.chromium-openclaw
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF

$ systemctl --user daemon-reload
$ systemctl --user enable --now chromium-debug.service

# Verify CDP endpoint
$ curl -sf http://localhost:9222/json/version | python3 -m json.tool
{
    "Browser": "Chrome/146.0.7680.164",
    "Protocol-Version": "1.3",
    "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/browser/..."
}
```

## Gotchas
- **CRITICAL: snap chromium is broken for headless on Ubuntu 24.04.** Exit code 21, SingletonLock file conflicts under snap confinement. Do NOT use `snap install chromium` — go straight to Google Chrome .deb.
- **Must kill stale chrome processes before restarting the service.** If port 9222 is already bound, the new instance fails silently. Use `pkill -f 'chrome.*9222'` before `systemctl --user restart chromium-debug.service` if needed.
- **--headless=new** (not `--headless`) — the "new" headless mode is required for modern Chrome; the old mode is deprecated.
- **--no-sandbox** is required when running as non-root in a server environment (no display server).
- **--user-data-dir** set to `~/.chromium-openclaw` to isolate from any system Chrome profile.

## Verification
```
$ systemctl --user status chromium-debug.service
  Active: active (running)

$ curl -sf http://localhost:9222/json/version | python3 -c "import sys,json; print(json.load(sys.stdin)['Browser'])"
Chrome/146.0.7680.164
```

## Resource Snapshot
Chrome headless: ~180-250MB RAM idle.

## Time Taken
~5 minutes (including failed snap attempt and .deb download)
