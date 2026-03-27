# Customer Backup Strategy Design

**Date:** 2026-03-27
**Status:** Approved
**Related specs:**
- `2026-03-26-customer-onboarding-pipeline-design.md` (churn data export, reactivation flow)
- `2026-03-24-vps-automation-pipeline-design.md` (backup strategy placeholder, secret management)
- `2026-03-27-contabo-vps-billing-strategy-design.md` (VPS lifecycle, D1 schema)

---

## 1. Problem

Customer VPS data has no periodic backup. If a VPS crashes (disk failure, Contabo issue) or Contabo terminates the operator account (payment failure, ToS), all customer data is lost:

- AI personality (soul.md, memory.md, tool.md)
- Conversation memory (Qdrant vectors, Mem0 DB)
- Full OpenClaw configuration (openclaw.json, plugins)

The existing churn data export only runs when a customer leaves — it provides zero protection for active customers.

**Core risk:** Contabo account termination = all VPSes gone simultaneously = catastrophic data loss for every customer.

---

## 2. Approach: Two-Tier Backup (VPS → Pi5 → PC)

### Architecture

```
┌─────────────┐    Weekly 03:00 HKT     ┌──────────────┐   PC pulls 23:00 HKT   ┌──────────────┐
│  Customer    │  ───────────────────►   │     Pi5      │  ◄───────────────────   │   Admin PC   │
│  VPS (×50)  │   SSH + SCP (push)      │  USB Storage │   SCP (pull)            │  TB Storage  │
│             │                          │  ~10GB used  │                          │  ~40GB used  │
└─────────────┘                          └──────────────┘                          └──────────────┘
     Source                              Hot cache (latest)                     Cold archive (4 weeks)
```

**Why two tiers:**

| Tier | Purpose | Survives |
|---|---|---|
| Pi5 (hot) | Fast restore, latest snapshot per customer | Single VPS crash |
| PC (cold) | Versioned history, 4-week retention | Contabo account termination, Pi5 failure, late-discovered corruption |

---

## 3. Backup Data Set

### What gets backed up per customer VPS

```
Full workspace:
  ~/clawd/                     ← entire OpenClaw workspace (config, plugins, local data)

Standalone data (Tier 2+ only):
  Qdrant snapshot              ← via native snapshot API (consistent point-in-time)
  ~/mem0.db                    ← Mem0 SQLite database (safe-copied via sqlite3 .backup command)
```

### What is NOT backed up

```
  ~/.env, ~/client.env         ← shared API keys (operator-owned, not customer data)
  Docker images/containers     ← reinstallable from registry
  SearXNG data                 ← no persistent value, regenerated on search
```

### Estimated size per customer

| Component | Size range |
|---|---|
| `~/clawd/` | 5-50MB |
| Qdrant snapshot | 10-150MB |
| mem0.db | 1-10MB |
| **Total** | **~20-200MB** |

### Qdrant snapshot method

Raw file copy of Qdrant storage is unsafe (could be mid-write). Use native snapshot API (Tier 2+ only — Tier 1 has no Qdrant):

```bash
# Create consistent point-in-time snapshot
curl -X POST http://localhost:6333/collections/mem0/snapshots
# Returns: {"result": {"name": "mem0-1234567890.snapshot"}}
# Snapshot file location: /qdrant/snapshots/mem0/mem0-1234567890.snapshot
```

---

## 4. Schedule

### Tier 1: VPS → Pi5 (weekly, Pi5-initiated push)

- **Time:** 03:00 HKT, staggered (~5 min gap between VPSes)
- **Frequency:** Weekly
- **Trigger:** Cron on Pi5
- **Source list:** Query CF D1 for all VPSes with `status = 'active'`

### Tier 2: Pi5 → PC (nightly, PC-initiated pull)

- **Time:** 23:00 HKT
- **Frequency:** Nightly (PC pulls whatever Pi5 has)
- **Trigger:** Scheduled script on admin PC
- **Direction:** PC initiates SCP to Pi5 (no port forwarding needed on PC)

### Why these times

- 03:00 HKT for Tier 1: low customer activity, VPS load is minimal
- 23:00 HKT for Tier 2: well after Tier 1 completes, Pi5 always has fresh data when PC pulls
- Tier 2 runs nightly but Pi5 data only changes weekly → most nights are no-op (rsync detects no changes)

---

## 5. Storage Layout

### Pi5: `/backups/`

```
/backups/
├── active/                      ← latest backup per active customer (overwritten weekly)
│   ├── T1043/
│   │   ├── clawd.tar.gz            ← ~/clawd/ compressed
│   │   ├── qdrant-snapshot.tar.gz  ← Qdrant native snapshot
│   │   ├── mem0.db                 ← Mem0 SQLite DB
│   │   └── backup-meta.json        ← timestamp, VPS IP, tier, size, status
│   ├── T1044/
│   │   └── ...
│   └── ...
├── churn/                       ← existing churn archive (from onboarding spec)
│   └── ...
└── backup.log                   ← append-only log of all backup runs
```

