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

await env.DB.exec("DROP TABLE IF EXISTS api_usage");
await env.DB.exec("CREATE TABLE IF NOT EXISTS api_usage (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT NOT NULL, gateway_token TEXT NOT NULL UNIQUE, tier INTEGER NOT NULL, monthly_budget_hkd REAL, current_month TEXT NOT NULL, current_spend_hkd REAL DEFAULT 0, warned_at TEXT, blocked_at TEXT, total_requests INTEGER DEFAULT 0, total_tokens_in INTEGER DEFAULT 0, total_tokens_out INTEGER DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, payment_failed_at TEXT, ls_order_id TEXT, ls_subscription_id TEXT, ls_customer_id TEXT, ls_variant_id TEXT, ls_status TEXT, ls_renews_at TEXT, ls_ends_at TEXT)");

await env.DB.exec("DROP TABLE IF EXISTS webhook_events");
await env.DB.exec("CREATE TABLE IF NOT EXISTS webhook_events (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL UNIQUE, event_name TEXT NOT NULL, ls_test_mode INTEGER DEFAULT 0, signature_valid INTEGER NOT NULL DEFAULT 0, customer_id TEXT, ls_subscription_id TEXT, ls_order_id TEXT, payload_json TEXT NOT NULL, processed_at TEXT NOT NULL, result_status TEXT, error_message TEXT, created_at TEXT NOT NULL)");

await env.DB.exec("DROP TABLE IF EXISTS usage_history");
await env.DB.exec("CREATE TABLE IF NOT EXISTS usage_history (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id TEXT NOT NULL, month TEXT NOT NULL, spend_hkd REAL NOT NULL, requests INTEGER NOT NULL, tokens_in INTEGER NOT NULL, tokens_out INTEGER NOT NULL, budget_hkd REAL, created_at TEXT NOT NULL)");

await env.DB.exec("DROP TABLE IF EXISTS audit_log");
await env.DB.exec("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, customer_id TEXT NOT NULL, details TEXT, actor_ip TEXT, created_at TEXT NOT NULL)");
