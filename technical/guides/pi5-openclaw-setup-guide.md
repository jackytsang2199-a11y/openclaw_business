# OpenClaw on Raspberry Pi 5 - Complete Setup Guide

A step-by-step guide to set up OpenClaw (AI companion gateway with Telegram) on a Raspberry Pi 5 (8GB RAM), including VPN, vector memory, and auto-recovery.

---

## Prerequisites

- Raspberry Pi 5 (8GB RAM recommended)
- Raspberry Pi OS (64-bit)
- Surfshark VPN account (or other WireGuard-compatible VPN) — required if in a restricted country
- API Keys: Anthropic (Claude), OpenAI (for embeddings), Telegram Bot Token
- A PC on the same network for SSH access

---

## Step 1: SSH into the Pi

From your PC terminal:

```bash
ssh your_username@<PI_IP_ADDRESS>
# e.g. ssh jacky999@192.168.1.30
```

Enter your password when prompted.

### (Optional) Set up SSH key-based auth for passwordless access

On your PC:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519
ssh-copy-id -i ~/.ssh/id_ed25519.pub your_username@<PI_IP_ADDRESS>
```

On Windows without `ssh-copy-id`, use Python:

```python
import paramiko

key = paramiko.Ed25519Key.generate()
key.write_private_key_file("C:/Users/YOU/.ssh/id_ed25519")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("<PI_IP>", username="your_username", password="your_password")

public_key = f"ssh-ed25519 {key.get_base64()}"
client.exec_command(f'mkdir -p ~/.ssh && echo "{public_key}" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys')
client.close()
```

---

## Step 2: Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Step 3: Fix kernel page size (CRITICAL)

Pi 5 defaults to 16KB page sizes which causes jemalloc crashes in Qdrant and other services.

```bash
sudo nano /boot/firmware/config.txt
```

Add or set:

```
kernel=kernel8.img
```

Reboot:

```bash
sudo reboot
```

> Without this fix, Qdrant Docker will crash. This is non-negotiable.

---

## Step 4: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Should be v22+
```

---

