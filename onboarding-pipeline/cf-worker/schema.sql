-- Job queue for customer onboarding pipeline
-- V2: customer-created bots, pending_payment status, plain numeric IDs
DROP TABLE IF EXISTS jobs;
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,                          -- 1001, 1002, ...
  status TEXT NOT NULL DEFAULT 'pending_payment',
  job_type TEXT NOT NULL DEFAULT 'deploy',
  tier INTEGER NOT NULL,
  target_tier INTEGER,
  display_name TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  payment_method TEXT,                          -- lemon_squeezy | fps | payme
  bot_token TEXT NOT NULL UNIQUE,
  bot_username TEXT NOT NULL UNIQUE,            -- from getMe validation
  server_ip TEXT,
  error_log TEXT,
  re_queue_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Auto-incrementing ID counter starting at 1001
DROP TABLE IF EXISTS id_counter;
CREATE TABLE IF NOT EXISTS id_counter (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO id_counter (key, value) VALUES ('next_id', 1001);

-- Pi5 health tracking
DROP TABLE IF EXISTS health;
CREATE TABLE IF NOT EXISTS health (
  worker_id TEXT PRIMARY KEY DEFAULT 'pi5',
  last_ping TEXT NOT NULL,
  alerted INTEGER DEFAULT 0
);

-- VPS instance tracking for recycling pool
CREATE TABLE IF NOT EXISTS vps_instances (
  vps_id TEXT PRIMARY KEY,
  contabo_contract_id TEXT,
  contabo_ip TEXT,
  customer_id TEXT,                             -- order_id, nullable (NULL when recyclable)
  status TEXT NOT NULL,                         -- provisioning | active | cancelling | expired
  tier INTEGER,
  reinstall_count INTEGER DEFAULT 0,
  billing_start TEXT,
  cancel_date TEXT,
  cancel_deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
