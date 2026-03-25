# Environment Configuration — Discovery Notes

**Script:** scripts/10-configure-env.sh
**Started:** 2026-03-25

## Commands Run

```bash
# Script reads client.env from home directory
$ cat ~/client.env
CLIENT_ID=T001
TIER=2
DEEPSEEK_API_KEY=sk-...
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ALLOWED_USERS=12345678

# Source the env file
$ source ~/client.env

# Generate gateway token
$ GATEWAY_TOKEN=$(openssl rand -hex 32)

# Update ~/.openclaw/env with API keys
$ cat > ~/.openclaw/env << EOF
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
GATEWAY_TOKEN=${GATEWAY_TOKEN}
EOF
$ chmod 600 ~/.openclaw/env

# Update openclaw.json via python3 (no jq available)
$ python3 << PYEOF
import json
with open('$HOME/.openclaw/openclaw.json', 'r') as f:
    cfg = json.load(f)

cfg['telegram']['token'] = '${TELEGRAM_BOT_TOKEN}'
cfg['telegram']['allowed_users'] = [${TELEGRAM_ALLOWED_USERS}]
cfg['gateway']['token'] = '${GATEWAY_TOKEN}'

# Tier-based config
tier = ${TIER}
if tier >= 2:
    cfg['mem0'] = cfg.get('mem0', {})
    cfg['mem0']['enabled'] = True
if tier >= 3:
    cfg['browser'] = cfg.get('browser', {})
    cfg['browser']['enabled'] = True
    cfg['browser']['cdp_url'] = 'http://localhost:9222'
    cfg['acp'] = cfg.get('acp', {})
    cfg['acp']['enabled'] = True

with open('$HOME/.openclaw/openclaw.json', 'w') as f:
    json.dump(cfg, f, indent=2)
PYEOF

# Create empty soul.md for personality customization
$ mkdir -p ~/.openclaw/agents/main
$ touch ~/.openclaw/agents/main/soul.md

# Restart services based on tier
$ systemctl --user restart openclaw-gateway.service
$ systemctl --user restart openclaw-watchdog.service    # tier 2+
# $ systemctl --user restart chromium-debug.service     # tier 3+ only

# Verify gateway is running with new config
$ systemctl --user status openclaw-gateway.service
  Active: active (running)
```

## Gotchas
- **No jq on the system** — all JSON manipulation done via python3. This is consistent across the entire stack.
- **client.env is the single input file** — contains all client-specific values. Script reads it, generates everything else.
- **Gateway token generated per-client** via `openssl rand -hex 32` — not reused across installations.
- **Tier-based feature gating**: Tier 1 = base only, Tier 2+ = Mem0 enabled, Tier 3+ = browser + ACP enabled.
- **soul.md created empty** — placeholder for future personality customization. Located at `~/.openclaw/agents/main/soul.md`.
- **Service restarts are tier-aware** — only restart services that exist for the client's tier level.

## Verification
```
# Tested with T001, tier 2
$ systemctl --user status openclaw-gateway.service
  Active: active (running)

$ python3 -c "import json; c=json.load(open('$HOME/.openclaw/openclaw.json')); print('mem0:', c.get('mem0',{}).get('enabled')); print('browser:', c.get('browser',{}).get('enabled'))"
mem0: True
browser: None

$ cat ~/.openclaw/env | head -1
DEEPSEEK_API_KEY=sk-...

$ ls ~/.openclaw/agents/main/soul.md
/home/deploy/.openclaw/agents/main/soul.md
```

## Resource Snapshot
Configuration only — no additional memory footprint.

## Time Taken
~2 minutes
