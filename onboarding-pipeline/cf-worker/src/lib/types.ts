export interface Env {
  DB: D1Database;
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  WORKER_TOKEN: string;
  CONFIRM_API_KEY: string;
  OWNER_TELEGRAM_BOT_TOKEN: string;
  OWNER_TELEGRAM_CHAT_ID: string;
  VARIANT_TIER_MAP: string;
  VARIANT_VALIDATION_STRICT?: string;     // "1" = strict reject; default lenient
  ALLOW_TEST_MODE_IN_PROD?: string;       // "1" = accept LS test_mode webhooks; default reject
  DEEPSEEK_API_KEY: string;
  OPENAI_API_KEY: string;
  DEEPSEEK_INPUT_RATE: string;
  DEEPSEEK_OUTPUT_RATE: string;
  OPENAI_INPUT_RATE: string;
  OPENAI_OUTPUT_RATE: string;
  ZHIPU_INPUT_RATE: string;
  ZHIPU_OUTPUT_RATE: string;
  ZHIPU_API_KEY: string;
  USD_TO_HKD: string;
}

export interface Job {
  id: string;
  status: string;
  job_type: string;
  tier: number;
  target_tier: number | null;
  display_name: string;
  telegram_user_id: string;
  email: string;
  payment_method: string | null;
  bot_token: string;
  bot_username: string;
  server_ip: string | null;
  error_log: string | null;
  re_queue_count: number;
  created_at: string;
  updated_at: string;
  // Phase 2 — LS identity persisted at order_created
  ls_order_id: string | null;
  ls_subscription_id: string | null;
  ls_customer_id: string | null;
  ls_variant_id: string | null;
  ls_test_mode: number;     // 0 = live, 1 = test
}

export interface VpsInstance {
  vps_id: string;
  contabo_contract_id: string | null;
  contabo_ip: string | null;
  customer_id: string | null;
  status: string;
  tier: number | null;
  reinstall_count: number;
  billing_start: string | null;
  cancel_date: string | null;
  cancel_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus = "pending_payment" | "ready" | "provisioning" | "installing" | "qa" | "complete" | "failed" | "stale";
export type JobType = "deploy" | "upgrade" | "downgrade" | "cancel" | "delete" | "reactivate";
export type PaymentMethod = "lemon_squeezy" | "fps" | "payme";
export type VpsStatus = "provisioning" | "active" | "cancelling" | "expired";

export interface ApiUsage {
  id: number;
  customer_id: string;
  gateway_token: string;
  tier: number;
  monthly_budget_hkd: number | null;
  current_month: string;
  current_spend_hkd: number;
  warned_at: string | null;
  blocked_at: string | null;
  total_requests: number;
  total_tokens_in: number;
  total_tokens_out: number;
  created_at: string;
  updated_at: string;
  // Phase 2 additions (Codex Round 1+2)
  payment_failed_at: string | null;     // null = good standing; ISO timestamp = first-fail date
  ls_order_id: string | null;
  ls_subscription_id: string | null;
  ls_customer_id: string | null;
  ls_variant_id: string | null;
  ls_status: string | null;             // active | cancelled | expired | past_due | unpaid
  ls_renews_at: string | null;
  ls_ends_at: string | null;
}

export interface WebhookEvent {
  id: number;
  event_id: string;                     // LS event UUID — unique
  event_name: string;
  ls_test_mode: number;                 // 0/1
  signature_valid: number;              // 0/1
  customer_id: string | null;
  ls_subscription_id: string | null;
  ls_order_id: string | null;
  payload_json: string;
  processed_at: string;
  result_status: string | null;
  error_message: string | null;
  created_at: string;
}

export interface UsageHistory {
  id: number;
  customer_id: string;
  month: string;
  spend_hkd: number;
  requests: number;
  tokens_in: number;
  tokens_out: number;
  budget_hkd: number | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  customer_id: string;
  details: string | null;
  actor_ip: string | null;
  created_at: string;
}
