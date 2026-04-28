-- Migration 0004: Persist LS identity on jobs table (Codex Round 4 finding #1)
--
-- Codex Round 4 found that order_created webhook tries to call linkLsIdentity
-- on api_usage, but api_usage row doesn't exist yet — it's created later by
-- Pi5 deployer. Result: LS identity is silently lost; later subscription
-- events cannot resolve back to the right customer.
--
-- Fix: store LS identity on jobs row at order_created time. When Pi5 calls
-- POST /api/usage to create api_usage, CF Worker copies ls_* from jobs.
--
-- Idempotency: ALTER TABLE ADD COLUMN is NOT idempotent. One-shot only.

ALTER TABLE jobs ADD COLUMN ls_order_id TEXT;
ALTER TABLE jobs ADD COLUMN ls_subscription_id TEXT;
ALTER TABLE jobs ADD COLUMN ls_customer_id TEXT;
ALTER TABLE jobs ADD COLUMN ls_variant_id TEXT;
ALTER TABLE jobs ADD COLUMN ls_test_mode INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_jobs_ls_subscription ON jobs(ls_subscription_id);
CREATE INDEX IF NOT EXISTS idx_jobs_ls_order ON jobs(ls_order_id);
