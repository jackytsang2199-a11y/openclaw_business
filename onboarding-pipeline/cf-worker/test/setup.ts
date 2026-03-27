import { env } from "cloudflare:test";

// Apply D1 schema before all tests — each statement must be separate
await env.DB.exec("DROP TABLE IF EXISTS jobs");
await env.DB.exec("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending_payment', job_type TEXT NOT NULL DEFAULT 'deploy', tier INTEGER NOT NULL, target_tier INTEGER, display_name TEXT NOT NULL, telegram_user_id TEXT NOT NULL, email TEXT NOT NULL, payment_method TEXT, bot_token TEXT NOT NULL UNIQUE, bot_username TEXT NOT NULL UNIQUE, server_ip TEXT, error_log TEXT, re_queue_count INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");

await env.DB.exec("DROP TABLE IF EXISTS id_counter");
await env.DB.exec("CREATE TABLE IF NOT EXISTS id_counter (key TEXT PRIMARY KEY, value INTEGER NOT NULL)");
await env.DB.exec("INSERT OR IGNORE INTO id_counter (key, value) VALUES ('next_id', 1001)");

await env.DB.exec("DROP TABLE IF EXISTS health");
await env.DB.exec("CREATE TABLE IF NOT EXISTS health (worker_id TEXT PRIMARY KEY DEFAULT 'pi5', last_ping TEXT NOT NULL, alerted INTEGER DEFAULT 0)");

await env.DB.exec("DROP TABLE IF EXISTS vps_instances");
await env.DB.exec("CREATE TABLE IF NOT EXISTS vps_instances (vps_id TEXT PRIMARY KEY, contabo_contract_id TEXT, contabo_ip TEXT, customer_id TEXT, status TEXT NOT NULL, tier INTEGER, reinstall_count INTEGER DEFAULT 0, billing_start TEXT, cancel_date TEXT, cancel_deadline TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
