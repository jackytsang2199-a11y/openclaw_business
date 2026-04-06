/**
 * Website Audit Tests — TDD for content/structure changes
 * Tests written FIRST, then implementation to make them pass.
 */
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC = path.resolve(__dirname, "..");
const read = (f: string) => fs.readFileSync(path.join(SRC, f), "utf-8");

// ── N4.1: Hero USPs ──
describe("Hero section", () => {
  test("diff line does NOT mention ChatGPT", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("ChatGPT 做不到的它全部做到");
  });

  test("checkmarks emphasize NexGen differentiators", () => {
    const index = read("pages/Index.tsx");
    expect(index).toContain("無需任何技術設定");
    expect(index).toContain("全套插件已預載");
  });
});

// ── N4.2: Top 50 fix ──
describe("Stats strip", () => {
  test("Top 50 label does not duplicate 'Top'", () => {
    const index = read("pages/Index.tsx");
    // Should NOT have value "Top 50" with label containing "Top"
    expect(index).not.toMatch(/value:\s*"Top 50".*label:\s*".*Top/s);
  });
});

// ── N4.3: Use cases emphasize agent ──
describe("Use cases", () => {
  test("prompts describe agent actions, not chatbot", () => {
    const index = read("pages/Index.tsx");
    // Old chatbot-style prompts should be gone
    expect(index).not.toContain("幫我歸納今天 10 封 email");
    expect(index).not.toContain("幫我寫一段 IG caption");
    expect(index).not.toContain("今晚想吃日本菜");
  });
});

// ── N4.4: Price CTA updated ──
describe("Price references", () => {
  test("no HK$148 references remain", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("HK$148");
  });

  test("CTA shows new quarterly price", () => {
    const index = read("pages/Index.tsx");
    expect(index).toContain("HK$188");
  });
});

// ── N4.5: Platform section removed ──
describe("Removed sections", () => {
  test("no platform support section", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("支援你常用的平台");
  });

  test("no 真人團隊 tagline", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("真人團隊。真正解答。");
  });
});

// ── N5.1: No 蟹助手 branding ──
describe("Branding", () => {
  test("no 蟹助手 references in any page", () => {
    const files = [
      "pages/Index.tsx", "pages/Pricing.tsx", "pages/Technology.tsx",
      "pages/FAQ.tsx", "pages/Contact.tsx", "pages/Terms.tsx",
      "pages/Privacy.tsx", "pages/Refund.tsx",
    ];
    for (const f of files) {
      const content = read(f);
      expect(content, `Found 蟹助手 in ${f}`).not.toContain("蟹助手");
    }
  });
});

// ── Pricing structure ──
describe("Pricing data", () => {
  test("no old tier names", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("新手上路");
    expect(pricing).not.toContain("智能管家");
    expect(pricing).not.toContain("全能大師");
  });

  test("has new tier names", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("基本版");
    expect(pricing).toContain("專業版");
    expect(pricing).toContain("旗艦版");
  });

  test("no GPT model references", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("GPT-4.1");
    expect(pricing).not.toContain("GPT-4.1-mini");
  });

  test("no daily message limits", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("dailyLimit");
  });

  test("no tiered support (AI客服/真人支援)", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("AI 客服");
    expect(pricing).not.toContain("真人支援");
    expect(pricing).not.toContain("優先支援");
  });

  test("has tier concepts (對話工具/助手/團隊)", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("AI 對話工具");
    expect(pricing).toContain("你的專屬 AI 助手");
    expect(pricing).toContain("你的 AI 團隊");
  });

  test("Elite has multi-agent feature", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("多智能體協作");
  });

  test("no 自訂 AI 性格 in pricing", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("自訂 AI 性格");
  });

  test("has monthly token quotas", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("monthlyTokens");
  });

  test("no Lemon Squeezy checkout URLs", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("lemonsqueezy.com");
    expect(pricing).not.toContain("TODO_TIER");
  });

  test("CTA links to /onboarding", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("/onboarding");
  });

  test("no separate install fee fields", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).not.toContain("installOriginal");
    expect(pricing).not.toContain("installPromo");
  });

  test("has 3 billing cycles", () => {
    const pricing = read("pages/Pricing.tsx");
    expect(pricing).toContain("monthly");
    expect(pricing).toContain("quarterly");
    expect(pricing).toContain("annual");
  });

  test("new prices present", () => {
    const pricing = read("pages/Pricing.tsx");
    // Quarterly Pro price
    expect(pricing).toContain("298");
    // Monthly Pro price
    expect(pricing).toContain("398");
  });
});

// ── FAQ updates ──
describe("FAQ", () => {
  test("no Pi5 reference", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).not.toContain("Raspberry Pi 5");
  });

  test("no old tier names", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).not.toContain("智能管家");
    expect(faq).not.toContain("全能大師");
  });

  test("cancel policy says VPS is reclaimed", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).not.toContain("取消後你仍然擁有已安裝的系統");
    expect(faq).toContain("回收");
  });

  test("payment methods updated", () => {
    const faq = read("pages/FAQ.tsx");
    expect(faq).toContain("PayMe");
    expect(faq).toContain("FPS");
  });
});

// ── Legal pages ──
describe("Legal pages", () => {
  test("Terms does not say VPS is retained", () => {
    const terms = read("pages/Terms.tsx");
    expect(terms).not.toContain("取消後客戶仍保留 VPS");
  });

  test("Refund page has no 48-hour cooling period", () => {
    const refund = read("pages/Refund.tsx");
    expect(refund).not.toContain("48 小時冷靜期");
  });

  test("legal pages updated to April 2026", () => {
    const terms = read("pages/Terms.tsx");
    const privacy = read("pages/Privacy.tsx");
    const refund = read("pages/Refund.tsx");
    expect(terms).toContain("2026 年 4 月");
    expect(privacy).toContain("2026 年 4 月");
    expect(refund).toContain("2026 年 4 月");
  });

  test("Terms does not mention install fee", () => {
    const terms = read("pages/Terms.tsx");
    expect(terms).not.toContain("安裝費為一次性收費");
  });
});

// ── Review findings — extra coverage ──
describe("Review fixes", () => {
  test("no 全能大師 in Technology.tsx", () => {
    const tech = read("pages/Technology.tsx");
    expect(tech).not.toContain("全能大師");
  });

  test("no 獨家 in Technology.tsx", () => {
    const tech = read("pages/Technology.tsx");
    expect(tech).not.toContain("獨家");
  });

  test("no 真人團隊 in Footer", () => {
    const footer = fs.readFileSync(path.join(SRC, "components", "Footer.tsx"), "utf-8");
    expect(footer).not.toContain("真人團隊。真正解答。");
  });

  test("no 背後的技術 in Index.tsx", () => {
    const index = read("pages/Index.tsx");
    expect(index).not.toContain("背後的技術");
  });
});
