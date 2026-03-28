import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          d1Databases: ["DB"],
          bindings: {
            LEMONSQUEEZY_WEBHOOK_SECRET: "test-webhook-secret",
            WORKER_TOKEN: "test-worker-token",
            CONFIRM_API_KEY: "test-confirm-key",
            OWNER_TELEGRAM_BOT_TOKEN: "test-bot-token",
            OWNER_TELEGRAM_CHAT_ID: "340067089",
            VARIANT_TIER_MAP: '{"var_tier1":1,"var_tier2":2,"var_tier3":3}',
            DEEPSEEK_API_KEY: "test-deepseek-key",
            OPENAI_API_KEY: "test-openai-key",
            DEEPSEEK_INPUT_RATE: "0.000001",
            DEEPSEEK_OUTPUT_RATE: "0.000002",
            OPENAI_INPUT_RATE: "0.000003",
            OPENAI_OUTPUT_RATE: "0.000006",
            USD_TO_HKD: "7.8",
          },
        },
      },
    },
  },
});