**Retention:** Latest only. Each weekly run overwrites the previous backup. No history on Pi5.

**Storage budget:** ~10GB for 50 customers (200MB worst case each). Plus existing churn archives (~5GB buffer). Total: ~15GB of 40GB available.

### PC: `nexgen-backups/`

```
nexgen-backups/
├── weekly/
│   ├── 2026-03-27/              ← date-stamped snapshots
│   │   ├── T1043/
│   │   ├── T1044/
│   │   └── ...
│   ├── 2026-03-20/
│   ├── 2026-03-13/
│   └── 2026-03-06/
└── churn/                       ← mirror of Pi5 churn archives
```

**Retention:** 4 weekly snapshots (rolling 28-day window). Older folders auto-deleted by cleanup step in PC script.

**Storage budget:** 50 customers × 200MB × 4 weeks = ~40GB. Trivial for TB storage.

---

## 6. Backup Flow

### Tier 1: VPS → Pi5 (backup-vps.sh on Pi5)

```
For each active VPS (from D1 query):
  1. SSH into VPS
  2. Safe-copy SQLite DB (if Tier 2+):
       sqlite3 ~/mem0.db ".backup /tmp/mem0-backup.db"
     (Direct file copy of SQLite while in use risks corruption.)
  3. Create Qdrant snapshot (if Tier 2+):
       curl -X POST http://localhost:6333/collections/mem0/snapshots
     Record snapshot filename from response.
     (Tier 1 has no Qdrant/Mem0 — skip steps 2-3.)
  4. Tar the workspace:
       tar -czf /tmp/clawd-backup.tar.gz -C ~/ clawd/
  5. SCP to Pi5:
       clawd-backup.tar.gz   → /backups/active/{CUSTOMER_ID}/clawd.tar.gz
       qdrant snapshot file   → /backups/active/{CUSTOMER_ID}/qdrant-snapshot.tar.gz  (Tier 2+ only)
       /tmp/mem0-backup.db   → /backups/active/{CUSTOMER_ID}/mem0.db                 (Tier 2+ only)
  6. Write backup-meta.json:
       { "timestamp": "...", "vps_ip": "...", "customer_id": "...",
         "tier": 2, "size_bytes": ..., "status": "success" }
  7. Clean up /tmp on VPS (remove tar, snapshot file, mem0-backup.db)

  Stagger: ~5 min gap between VPSes (avoid overwhelming Pi5 USB I/O)

  On failure for any VPS:
    - Log error to backup.log with customer ID + error message
    - Send Telegram alert to admin
    - Continue to next VPS (don't abort the whole run)
```

### Tier 2: Pi5 → PC (nexgen-backup-pull.sh on PC)

```
PC scheduled script at 23:00 HKT:
  1. Rsync active backups from Pi5 (only transfers changed files):
       rsync -avz pi5@{PI5_IP}:/backups/active/ → nexgen-backups/weekly/$(date +%Y-%m-%d)/
  2. Mirror churn:
       rsync -avz pi5@{PI5_IP}:/backups/churn/  → nexgen-backups/churn/
  3. Cleanup:
       Delete nexgen-backups/weekly/ folders older than 28 days

  If Pi5 unreachable: log error, retry tomorrow.
  Admin will notice (it's their PC) — no automated escalation needed.
```

---

## 7. Restore Flows

### Scenario A: Single VPS crash

**Source:** Pi5 `/backups/active/{CUSTOMER_ID}/`

```
1. Provision new Contabo VPS (or recycle from pool)
2. Run install scripts (fresh OS + stack)
3. SCP from Pi5:
     clawd.tar.gz → extract to ~/clawd/
     qdrant-snapshot.tar.gz → restore via Qdrant snapshot API
     mem0.db → ~/mem0.db
4. Restart services
5. Verify: Telegram bot responds, memories intact
```

**Data loss:** Up to 7 days of conversations (since last weekly backup).

### Scenario B: Pi5 dies

**Source:** PC `nexgen-backups/weekly/{latest-date}/`

```
1. Replace/repair Pi5
2. SCP from PC to Pi5: restore /backups/active/ directory
3. Then follow Scenario A for any VPS that needs restore
```

### Scenario C: Contabo terminates account (all VPSes gone)

**Source:** PC `nexgen-backups/weekly/{latest-date}/`

