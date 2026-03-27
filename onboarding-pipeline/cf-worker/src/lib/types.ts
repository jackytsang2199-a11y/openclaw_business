export interface Env {
  DB: D1Database;
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  WORKER_TOKEN: string;
  CONFIRM_API_KEY: string;
  OWNER_TELEGRAM_BOT_TOKEN: string;
  OWNER_TELEGRAM_CHAT_ID: string;
  VARIANT_TIER_MAP: string;
  AI_GATEWAY_URL: string;
  DEEPSEEK_INPUT_RATE: string;
  DEEPSEEK_OUTPUT_RATE: string;
  OPENAI_INPUT_RATE: string;
  OPENAI_OUTPUT_RATE: string;
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
