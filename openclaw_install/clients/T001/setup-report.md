# Setup Report: T001

**Client ID:** T001
**Tier:** 2 (Smart Butler)
**Date:** 2026-03-25
**Operator:** Claude Code (Discovery Run)
**Status:** COMPLETE

## Server

| Field | Value |
|-------|-------|
| Provider | Hetzner Cloud |
| Server ID | 124875819 |
| Server Type | CX33 (4 vCPU, 8GB RAM, 80GB SSD) |
| Location | nbg1 (Nuremberg, Germany) |
| IP | 128.140.70.90 |
| OS | Ubuntu 24.04 LTS |
| User | deploy |

## Installed Components

| Component | Version | Status |
|-----------|---------|--------|
| OpenClaw | 2026.3.23-2 | Active |
| Node.js | v24.14.0 | Installed |
| Docker | 29.3.0 | Active |
| Qdrant | latest (Docker) | Active |
| SearXNG | latest (Docker) | Active |
| Mem0 (openclaw-mem0) | 0.4.0 | Active |
| Google Chrome | 146.0.7680.164 | Active (headless) |
| Claude Code CLI | 2.1.83 | Installed |
| ClawTeam | 0.3.0 | Installed |
| fail2ban | apt | Active |
| UFW | apt | Active |

## Services

| Service | Type | Status |
|---------|------|--------|
| openclaw-gateway.service | systemd user | active |
| openclaw-watchdog.service | systemd user | active |
| chromium-debug.service | systemd user | active |
| qdrant (Docker) | container | running |
| searxng (Docker) | container | running |

## Ports

| Port | Service | Bind |
|------|---------|------|
| 6333 | Qdrant | 0.0.0.0 (Docker) |
| 8888 | SearXNG | 0.0.0.0 (Docker) |
| 9222 | Chrome CDP | 127.0.0.1 |
| 18789 | OpenClaw Gateway | 127.0.0.1 |

## Configuration

| Setting | Value |
|---------|-------|
| Primary LLM | DeepSeek-Chat V3.2 |
| Mem0 Embedder | OpenAI text-embedding-3-small |
| Mem0 Vector Store | Qdrant (client-T001-memories) |
| Mem0 LLM | DeepSeek-Chat |
| Telegram Bot | @AINexGen_bot |
| Gateway Bind | loopback |
| Browser | disabled (Tier 2) |
| ACP | disabled (Tier 2) |

## Resource Usage

| Metric | Value |
|--------|-------|
| RAM Used | ~1.3 GB / 7.6 GB |
| Swap | 2 GB (512 KB used) |
| Disk | 9.1 GB / 75 GB (13%) |
| Load Average | 0.00 |

## QA Results

All 5 layers passed (28/28 checks):
- Layer 1 (Health): 7/7
- Layer 2 (Ports): 4/4
- Layer 3 (APIs): 5/5
- Layer 4 (Telegram): 2/2
- Layer 5 (Integration): 10/10

## Known Issues

1. **Snap Chromium fails headless** — Ubuntu 24.04 snap chromium-browser exits with code 21 in headless mode. Solved by installing Google Chrome .deb.
2. **Stale Chrome processes** — Must kill existing chrome before restarting systemd service (port 9222 conflict).
3. **OpenClaw entry point changed** — v2026.3.23+ uses `dist/index.js` (not `dist/entry.js` from Pi5 reference).
4. **OpenClaw gateway.bind** — Must use `"loopback"` not `"localhost"` (legacy format crashes).
5. **SearXNG JSON 403** — JSON format disabled by default; must edit settings.yml inside container.