## Step 5: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
```

---

## Step 6: Install OpenClaw

```bash
sudo npm install -g openclaw@latest
```

Verify:

```bash
openclaw --version
```

---

## Step 7: Configure OpenClaw

Create the config directory and file:

```bash
mkdir -p ~/.openclaw
nano ~/.openclaw/openclaw.json
```

Minimal config example:

```json
{
  "auth": {
    "profiles": {
      "anthropic:default": {
        "apiKey": "$ANTHROPIC_API_KEY"
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "claude-sonnet-4-6"
    }
  },
  "channels": {
    "telegram": {
      "botToken": "$TELEGRAM_BOT_TOKEN",
      "allowFrom": [YOUR_TELEGRAM_USER_ID]
    }
  }
}
```

> Replace `YOUR_TELEGRAM_USER_ID` with your numeric Telegram ID (get it from @userinfobot on Telegram).

---

## Step 8: Set up environment variables

Create an env file for sensitive keys:

```bash
nano ~/.openclaw/env
```

```
ANTHROPIC_API_KEY=sk-ant-xxxxx
TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklMNO
OPENAI_API_KEY=sk-proj-xxxxx
```

Secure it:

```bash
chmod 600 ~/.openclaw/env
```

---

## Step 9: Set up Qdrant (Vector Database)

```bash
docker run -d --name qdrant \
  -p 6333:6333 \
  -v /home/$USER/qdrant-data:/qdrant/storage \
  --restart unless-stopped \
  qdrant/qdrant
```

Verify:

```bash
curl http://localhost:6333/collections
# Should return {"result":{"collections":[]}...}
```

---

## Step 10: Install and configure mem0 plugin

```bash
sudo npm install -g @mem0/openclaw-mem0
```

Add to `~/.openclaw/openclaw.json` under a `plugins` section:

```json
{
  "plugins": {
    "entries": {
      "openclaw-mem0": {
        "settings": {
          "mode": "open-source",
          "llm": {
            "provider": "openai",
            "model": "gpt-4.1-nano"
          },
          "embedder": {
            "provider": "openai",
            "model": "text-embedding-3-small",
            "embeddingDims": 1536
          },
          "vectorStore": {
            "provider": "qdrant",
            "url": "http://localhost:6333",
            "collectionName": "your-memories"
          },
          "historyDb": "/home/YOUR_USER/clawd/mem0-history.db",
          "search": {
            "topK": 5,
            "searchThreshold": 0.3
          },
          "autoCapture": true,
          "autoRecall": true
        }
      }
    }
  }
}
```

### If you get sqlite3 native binding errors

Rebuild sqlite3 in the plugin directory:

```bash
cd /usr/lib/node_modules/@mem0/openclaw-mem0
npm rebuild sqlite3
```

If jiti still can't find it, symlink the binary:

```bash
# Find the built binary
find /usr/lib/node_modules -name "node_sqlite3.node" 2>/dev/null

# Symlink to where jiti expects it
sudo mkdir -p /usr/lib/node_modules/openclaw/node_modules/jiti/lib/binding/node-v137-linux-arm64/
sudo ln -s /path/to/node_sqlite3.node /usr/lib/node_modules/openclaw/node_modules/jiti/lib/binding/node-v137-linux-arm64/node_sqlite3.node
```

> **What didn't work:** Redis 8 (KNN DIALECT 2 bugs), redis-stack-server (jemalloc crash before kernel fix), ChromaDB.

---

## Step 11: Set up personality files (Optional)

If you have custom personality files (SOUL.md, MEMORY.md, HEARTBEAT.md):

```bash
mkdir -p ~/clawd
# Copy your personality files into ~/clawd/
scp user@pc:/path/to/SOUL.md ~/clawd/
scp user@pc:/path/to/MEMORY.md ~/clawd/
scp user@pc:/path/to/HEARTBEAT.md ~/clawd/
```

---

## Step 12: Set up WireGuard VPN (if in restricted country)

### Install WireGuard

```bash
sudo apt install -y wireguard
```

### Add VPN configs

Get your WireGuard config files from your VPN provider (e.g., Surfshark). Save multiple server configs for fallback:

```bash
sudo nano /etc/wireguard/wg0-server1.conf  # Primary server
sudo nano /etc/wireguard/wg0-server2.conf  # Fallback 1 (e.g., JP Tokyo)
sudo nano /etc/wireguard/wg0-server3.conf  # Fallback 2 (e.g., SG Singapore)
```

Each config should include `PersistentKeepalive = 25` under `[Peer]` to prevent NAT timeout disconnections.

### Activate the primary server

```bash
sudo cp /etc/wireguard/wg0-server1.conf /etc/wireguard/wg0.conf
sudo wg-quick up wg0
```

### Enable at boot

```bash
sudo systemctl enable wg-quick@wg0
```

### Allow passwordless VPN restart for watchdog

```bash
sudo visudo -f /etc/sudoers.d/wg-quick
```

Add:

```
your_username ALL=(ALL) NOPASSWD: /usr/bin/wg-quick
```

---

## Step 13: Create systemd user services

### Enable linger (so services run without login)

```bash
loginctl enable-linger $USER
```

### Create service directory

```bash
mkdir -p ~/.config/systemd/user/
```

### Gateway service

```bash
nano ~/.config/systemd/user/openclaw-gateway.service
```

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /usr/lib/node_modules/openclaw/dist/entry.js gateway --port 18789
Restart=always
RestartSec=10
EnvironmentFile=/home/%u/.openclaw/env
Environment=OPENCLAW_GATEWAY_PORT=18789

[Install]
WantedBy=default.target
```

### Enable and start

```bash
systemctl --user daemon-reload
systemctl --user enable openclaw-gateway.service
systemctl --user start openclaw-gateway.service
systemctl --user status openclaw-gateway.service
```

> If `systemctl --user` fails over SSH, export these first:
> ```bash
> export XDG_RUNTIME_DIR=/run/user/$(id -u)
> export DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$(id -u)/bus
> ```

---

## Step 14: Set up Gateway Watchdog

Monitors Telegram API health, auto-restarts gateway on failure.

### Create the script

```bash
mkdir -p ~/scripts /tmp/openclaw
nano ~/scripts/gateway-watchdog.sh
```

```bash
#!/bin/bash
# Gateway Watchdog - checks Telegram API, restarts gateway on failure

LOG=/tmp/openclaw/watchdog.log
CHECK_INTERVAL=60
MAX_FAILS=3
FAIL_COUNT=0

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> $LOG; }

# Read bot token from openclaw config
BOT_TOKEN=$(grep -o '"botToken"[[:space:]]*:[[:space:]]*"[^"]*"' ~/.openclaw/openclaw.json | head -1 | sed 's/.*"botToken"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if [ -z "$BOT_TOKEN" ]; then
    # Try from env file
    BOT_TOKEN=$(grep TELEGRAM_BOT_TOKEN ~/.openclaw/env | cut -d= -f2)
fi

log "[START] Gateway watchdog started (check: ${CHECK_INTERVAL}s, max fails: $MAX_FAILS)"

while true; do
    RESPONSE=$(curl -s --max-time 10 "https://api.telegram.org/bot${BOT_TOKEN}/getMe" 2>/dev/null)
    if echo "$RESPONSE" | grep -q '"ok":true'; then
        if [ $FAIL_COUNT -gt 0 ]; then
            log "[RECOVERED] Telegram API reachable after ${FAIL_COUNT} failure(s)"
        fi
        FAIL_COUNT=0
    else
        ((FAIL_COUNT++))
        log "[FAIL] Telegram API unreachable (${FAIL_COUNT}/${MAX_FAILS})"
        if [ $FAIL_COUNT -ge $MAX_FAILS ]; then
            log "[RESTART] Restarting openclaw-gateway.service"
            systemctl --user restart openclaw-gateway.service
            FAIL_COUNT=0
            sleep 30
            continue
        fi
    fi
    sleep $CHECK_INTERVAL
done
```

```bash
chmod +x ~/scripts/gateway-watchdog.sh
```

### Create systemd service

```bash
nano ~/.config/systemd/user/openclaw-watchdog.service
```

```ini
[Unit]
Description=OpenClaw Gateway Watchdog
After=openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=simple
ExecStart=/home/%u/scripts/gateway-watchdog.sh
Restart=always
RestartSec=10
Environment=XDG_RUNTIME_DIR=/run/user/%U
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/%U/bus

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable openclaw-watchdog.service
systemctl --user start openclaw-watchdog.service
```

---

## Step 15: Set up VPN Watchdog (if using VPN)

Monitors VPN connectivity, auto-restarts and cycles through fallback servers.

### Create the script

```bash
nano ~/scripts/vpn-watchdog.sh
```

```bash
#!/bin/bash
# VPN Watchdog with multi-server fallback
# Checks connectivity, restarts WG, cycles through servers if current one is dead

LOG=/tmp/openclaw/vpn-watchdog.log
CHECK_INTERVAL=30
MAX_FAILS=3
FAIL_COUNT=0
RESTART_FAILS=0
MAX_RESTART_FAILS=2
NUM_SERVERS=3
CURRENT_SERVER=1

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> $LOG; }

get_conf() { echo "/etc/wireguard/wg0-server${1}.conf"; }

switch_server() {
    CURRENT_SERVER=$(( (CURRENT_SERVER % NUM_SERVERS) + 1 ))
    local conf=$(get_conf $CURRENT_SERVER)
    log "[SWITCH] Switching to server $CURRENT_SERVER ($conf)"
    sudo wg-quick down wg0 2>/dev/null
    sleep 2
    sudo cp "$conf" /etc/wireguard/wg0.conf
    sudo wg-quick up wg0 2>/dev/null
    local result=$?
    if [ $result -eq 0 ]; then
        log "[SWITCH] Server $CURRENT_SERVER started"
    else
        log "[ERROR] Failed to start wg0 with server $CURRENT_SERVER (exit $result)"
    fi
    RESTART_FAILS=0
    sleep 15
}

restart_wg() {
    log "[RESTART] Restarting WireGuard wg0 (server $CURRENT_SERVER)"
    sudo wg-quick down wg0 2>/dev/null
    sleep 3
    sudo wg-quick up wg0 2>/dev/null
    local result=$?
    if [ $result -eq 0 ]; then
        log "[RESTART] wg0 restarted successfully"
    else
        log "[ERROR] wg0 restart failed (exit $result)"
    fi
    ((RESTART_FAILS++))
    if [ $RESTART_FAILS -ge $MAX_RESTART_FAILS ]; then
        log "[SWITCH] $RESTART_FAILS restarts failed on server $CURRENT_SERVER, switching"
        switch_server
    fi
    sleep 15
}

# Detect which server we're currently on
CURRENT_ENDPOINT=$(sudo wg show wg0 2>/dev/null | grep endpoint | awk '{print $2}')
if echo "$CURRENT_ENDPOINT" | grep -q "jp-tok"; then
    CURRENT_SERVER=2
elif echo "$CURRENT_ENDPOINT" | grep -q "sg-sng"; then
    CURRENT_SERVER=3
else
    CURRENT_SERVER=1
fi

log "[START] VPN watchdog started ($NUM_SERVERS servers, check: ${CHECK_INTERVAL}s, current: server $CURRENT_SERVER)"

while true; do
    if ping -c 1 -W 5 1.1.1.1 > /dev/null 2>&1; then
        if [ $FAIL_COUNT -gt 0 ]; then
            log "[RECOVERED] VPN connectivity restored after ${FAIL_COUNT} failure(s) on server $CURRENT_SERVER"
        fi
        FAIL_COUNT=0
        RESTART_FAILS=0
    else
        ((FAIL_COUNT++))
        log "[FAIL] No internet via VPN (${FAIL_COUNT}/${MAX_FAILS}) server $CURRENT_SERVER"
        if [ $FAIL_COUNT -ge $MAX_FAILS ]; then
            restart_wg
            FAIL_COUNT=0
            continue
        fi
    fi
    sleep $CHECK_INTERVAL
done
```

```bash
chmod +x ~/scripts/vpn-watchdog.sh
```

### Create systemd service

```bash
nano ~/.config/systemd/user/vpn-watchdog.service
```

```ini
[Unit]
Description=VPN Watchdog with Server Fallback

[Service]
Type=simple
ExecStart=/home/%u/scripts/vpn-watchdog.sh
Restart=always
RestartSec=10
Environment=XDG_RUNTIME_DIR=/run/user/%U
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/%U/bus

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable vpn-watchdog.service
systemctl --user start vpn-watchdog.service
```

---

## Step 16: Verify everything is running

```bash
# Check all services
systemctl --user status openclaw-gateway.service
systemctl --user status openclaw-watchdog.service
systemctl --user status vpn-watchdog.service

# Check Docker containers
docker ps  # Should show qdrant running

# Check VPN
sudo wg show wg0

# Check Qdrant
curl http://localhost:6333/collections

# Check watchdog logs
tail -20 /tmp/openclaw/watchdog.log
tail -20 /tmp/openclaw/vpn-watchdog.log
```

---

## Architecture Overview

```
Internet
    │
    ▼
┌─────────────────────────────────┐
│  WireGuard VPN (wg0)           │
│  ├── Server 1 (Primary)        │
│  ├── Server 2 (JP Tokyo)       │  ◄── VPN Watchdog cycles on failure
│  └── Server 3 (SG Singapore)   │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│  OpenClaw Gateway (:18789)     │
│  ├── Claude API (Anthropic)    │
│  ├── Telegram Bot              │  ◄── Gateway Watchdog checks API health
│  └── mem0 Plugin               │
│      ├── Qdrant (:6333)        │
│      ├── OpenAI Embeddings     │
│      └── SQLite History DB     │
└─────────────────────────────────┘
```

## Auto-Recovery Chain

1. **VPN Watchdog** (every 30s): Pings 1.1.1.1 → 3 fails → restart wg0 → 2 failed restarts → switch server
2. **Gateway Watchdog** (every 60s): Checks Telegram `getMe` API → 3 fails → restart gateway service
3. **systemd Restart=always**: Services auto-restart on crash
4. **Docker --restart unless-stopped**: Qdrant auto-restarts on crash/reboot

## Telegram Reconnection Behavior

When the gateway restarts, Telegram's long-polling (`getUpdates`) automatically retrieves all pending messages from the past ~24 hours. Users do NOT need to resend messages.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Qdrant crashes on startup | Check `kernel=kernel8.img` in `/boot/firmware/config.txt` and reboot |
| `systemctl --user` fails over SSH | Export `XDG_RUNTIME_DIR` and `DBUS_SESSION_BUS_ADDRESS` (see Step 13) |
| sqlite3 binding not found | `npm rebuild sqlite3` in plugin dir, symlink if needed (see Step 10) |
| Port already in use | `lsof -i :18789` then `kill -9 <PID>` |
| Shell scripts have `\r` errors | `sed -i 's/\r$//' ~/scripts/*.sh` (fix Windows line endings) |
| Gateway token missing | Ensure `EnvironmentFile` path is correct in service file |
| VPN won't start | Check `/etc/sudoers.d/wg-quick` allows passwordless `wg-quick` |
