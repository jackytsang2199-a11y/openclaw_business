# D1 Migrations

> Established 2026-04-28 per Codex Round 2 review (production safety).

## Why this exists

Before this system, `schema.sql` contained `DROP TABLE IF EXISTS` statements. One accidental `wrangler d1 execute --file schema.sql` against production would have wiped all customer data, jobs, VPS records, and usage history.

## Conventions

### Numbered migrations live in `migrations/`

```
migrations/
  0001_baseline.sql           # current production schema (idempotent)
  0002_payment_integrity.sql  # future: webhook_events, payment_failed_at
  0003_subscription_identity.sql  # future: ls_subscription_id, ls_customer_id, etc.
  0004_atomic_budget.sql      # future: reserved_spend_hkd, reservation_id
  ...
```

### Every migration must be idempotent

- Use `CREATE TABLE IF NOT EXISTS`, never bare `CREATE TABLE`
- Use `ALTER TABLE ... ADD COLUMN` only when column does NOT already exist (D1 doesn't support `IF NOT EXISTS` on ADD COLUMN — wrap with conditional via PRAGMA check or a try/catch in the runner script)
- Use `INSERT OR IGNORE` for seed data
- Never `DROP TABLE` in migrations

### Destructive operations live in `schema-fresh-init.sql`

That file is for setting up brand-new test/dev databases. It has `DROP TABLE` and is clearly marked dangerous.

## How to apply migrations

### Production (`nexgen-prod`)

```bash
# Backup first (always)
wrangler d1 export nexgen-prod --output backups/nexgen-prod-$(date +%Y%m%d-%H%M).sql

# Apply (idempotent — safe to re-run)
wrangler d1 execute nexgen-prod --file migrations/0001_baseline.sql
wrangler d1 execute nexgen-prod --file migrations/0002_payment_integrity.sql
# ... etc
```

### Test/dev (fresh)

```bash
# Wipe and recreate
wrangler d1 execute nexgen-test --file schema-fresh-init.sql
wrangler d1 execute nexgen-test --file migrations/0001_baseline.sql
# ... apply newer migrations
```

## Adding a new migration

1. Create `migrations/NNNN_name.sql` with the next sequence number
2. Write idempotent SQL (CREATE TABLE IF NOT EXISTS, ADD COLUMN with check)
3. Test against a fresh test DB AND a partial-state DB
4. Backup production
5. Apply to production

## Rollback procedure

If a migration causes problems:

1. Restore from `backups/nexgen-prod-YYYYMMDD-HHMM.sql` via `wrangler d1 execute --file <backup>`
2. Identify root cause
3. Fix the migration file or write a corrective `NNNN_revert_*.sql`

## Files in this directory

| File | Purpose | Safe on prod? |
|------|---------|--------------|
| `migrations/0001_baseline.sql` | Current schema baseline | ✅ Yes (idempotent) |
| `schema-fresh-init.sql` | Wipe and recreate test DB | ❌ NO — destructive |
| `schema.sql` | Deprecated stub pointing here | ✅ Empty |
