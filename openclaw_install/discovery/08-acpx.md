# ACPX (Claude Code CLI) — Discovery Notes

**Script:** scripts/12-setup-acpx.sh
**Started:** 2026-03-25

## Commands Run

```bash
# Install Claude Code CLI globally
$ sudo npm install -g @anthropic-ai/claude-code

$ claude --version
Claude Code CLI v2.1.83

# ACPX plugin is bundled with OpenClaw — no separate install
# Enable via openclaw.json:
$ python3 -c "
import json
f = open('$HOME/.openclaw/openclaw.json', 'r+')
cfg = json.load(f)
cfg['acp'] = cfg.get('acp', {})
cfg['acp']['enabled'] = True
f.seek(0); json.dump(cfg, f, indent=2); f.truncate()
f.close()
"
# No separate systemd service needed — ACPX runs within OpenClaw gateway
```

## Gotchas
- **Package name is `@anthropic-ai/claude-code`** — NOT `@anthropic/claude-code` (that 404s on npm). Easy to get wrong.
- **ACPX is bundled with OpenClaw**, enabled via `acp.enabled=true` in openclaw.json. No separate service or daemon to manage.
- **No separate systemd service needed** — the ACP extension runs inside the gateway process.
- Requires Node.js already installed (covered in openclaw-core setup).

## Verification
```
$ claude --version
Claude Code CLI v2.1.83

$ python3 -c "import json; print(json.load(open('$HOME/.openclaw/openclaw.json'))['acp']['enabled'])"
True
```

## Resource Snapshot
CLI tool only — no persistent memory footprint until invoked.

## Time Taken
~1 minute
