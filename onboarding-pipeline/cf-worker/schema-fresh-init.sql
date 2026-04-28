-- ============================================================================
-- DESTRUCTIVE: FRESH DATABASE INITIALIZATION ONLY
-- ============================================================================
--
-- WARNING: This file DROPS all tables before recreating them.
-- DO NOT RUN AGAINST PRODUCTION D1.
--
-- Intended use: setting up a brand-new test/dev D1 database from scratch.
-- For production schema changes, use numbered migrations in `migrations/`.
--
-- To use:
--   1. Confirm target DB is NOT production
--   2. wrangler d1 execute <test-db-name> --file schema-fresh-init.sql
--
-- For idempotent baseline that's safe to re-run:
--   wrangler d1 execute <db-name> --file migrations/0001_baseline.sql
-- ============================================================================

DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS id_counter;
DROP TABLE IF EXISTS health;
DROP TABLE IF EXISTS vps_instances;
DROP TABLE IF EXISTS api_usage;
DROP TABLE IF EXISTS usage_history;
DROP TABLE IF EXISTS audit_log;

-- Recreate via baseline (this includes CREATE TABLE IF NOT EXISTS for all tables)
-- After running this file, also run: migrations/0001_baseline.sql
