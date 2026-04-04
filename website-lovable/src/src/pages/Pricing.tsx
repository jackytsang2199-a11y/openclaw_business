import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingCart, HelpCircle, Check, X, Server, Brain, Search, Calendar, Plug, Eye, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// TODO: Replace with real Lemon Squeezy variant URLs after product setup
const tiers = [
  {
    emoji: "🌱",
    name: "新手上路",
    installOriginal: 400,
    installPromo: 200,
    monthly: 148,
    annual: 1508,
    checkoutMonthly: "https://3nexgen.lemonsqueezy.com/checkout/buy/TODO_TIER1_MONTHLY",
    checkoutAnnual: "https://3nexgen.lemonsqueezy.com/checkout/buy/TODO_TIER1_ANNUAL",
    suitedFor: "想試試 AI 助手",
    popular: false,
    premium: false,
    specs: { vps: "4 核 / 8GB", memory: false, search: false },
    features: {
      aiModel: "DeepSeek",
      messaging: "Telegram only",
      memory: { has: false, label: "長期記憶", detail: "" },
      search: { has: false, label: "即時搜尋", detail: "" },
      recovery: { has: false, label: "自動恢復", detail: "" },
      browser: { has: false, label: "瀏覽器自動化", detail: "" },
      support: "AI 客服",
      dailyLimit: 100,
    },
  },
  {
    emoji: "⭐",
    name: "智能管家",
    installOriginal: 800,
    installPromo: 400,
    monthly: 248,
    annual: 2528,
    checkoutMonthly: "https://3nexgen.lemonsqueezy.com/checkout/buy/TODO_TIER2_MONTHLY",
    checkoutAnnual: "https://3nexgen.lemonsqueezy.com/checkout/buy/TODO_TIER2_ANNUAL",
    suitedFor: "大部分人選這個",
    popular: true,
    premium: false,
    specs: { vps: "4 核 / 8GB", memory: true, search: true },
    features: {
      aiModel: "DeepSeek + GPT-4.1-mini",
      messaging: "Telegram",
      memory: { has: true, label: "長期記憶", detail: "它會記住你" },
      search: { has: true, label: "即時搜尋", detail: "可以上網查資料" },
      recovery: { has: true, label: "自動恢復", detail: "斷線自動修復" },
      browser: { has: false, label: "瀏覽器自動化", detail: "" },
      support: "AI + 7 日真人支援",
      dailyLimit: 300,
    },
  },
  {
    emoji: "🚀",
    name: "全能大師",
    installOriginal: 1800,
    installPromo: 900,
    monthly: 388,
    annual: 3958,
    checkoutMonthly: "https://3nexgen.lemonsqueezy.com/checkout/buy/TODO_TIER3_MONTHLY",
    checkoutAnnual: "https://3nexgen.lemonsqueezy.com/checkout/buy/TODO_TIER3_ANNUAL",
    suitedFor: "需要最完整的體驗",
    popular: false,
    premium: true,
    specs: { vps: "4 核 / 8GB", memory: true, search: true },
    features: {
      aiModel: "DeepSeek + GPT-4.1",
      messaging: "全平台",
      memory: { has: true, label: "長期記憶", detail: "自訂 AI 性格" },
      search: { has: true, label: "即時搜尋", detail: "自訂搜尋配置" },
      recovery: { has: true, label: "自動恢復", detail: "全套 watchdog" },
      browser: { has: true, label: "瀏覽器自動化", detail: "" },
      support: "AI + 30 日優先支援",
      dailyLimit: 1000,
    },
  },
];

