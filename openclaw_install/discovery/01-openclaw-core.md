# OpenClaw Core — Discovery Notes

**Script:** scripts/04-install-openclaw.sh
**Started:** 2026-03-25 19:05 HKT

## Commands Run

```bash
$ sudo npm install -g openclaw@latest
# 459 packages in 40s. Warning about deprecated node-domexception.

$ openclaw --version
OpenClaw 2026.3.23-2 (7ffe7e4)

$ which openclaw
/usr/bin/openclaw
```

Directories created: `~/.openclaw`, `~/clawd`, `~/scripts`, `~/.config/systemd/user`
Linger enabled for `deploy` user.

## Config

openclaw.json key discoveries:
- `gateway.bind` must be `"loopback"` not `"localhost"` — legacy format causes startup failure
- `channels.telegram.allowFrom` MUST have at least one ID or gateway refuses to start
- Entry point is `dist/index.js` NOT `dist/entry.js` (changed since Pi5 reference)
- `NODE_COMPILE_CACHE` and `OPENCLAW_NO_RESPAWN=1` recommended by doctor for VPS

systemd service:
- `EnvironmentFile=%h/.openclaw/env` (uses %h for home dir)
- `RestartSec=5` (doctor recommended, not 10)
- PATH must be set explicitly in service

## Gotchas
- `gateway.bind: "localhost"` is LEGACY. Must use `"loopback"` mode. Caused crash loop.
- `allowFrom: []` (empty) blocks startup with "allowlist requires at least one sender ID"
- Entry point changed: `dist/entry.js` → `dist/index.js` since Pi5 reference (v2026.3.13 → v2026.3.23-2)
- Memory: 678MB for gateway alone — significant on 8GB VPS

## Verification
```bash
$ curl -s http://localhost:18789/healthz
{"ok":true,"status":"live"}

$ systemctl --user status openclaw-gateway.service
Active: active (running)
Agent model: deepseek/deepseek-chat
Gateway listening on ws://127.0.0.1:18789
Telegram channel connecting
```

## Resource Snapshot
Gateway uses ~678MB RAM at idle.

## Time Taken
Start: 19:05 HKT → End: 19:10 HKT (~5 minutes)
