-- Migration 0002: Payment integrity (Codex Round 1+2 P0)
--
-- Adds:
--  1. webhook_events table — idempotency for LS webhook delivery
--  2. payment_failed_at column on api_usage — drives grace policy (Day 0/3/7)
--
-- Idempotency: webhook_events is CREATE TABLE IF NOT EXISTS (safe to re-run).
-- ALTER TABLE ADD COLUMN is NOT idempotent in D1/SQLite — running this migration
-- twice will fail on the second ALTER. To re-validate without re-applying:
--   wrangler d1 execute nexgen-jobs --command "PRAGMA table_info(api_usage)"
-- and verify the column exists.

-- ============================================================================
-- 1. webhook_events: every LS webhook delivery, deduped by LS event_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,                  -- LS-supplied event UUID (X-Event-Id header or meta.event_id)
  event_name TEXT NOT NULL,                       -- order_created / subscription_cancelled / subscription_payment_refunded / etc
  ls_test_mode INTEGER DEFAULT 0,                 -- 0=live, 1=test mode webhook
  signature_valid INTEGER NOT NULL DEFAULT 0,     -- 1=HMAC verified before storage
  customer_id TEXT,                               -- resolved api_usage.customer_id (nullable until resolved)
  ls_subscription_id TEXT,                        -- subscription this event references (nullable)
  ls_order_id TEXT,                               -- LS order id (different from our internal order_id)
  payload_json TEXT NOT NULL,                     -- full body for audit/replay
  processed_at TEXT NOT NULL,                     -- when worker handled it
  result_status TEXT,                             -- ok | rejected_variant_mismatch | rejected_amount_mismatch | rejected_test_mode_in_prod | duplicate | order_not_found | error
  error_message TEXT,                             -- if result_status indicates failure
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription ON webhook_events(ls_subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer ON webhook_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

-- ============================================================================
-- 2. payment_failed_at column on api_usage — grace policy state
-- ============================================================================
--
-- Semantics:
--   NULL          → payment is in good standing
--   ISO timestamp → first failure timestamp; days elapsed drives policy:
--                   Day 0    → owner alert + customer email
--                   Day 3+   → budget→0 (proxy returns 429 on next request)
--                   Day 7+   → schedule VPS cancel
--
-- On successful renewal (subscription_payment_success) clear back to NULL.

ALTER TABLE api_usage ADD COLUMN payment_failed_at TEXT;
