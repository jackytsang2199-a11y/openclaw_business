-- Migration 0003: LS subscription identity columns (Codex Round 2 + Round 3)
--
-- Codex Round 2 critical finding: webhook code looked up customers by
-- custom_data.order_id (our internal id 1001/1002/...). Real LS subscription
-- events (renewal, cancel, refund) reference subscription_id and ls_order_id,
-- not our custom data. Without these columns we cannot reliably correlate
-- lifecycle events to the right customer.
--
-- Codex Round 3 architecture decision: extend api_usage instead of inventing
-- a new customers table. api_usage.customer_id is the canonical link.
--
-- Idempotency: ALTER TABLE ADD COLUMN is NOT idempotent in D1/SQLite.
-- Run once. Re-applying will fail on the first existing column.
--
-- Lookup priority for incoming webhook events:
--   1. ls_subscription_id (most reliable — present on all subscription_* events)
--   2. ls_order_id        (present on order_created and order_refunded)
--   3. ls_customer_id     (LS-side customer id, useful for customer-level events)
--   4. user_email         (last-resort fallback; not unique if customer reorders)

ALTER TABLE api_usage ADD COLUMN ls_order_id TEXT;
ALTER TABLE api_usage ADD COLUMN ls_subscription_id TEXT;
ALTER TABLE api_usage ADD COLUMN ls_customer_id TEXT;
ALTER TABLE api_usage ADD COLUMN ls_variant_id TEXT;
ALTER TABLE api_usage ADD COLUMN ls_status TEXT;          -- active | cancelled | expired | past_due | unpaid
ALTER TABLE api_usage ADD COLUMN ls_renews_at TEXT;       -- ISO timestamp; null after cancel
ALTER TABLE api_usage ADD COLUMN ls_ends_at TEXT;         -- ISO timestamp; set when subscription ends

-- Lookup index — most webhook handlers query by subscription_id first
CREATE INDEX IF NOT EXISTS idx_api_usage_ls_subscription ON api_usage(ls_subscription_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_ls_order ON api_usage(ls_order_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_ls_customer ON api_usage(ls_customer_id);