```
1. Re-provision VPSes (new Contabo account or different provider)
2. For each customer:
     SCP backup from PC → new VPS
     Run install scripts + restore data
3. Update D1 with new VPS IPs
4. Update Telegram webhooks
```

**Data loss:** Up to 7 days. All customer personalities and most memories survive.

### Scenario D: Late-discovered corruption

**Source:** PC `nexgen-backups/weekly/{earlier-date}/`

```
1. Identify clean weekly snapshot (e.g. 2026-03-13 was before corruption)
2. Restore from that date's folder
3. Data loss: up to 14-21 days depending on when corruption started
```

---

## 8. Telegram Notifications

| Event | Action |
|---|---|
| Backup success (all VPSes) | Silent — log only |
| Backup failure for any VPS | Alert admin: customer ID + error |
| Size anomaly (>2× previous or 0 bytes) | Alert admin: customer ID + old size vs new size |
| Pi5 `/backups/` usage > 80% of budget (12GB) | Alert admin: storage warning |

PC-side failures are not alerted (admin will notice on their own PC).

---

## 9. Testing Strategy

### Must-pass before go-live (during P2)

| # | Test | How | Pass criteria |
|---|---|---|---|
| 1 | Qdrant snapshot API | `curl -X POST http://localhost:6333/collections/mem0/snapshots` | Returns snapshot filename, file exists on disk |
| 2 | Single VPS → Pi5 backup | Run `backup-vps.sh` manually on test VPS | All 3 files land in Pi5 `/backups/active/T_TEST/`, meta.json has correct timestamp and size |
| 3 | Pi5 → PC pull | Run `nexgen-backup-pull.sh` manually on PC | Files appear in `nexgen-backups/weekly/YYYY-MM-DD/T_TEST/` |
| 4 | Full restore to fresh VPS | Provision new VPS → restore from Pi5 backup | OpenClaw starts, memories intact, personality loads, Qdrant queries return previous data |

### Hardening tests (after first customer onboarded)

| # | Test | How | Pass criteria |
|---|---|---|---|
| 5 | Corrupted file restore | Delete soul.md on VPS → restore from backup | File restored correctly, AI personality intact |
| 6 | PC cold restore | Delete Pi5 backup → restore from PC → restore to VPS | Full three-hop chain works end-to-end |
| 7 | Failure handling | Run backup against stopped VPS (SSH offline) | Script logs error, sends Telegram alert, continues to next VPS |
| 8 | PC offline tolerance | Disconnect PC → run PC pull script | Logs error, no crash, retries next run |

**Test order:** 1 → 2 → 3 → 4 (sequential, each depends on previous). Tests 5-8 can run independently after go-live.

---

## 10. Integration with Existing Specs

### Churn export (onboarding pipeline spec)

The existing churn export flow (`SCP → Pi5 archives/{ID}/`) continues unchanged. Backup and churn are separate:

- **Backup** = periodic safety net for active customers → `/backups/active/`
- **Churn** = final data export when customer leaves → `/backups/churn/`

The churn export may reuse the same SCP logic but runs as part of the cancel job, not the backup cron.

### D1 integration (VPS billing strategy spec)

Tier 1 backup script queries D1 for active VPS list:
```sql
SELECT vps_id, contabo_ip, customer_id, tier
FROM vps_instances
WHERE status = 'active'
```

Backup metadata could optionally be written to D1 (last_backup_at column) for monitoring via the daily cron. This is a nice-to-have, not required for MVP.

### Plan B (Pi5 worker)

Backup scripts will live alongside the existing Pi5 worker scripts. The backup cron is independent of the deployment worker — it runs on its own schedule and does not interfere with active deployments.

---

## 11. Assumptions and Constraints

| Assumption | Impact if wrong |
|---|---|
| Pi5 has stable SSH access to all customer VPSes | Backup fails for unreachable VPSes; Telegram alert covers this |
| PC has stable SSH access to Pi5 | PC pull fails; admin notices on their own machine |
| 200MB worst case per customer | If Qdrant grows larger, Pi5 10GB budget may need increasing |
| Contabo VPS uptime is adequate for weekly window | If VPS is down during backup window, that customer skips a week |
| Qdrant snapshot API is available on all customer VPSes | Only Tier 2+ have Qdrant; Tier 1 backup skips Qdrant/Mem0 |

---

## 12. Future Enhancements (Not in Scope)

- **Incremental backups:** rsync delta instead of full tar (saves bandwidth when clawd/ grows large)
- **Encryption at rest:** Encrypt backup archives before storing on PC
- **Cloud tier (R2):** Add Cloudflare R2 as third tier for disaster recovery beyond local PC
- **D1 tracking:** Add `last_backup_at` column to `vps_instances` table for centralized monitoring
- **Backup verification cron:** Weekly integrity check — decompress random backup, verify files exist
