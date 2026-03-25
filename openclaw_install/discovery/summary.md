# Discovery Run Summary

**Date:** 2026-03-25
**Server:** Hetzner CX33 (nbg1), Ubuntu 24.04
**Client:** T001 (Tier 2)

## Timeline

| Phase | Duration (approx) |
|-------|-------------------|
| Provisioning (create + cloud-init) | ~3 min |
| Base system (swap, update, node, docker) | ~5 min |
| OpenClaw + Qdrant + Mem0 + SearXNG | ~10 min |
| Watchdog + Security + Chromium + ACPX + ClawTeam | ~15 min |
| Configure-env + QA | ~5 min |
| **Total Discovery Run** | **~1 hour** (including debugging) |

## Issues Encountered: 12

| # | Issue | Script | Iterations |
|---|-------|--------|-----------|
| 1 | Hetzner fsn1 location disabled | hetzner-create.sh | 1 |
| 2 | Hetzner token read-only | hetzner-create.sh | 1 |
| 3 | cloud-init uses `ssh` not `sshd` | cloud-init.yaml | 1 |
| 4 | OpenClaw `gateway.bind: "localhost"` crash | 04-install-openclaw.sh | 2 |
| 5 | OpenClaw empty `allowFrom` crash | 04-install-openclaw.sh | 1 |
| 6 | OpenClaw entry point `dist/index.js` | 04-install-openclaw.sh | 1 |
| 7 | SearXNG JSON format 403 | 07-setup-searxng.sh | 2 |
| 8 | Snap chromium headless exit code 21 | 11-setup-chromium.sh | 3 |
| 9 | Claude Code CLI package name | 12-setup-acpx.sh | 1 |
| 10 | Chrome port conflict (stale process) | 11-setup-chromium.sh | 1 |
| 11 | Watchdog service name mismatch | 10-configure-env.sh | 1 |
| 12 | Bash `((PASS++))` with `set -e` | QA scripts | 1 |

**Most iteration needed:** 11-setup-chromium.sh (snap chromium failure) and 04-install-openclaw.sh (multiple config format issues).

## Final Resource Usage

| Metric | Value |
|--------|-------|
| RAM | 1.3 GB / 7.6 GB (17%) |
| Swap | 512 KB / 2 GB |
| Disk | 9.1 GB / 75 GB (13%) |
| Docker containers | 2 (Qdrant 24 MB, SearXNG 131 MB) |
| Systemd services | 3 (gateway, watchdog, chromium) |
| Listening ports | 4 (6333, 8888, 9222, 18789) |

## Recommendations for Production Runs

1. **Skip snap chromium entirely** — go straight to Google Chrome .deb
2. **Pre-generate client.env** before starting script execution
3. **Run scripts 00-09 as a batch**, then upload client.env, then run 10+
4. **Tier 1 installs** can skip scripts 05-08 and 11-13 (saves ~10 min)
5. **Consider pre-baking a snapshot** after scripts 00-03 for faster deploys
