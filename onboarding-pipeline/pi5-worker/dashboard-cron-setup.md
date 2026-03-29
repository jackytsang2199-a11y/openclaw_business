# Pi5 Dashboard — Cron Setup Guide

## Prerequisites

The dashboard script lives at:
```
~/openclaw_setup_business/onboarding-pipeline/pi5-worker/dashboard.sh
```

It reads `.env` from the same directory (requires `CF_WORKER_URL` and `WORKER_TOKEN`).

## 1. Install

```bash
chmod +x ~/openclaw_setup_business/onboarding-pipeline/pi5-worker/dashboard.sh
```

## 2. Test manually

```bash
~/openclaw_setup_business/onboarding-pipeline/pi5-worker/dashboard.sh
echo "Exit code: $?"
cat ~/dashboard-status.txt
```

Verify all sections render and API calls succeed (or show graceful warnings if CF Worker is unreachable).

## 3. Add crontab entry

```bash
crontab -e
```

Add this line:

```
*/15 * * * * /home/pi/openclaw_setup_business/onboarding-pipeline/pi5-worker/dashboard.sh > /dev/null 2>&1
```

Adjust the path if the repo is cloned elsewhere. The script writes output to `~/dashboard-status.txt` regardless of cron stdout redirection.

## 4. Telegram alerts on failure

Pipe dashboard failures to the existing `notifier.py` module. Create a small wrapper:

```bash
cat > ~/dashboard-alert.sh << 'WRAPPER'
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASH="$HOME/openclaw_setup_business/onboarding-pipeline/pi5-worker/dashboard.sh"

if ! "$DASH" > /dev/null 2>&1; then
    # Dashboard reported critical failure — send Telegram alert
    cd "$HOME/openclaw_setup_business/onboarding-pipeline/pi5-worker"
    python3 -c "
from config import OWNER_TELEGRAM_BOT_TOKEN, OWNER_TELEGRAM_CHAT_ID
from notifier import Notifier
n = Notifier(OWNER_TELEGRAM_BOT_TOKEN, OWNER_TELEGRAM_CHAT_ID)
body = open('$HOME/dashboard-status.txt').read()
# Telegram message limit is 4096 chars — truncate if needed
msg = '<b>Pi5 Dashboard ALERT</b>\n\n<pre>' + body[:3800] + '</pre>'
n.send(msg)
"
fi
WRAPPER
chmod +x ~/dashboard-alert.sh
```

Then replace the crontab entry with the wrapper:

```
*/15 * * * * /home/pi/dashboard-alert.sh
```

This only sends a Telegram message when a critical check fails (exit code 1), keeping alert noise to zero during normal operation.

## 5. Verify cron is running

After 15 minutes, check:

```bash
# Confirm the output file was updated
ls -la ~/dashboard-status.txt

# Check cron logs
grep dashboard /var/log/syslog | tail -5
```

## What triggers a CRITICAL FAILURE (exit 1)

| Check | Condition |
|-------|-----------|
| Worker service | `nexgen-worker` systemd user service is not active |
| Claude auth | `~/.claude/` directory does not exist |

All other checks (CF Worker unreachable, no backups, etc.) produce warnings but do not fail the dashboard. This keeps alerts focused on issues that require immediate human attention.