const openClawFeatures = [
  { icon: Calendar, title: "自動化日常", desc: "設定提醒、排行程、管理日程，用對話指令完成日常瑣事" },
  { icon: Search, title: "研究與資料", desc: "搜尋全網、整理資料、生成報告，你專注其他事" },
  { icon: Plug, title: "智能整合", desc: "連接 50+ 工具與平台，自動執行工作流程" },
  { icon: Eye, title: "瀏覽器自動化", desc: "格價、訂位、填表、搶票，AI 替你操作瀏覽器" },
];

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      {/* Promo banner */}
      <div className="bg-primary text-primary-foreground py-3">
        <div className="container text-center text-sm font-bold">
          🔥 開業優惠 — 首 20 位客戶安裝費半價！名額有限，先到先得。
        </div>
      </div>

      <section className="container py-20 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-3xl md:text-5xl">選擇最適合你的方案</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            一次安裝費 + 全包月費。沒有隱藏費用，沒有合約，隨時取消。
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium px-4 py-2 rounded-2xl transition-colors btn-press ${
                !isAnnual ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              每月付款
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium px-4 py-2 rounded-2xl transition-colors btn-press ${
                isAnnual ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              年費（85 折）
            </button>
          </div>
        </motion.div>

        {/* What is OpenClaw? */}
        <div className="max-w-3xl mx-auto mb-16 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl">什麼是 OpenClaw？</h2>
            <p className="text-primary font-medium text-lg">你的專屬 AI，不只聊天，還能動手做事。</p>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed text-base max-w-2xl mx-auto">
            <p>
              OpenClaw 是一個安裝在你自己伺服器上的 AI 智能體，透過 Telegram 與你對話。它不是雲端共用服務 — 運行在你自己的機器上，資料完全屬於你。
            </p>
            <p>
              OpenClaw 不只是聊天。它能搜尋全網資訊、管理檔案、排行程、操作瀏覽器，在你休息時自動完成任務。整個項目開源，社區持續開發新功能。你可以選擇使用 Claude、GPT 或本地模型 — 資料永遠留在你的伺服器上。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {openClawFeatures.map((feat) => (
              <div key={feat.title} className="rounded-2xl border border-border bg-card px-5 py-8 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="h-16 w-16 rounded-2xl border-2 border-primary/20 bg-primary/[0.04] flex items-center justify-center">
                  <feat.icon className="h-8 w-8 text-primary" strokeWidth={1.4} />
                </div>
                <h4 className="font-semibold text-base">{feat.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center">
          {tiers.map((tier, i) => {
            const mobileOrderClass = i === 1 ? "order-first" : i === 0 ? "order-2" : "order-last";
            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl border p-6 md:p-8 flex flex-col card-hover ${mobileOrderClass} md:order-none ${
                  tier.popular
                    ? "border-primary border-2 bg-card shadow-xl md:scale-105 md:-my-4"
                    : tier.premium
                    ? "border-accent-foreground/20 bg-card shadow-sm"
                    : "border-border bg-muted/70 shadow-sm"
                }`}
              >
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                    ⭐ 最受歡迎
                  </Badge>
                )}
                {tier.premium && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full border border-border">
                    Premium
                  </span>
                )}

                <div className="text-center space-y-3 mb-6">
                  <span className="text-3xl">{tier.emoji}</span>
                  <h3 className="text-xl">{tier.name}</h3>
                  <p className={`text-base ${tier.popular ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {tier.suitedFor}
                  </p>
                  <div>
                    <span className={`font-bold text-foreground ${tier.popular ? "text-4xl md:text-5xl" : "text-3xl"}`}>
                      HK${isAnnual ? tier.annual.toLocaleString() : tier.monthly}
                    </span>
                    <span className="text-sm text-muted-foreground">/{isAnnual ? "年" : "月"}</span>
                  </div>
                  <div className="text-base text-muted-foreground">
                    安裝費：
                    <span className="line-through mr-1">HK${tier.installOriginal}</span>
                    <span className="text-primary font-bold">HK${tier.installPromo}</span>
                    <span className="text-xs">（半價）</span>
                  </div>
                </div>

                {/* Spec Grid */}
                <div className="grid grid-cols-3 gap-2 text-center py-4 border-y border-border/50 mb-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">VPS</span>
                    <span className="text-sm font-semibold">{tier.specs.vps}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tier.specs.memory ? "bg-primary/10" : "bg-muted"}`}>
                      <Brain className={`h-4 w-4 ${tier.specs.memory ? "text-primary" : "text-muted-foreground/40"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">記憶</span>
                    {tier.specs.memory ? (
                      <Check className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tier.specs.search ? "bg-primary/10" : "bg-muted"}`}>
                      <Search className={`h-4 w-4 ${tier.specs.search ? "text-primary" : "text-muted-foreground/40"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">搜尋</span>
                    {tier.specs.search ? (
                      <Check className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                </div>

                {/* Feature list */}
                <div className="flex-1 space-y-3 mb-6">
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="font-medium">{tier.features.aiModel}</span>
                    </li>
                    <li className="flex items-start gap-2 text-base">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{tier.features.messaging}</span>
                    </li>
                    {(["recovery", "browser"] as const).map((key) => {
                      const feat = tier.features[key];
                      return (
                        <li key={key} className="flex items-start gap-2 text-base">
                          {feat.has ? (
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <span className={feat.has ? "" : "text-muted-foreground line-through"}>
                            {feat.label}
                            {feat.has && feat.detail && (
                              <span className="text-muted-foreground text-sm ml-1">— {feat.detail}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                    <li className="flex items-start gap-2 text-base">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{tier.features.support}</span>
                    </li>
                    <li className="text-muted-foreground text-sm pt-1">
                      每日 {tier.features.dailyLimit.toLocaleString()} 則訊息
                    </li>
                  </ul>
                </div>

                <Button
                  asChild
                  className={`w-full gap-2 rounded-2xl btn-press ${
                    tier.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      : "bg-transparent border border-primary/20 text-primary hover:bg-primary/[0.05]"
                  }`}
                >
                  <a href={isAnnual ? tier.checkoutAnnual : tier.checkoutMonthly} target="_blank" rel="noopener noreferrer">
                    <ShoppingCart className="h-4 w-4" />
                    立即訂購
                  </a>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Post-checkout note */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          付款後，系統會引導您填寫設定資料。
        </p>

        {/* Bottom CTA */}
        <div className="text-center space-y-6 py-8 rounded-2xl bg-accent/30 border border-border px-6 mt-12">
          <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground" />
          <h2 className="text-2xl md:text-3xl">需要協助選擇？</h2>
          <p className="text-muted-foreground text-lg">提交支援工單，我們會為您推薦最適合的方案。</p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg shadow-primary/20 btn-press">
            <Link to="/contact">
              <Mail className="h-5 w-5" />
              提交支援工單
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Pricing;
