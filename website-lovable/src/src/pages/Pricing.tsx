import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WHATSAPP_URL = "https://wa.me/85200000000";

const tiers = [
  {
    emoji: "🌱",
    name: "新手上路",
    installOriginal: 400,
    installPromo: 200,
    monthly: 148,
    annual: 1508,
    suitedFor: "想試試 AI 助手",
    popular: false,
    premium: false,
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
    suitedFor: "大部分人選這個",
    popular: true,
    premium: false,
    features: {
      aiModel: "DeepSeek + GPT-4.1-mini",
      messaging: "Telegram + WhatsApp",
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
    suitedFor: "需要最完整的體驗",
    popular: false,
    premium: true,
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

const comparisonRows = [
  { label: "月費", chatgpt: "HK$156", claw: "HK$248" },
  { label: "差價", chatgpt: "—", claw: "+HK$92" },
  { label: "長期記憶", chatgpt: "❌ 有限", claw: "✅ 完整（記住你所有對話）" },
  { label: "即時搜尋", chatgpt: "⚠️ 有限", claw: "✅ 無限制（包括 Reddit）" },
  { label: "私隱", chatgpt: "❌ 資料存於 OpenAI", claw: "✅ 資料存於你自己的伺服器" },
  { label: "24/7 Telegram", chatgpt: "❌", claw: "✅" },
  { label: "中文支援", chatgpt: "❌", claw: "✅" },
  { label: "獨立擁有", chatgpt: "❌ 共用", claw: "✅ 你專屬" },
];

const addons = [
  { name: "Pi5 硬件代購 + 安裝", price: "HK$800 起", desc: "買好裝好寄到你家" },
  { name: "額外通訊平台", price: "HK$50/個", desc: "加 WhatsApp / Discord 等" },
  { name: "AI 性格自訂", price: "HK$100", desc: "自訂 AI 說話風格" },
  { name: "系統遷移", price: "HK$300", desc: "VPS 與 Pi5 互轉，資料完整搬遷" },
  { name: "緊急支援", price: "HK$200/次", desc: "24 小時內回應" },
];

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <>
      {/* Promo banner */}
      <div className="bg-accent/50 border-b border-border">
        <div className="container py-3 text-center text-sm font-bold text-primary">
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
          <h1 className="text-3xl md:text-5xl">簡單透明收費</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            一次安裝費 + 全包月費。沒有隱藏費用，沒有合約，隨時取消。
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setIsAnnual(false)}
              className={`text-sm font-medium px-4 py-2 rounded-2xl transition-colors ${
                !isAnnual ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              每月付款
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`text-sm font-medium px-4 py-2 rounded-2xl transition-colors ${
                isAnnual ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              年費（85 折）
            </button>
          </div>
        </motion.div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {tiers.map((tier, i) => {
            const mobileOrderClass = i === 1 ? "order-first" : i === 0 ? "order-2" : "order-last";
            return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative rounded-2xl border p-6 md:p-8 flex flex-col ${mobileOrderClass} md:order-none ${
                tier.popular
                  ? "border-primary border-2 bg-card shadow-lg"
                  : tier.premium
                  ? "border-[#8B7355]/30 bg-card shadow-sm"
                  : "border-border bg-muted shadow-sm"
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
                <p className={`text-sm ${tier.popular ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {tier.suitedFor}
                </p>
                <div>
                  <span className="text-3xl font-bold text-foreground">
                    HK${isAnnual ? tier.annual.toLocaleString() : tier.monthly}
                  </span>
                  <span className="text-sm text-muted-foreground">/{isAnnual ? "年" : "月"}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  安裝費：
                  <span className="line-through mr-1">HK${tier.installOriginal}</span>
                  <span className="text-primary font-bold">HK${tier.installPromo}</span>
                  <span className="text-xs">（半價）</span>
                </div>
              </div>

              {/* Feature list */}
              <div className="flex-1 space-y-3 mb-6">
                <ul className="space-y-2.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-xs">{tier.features.aiModel}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{tier.features.messaging}</span>
                  </li>
                  {(["memory", "search", "recovery", "browser"] as const).map((key) => {
                    const feat = tier.features[key];
                    return (
                      <li key={key} className="flex items-start gap-2">
                        {feat.has ? (
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                        )}
                        <span className={feat.has ? "" : "text-muted-foreground/50"}>
                          {feat.label}
                          {feat.has && feat.detail && (
                            <span className="text-muted-foreground text-xs ml-1">— {feat.detail}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{tier.features.support}</span>
                  </li>
                  <li className="text-muted-foreground text-xs pt-1">
                    每日 {tier.features.dailyLimit.toLocaleString()} 則訊息
                  </li>
                </ul>
              </div>

              <Button
                asChild
                className={`w-full gap-2 rounded-2xl ${
                  tier.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                    : "bg-transparent border border-primary/20 text-primary hover:bg-primary/[0.05]"
                }`}
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp 查詢
                </a>
              </Button>
            </motion.div>
            );
          })}
        </div>

        {/* Daily cost reframe */}
        <p className="text-center text-muted-foreground text-sm mb-20">
          智能管家 HK$248/月 = 每日 <span className="text-primary font-bold">HK$8.3</span> — 一杯凍檸茶的價錢 🍋
        </p>

        {/* ChatGPT comparison */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl md:text-3xl text-center mb-4">與 ChatGPT Plus 比較</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-muted-foreground font-semibold" />
                  <th className="py-3 px-4 text-center text-muted-foreground font-semibold">ChatGPT Plus</th>
                  <th className="py-3 px-4 text-center font-bold text-primary">⭐ 蟹助手 智能管家</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-muted-foreground font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-center text-muted-foreground">{row.chatgpt}</td>
                    <td className="py-3 px-4 text-center">{row.claw}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-muted-foreground text-sm mt-6 leading-relaxed max-w-lg mx-auto">
            多付 HK$92，你得到的是一個真正屬於你、記住你、懂得搜尋、永遠在線的 AI 助手。
          </p>
        </div>

        {/* Monthly fee explanation */}
        <div className="max-w-2xl mx-auto mb-20 rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <h2 className="text-xl md:text-2xl">月費包含甚麼？— 全包，不用煩</h2>
          <p className="text-muted-foreground leading-relaxed text-sm">
            月費已包括 VPS 伺服器、AI 運算費用、VPN、維護及監控 — 你只需要每月繳付一筆費用，其他不用理會。就像手機月費一樣 — 一個計劃包含所有服務。
          </p>
        </div>

        {/* Add-ons */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl md:text-3xl text-center mb-8">附加服務</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-muted-foreground font-semibold">服務</th>
                  <th className="py-3 px-4 text-center text-muted-foreground font-semibold">價格</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">說明</th>
                </tr>
              </thead>
              <tbody>
                {addons.map((addon) => (
                  <tr key={addon.name} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-medium">{addon.name}</td>
                    <td className="py-3 px-4 text-center text-primary font-bold">{addon.price}</td>
                    <td className="py-3 px-4 text-muted-foreground">{addon.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment methods */}
        <div className="text-center mb-20 space-y-4">
          <h3 className="text-lg text-muted-foreground">付款方式</h3>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {["FPS 轉數快", "PayMe", "銀行轉帳", "PayPal（海外）"].map((m) => (
              <span key={m} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-2xl text-sm font-medium">
                {m}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">信用卡 / Visa / Mastercard 自動扣款即將推出</p>
        </div>

        {/* Bottom CTA */}
        <div className="text-center space-y-6 py-8 rounded-2xl bg-accent/30 border border-border px-6">
          <h2 className="text-2xl md:text-3xl">不確定哪個方案適合你？</h2>
          <p className="text-muted-foreground text-lg">WhatsApp 我們聊聊，免費建議，零壓力。</p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" />
              立即 WhatsApp 查詢
            </a>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Pricing;
