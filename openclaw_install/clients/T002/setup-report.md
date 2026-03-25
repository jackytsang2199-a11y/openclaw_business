# Setup Report: T002 (Validation Run)

**Client ID:** T002
**Tier:** 2 (Smart Butler)
**Date:** 2026-03-25
**Operator:** Claude Code (Validation Run — automated, no manual intervention)
**Status:** COMPLETE

## Server

| Field | Value |
|-------|-------|
| Provider | Hetzner Cloud |
| Server ID | 124884584 |
| Server Type | CX33 (4 vCPU, 8GB RAM, 80GB SSD) |
| Location | nbg1 (Nuremberg, Germany) |
| IP | 128.140.70.90 |
| OS | Ubuntu 24.04 LTS |
| User | deploy |

## Installation Timing

| Phase | Duration |
|-------|----------|
| Provision + cloud-init | ~30s |
| All 14 scripts (00-13) | ~6 min 39s |
| QA suite (5 layers) | ~20s |
| **Total** | **~7 min** |

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

## QA Results

All 5 layers passed (28/28 checks):
- Layer 1 (Health): 7/7
- Layer 2 (Ports): 4/4
- Layer 3 (APIs): 5/5
- Layer 4 (Telegram): 2/2
- Layer 5 (Integration): 10/10

## Idempotency Test

Scripts 04 and 05 re-run successfully — detected existing installs and skipped.

## Resource Usage

| Metric | Value |
|--------|-------|
| Disk | ~15 GB / 80 GB |
| Memory Available | 6469 MB / 7.6 GB |

## Validation Outcome

**PASS** — Scripts are production-ready. Zero manual intervention required.
