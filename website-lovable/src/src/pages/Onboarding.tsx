import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Info, HelpCircle, Send, CheckCircle2, Loader2, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SUPPORT_EMAIL } from "@/lib/constants";

// Lemon Squeezy checkout URLs — monthly products live, quarterly/annual TODO
const checkoutUrls: Record<string, string> = {
  "starter-monthly": "https://3nexgen.lemonsqueezy.com/checkout/buy/b4d40f92-0f9b-4666-8556-e59dcbde6b01",
  "starter-quarterly": "https://3nexgen.lemonsqueezy.com/checkout/buy/b4d40f92-0f9b-4666-8556-e59dcbde6b01", // TODO: create quarterly product
  "starter-annual": "https://3nexgen.lemonsqueezy.com/checkout/buy/b4d40f92-0f9b-4666-8556-e59dcbde6b01", // TODO: create annual product
  "pro-monthly": "https://3nexgen.lemonsqueezy.com/checkout/buy/a4ef4f6c-709d-4176-8802-68c189b33613",
  "pro-quarterly": "https://3nexgen.lemonsqueezy.com/checkout/buy/a4ef4f6c-709d-4176-8802-68c189b33613", // TODO: create quarterly product
  "pro-annual": "https://3nexgen.lemonsqueezy.com/checkout/buy/a4ef4f6c-709d-4176-8802-68c189b33613", // TODO: create annual product
  "elite-monthly": "https://3nexgen.lemonsqueezy.com/checkout/buy/7251f5b3-193a-47a4-9023-78c27266079f",
  "elite-quarterly": "https://3nexgen.lemonsqueezy.com/checkout/buy/7251f5b3-193a-47a4-9023-78c27266079f", // TODO: create quarterly product
  "elite-annual": "https://3nexgen.lemonsqueezy.com/checkout/buy/7251f5b3-193a-47a4-9023-78c27266079f", // TODO: create annual product
};

const plans = [
  { id: "starter-monthly", label: "基本版 — 月費 HK$248/月" },
  { id: "starter-quarterly", label: "基本版 — 季度 HK$188/月（合計 HK$564）" },
  { id: "starter-annual", label: "基本版 — 年費 HK$158/月（合計 HK$1,896）" },
  { id: "pro-monthly", label: "專業版 — 月費 HK$398/月" },
  { id: "pro-quarterly", label: "專業版 — 季度 HK$298/月（合計 HK$894）⭐ 推薦" },
  { id: "pro-annual", label: "專業版 — 年費 HK$248/月（合計 HK$2,976）" },
  { id: "elite-monthly", label: "旗艦版 — 月費 HK$598/月" },
  { id: "elite-quarterly", label: "旗艦版 — 季度 HK$458/月（合計 HK$1,374）" },
  { id: "elite-annual", label: "旗艦版 — 年費 HK$388/月（合計 HK$4,656）" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const botTokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
const userIdRegex = /^\d{5,}$/;

function GuideTooltip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-primary hover:bg-primary/10 hover:text-primary/80 transition-all duration-200">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">教學</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs text-sm leading-relaxed p-4" sideOffset={8}>
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getFieldState(value: string, pattern?: RegExp, touched?: boolean): string {
  if (!touched || !value) return "";
  if (pattern && !pattern.test(value)) return "border-destructive/50 focus:ring-destructive/30";
  return "border-emerald-500/50 focus:ring-emerald-500/30";
}

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get("tier") || "";
  const planParam = searchParams.get("plan") || "quarterly";

  const defaultPlan = tierParam ? `${tierParam}-${planParam}` : "";

  const [form, setForm] = useState({
    email: "",
    plan: defaultPlan,
    botToken: "",
    userId: "",
    botName: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tierParam && planParam) {
      setForm((prev) => ({ ...prev, plan: `${tierParam}-${planParam}` }));
    }
  }, [tierParam, planParam]);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isValid = form.email && emailRegex.test(form.email) && form.plan && form.botToken && botTokenRegex.test(form.botToken) && form.userId && userIdRegex.test(form.userId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, botToken: true, userId: true });
    if (!isValid) return;

    setIsSubmitting(true);
    // Save form data to localStorage so it persists through payment redirect
    sessionStorage.setItem("nexgen_onboarding", JSON.stringify(form));
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 400);
  };

  const handleCardPayment = () => {
    const url = checkoutUrls[form.plan];
    if (url) {
      // Pass email as prefill param for LS checkout
      const checkoutUrl = `${url}?checkout[email]=${encodeURIComponent(form.email)}`;
      sessionStorage.removeItem("nexgen_onboarding");
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleFpsPayment = () => {
    // Send form data via email for manual processing
    const subject = encodeURIComponent(`NexGen PayMe/FPS 付款 — ${form.plan}`);
    const body = encodeURIComponent(
      `服務計劃: ${plans.find((p) => p.id === form.plan)?.label || form.plan}\n` +
      `電郵: ${form.email}\n` +
      `Bot Token: ${form.botToken}\n` +
      `Telegram User ID: ${form.userId}\n` +
      `Bot 顯示名稱: ${form.botName || "(未填寫)"}\n\n` +
      `付款方式: PayMe / FPS\n` +
      `請回覆此電郵確認收款後安排安裝。`
    );
    sessionStorage.removeItem("nexgen_onboarding");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  // Payment choice screen after form submission
  if (submitted) {
    const selectedPlan = plans.find((p) => p.id === form.plan);
    return (
      <>
      <Helmet>
        <title>完成設定 | NexGen</title>
        <meta name="description" content="填寫設定資料，選擇付款方式，30 分鐘完成安裝。" />
      </Helmet>
      <section className="container py-20 max-w-lg mx-auto text-center space-y-8">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl md:text-4xl">資料已確認</h1>
        <p className="text-muted-foreground">
          你選擇了：<span className="text-foreground font-medium">{selectedPlan?.label}</span>
        </p>
        <p className="text-muted-foreground">選擇付款方式完成訂購：</p>

        <div className="space-y-4 max-w-sm mx-auto">
          {/* Primary: Card payment via Lemon Squeezy */}
          <Button
            onClick={handleCardPayment}
            size="lg"
            className="w-full rounded-2xl text-base py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 btn-press"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            信用卡 / Apple Pay 付款
          </Button>

          {/* Secondary: PayMe / FPS */}
          <Button
            onClick={handleFpsPayment}
            variant="outline"
            size="lg"
            className="w-full rounded-2xl text-base py-6 border-border hover:bg-accent btn-press"
          >
            <Smartphone className="h-5 w-5 mr-2" />
            PayMe / FPS 付款
          </Button>

          <button onClick={() => setSubmitted(false)} className="text-sm text-primary hover:underline mt-2">
            修改資料
          </button>

          <p className="text-xs text-muted-foreground">
            信用卡付款後自動開始安裝（最快 30 分鐘）。<br />
            PayMe/FPS 付款需人工確認，安裝時間可能較長。
          </p>
        </div>

        <p className="text-sm text-muted-foreground pt-4">
          如有問題，請聯絡{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </section>
      </>
    );
  }

  return (
    <>
    <Helmet>
      <title>完成設定 | NexGen</title>
      <meta name="description" content="填寫設定資料，選擇付款方式，30 分鐘完成安裝。" />
    </Helmet>
    <section className="container py-16 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 mb-10">
        <h1 className="text-3xl md:text-5xl">完成設定</h1>
        <p className="text-muted-foreground prose-zh">
          填寫以下資料並選擇付款方式。付款確認後，我們會在 30 分鐘內完成安裝。
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plan selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="plan" className="text-base font-medium">服務計劃 *</Label>
          </div>
          <select
            id="plan"
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className={`w-full rounded-xl border bg-background px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              form.plan ? "border-emerald-500/50" : "border-border"
            }`}
            required
          >
            <option value="" disabled>選擇你的方案</option>
            <optgroup label="基本版 Starter">
              {plans.filter((p) => p.id.startsWith("starter")).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="專業版 Pro ⭐">
              {plans.filter((p) => p.id.startsWith("pro")).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="旗艦版 Elite">
              {plans.filter((p) => p.id.startsWith("elite")).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-medium">電郵地址 *</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onBlur={() => markTouched("email")}
            className={`rounded-xl py-3 transition-all duration-200 ${getFieldState(form.email, emailRegex, touched.email)}`}
            required
          />
          {touched.email && form.email && !emailRegex.test(form.email) && (
            <p className="text-xs text-destructive">請輸入有效的電郵地址</p>
          )}
        </div>

        {/* Bot Token */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="botToken" className="text-base font-medium">Telegram Bot Token *</Label>
            <GuideTooltip>
              <p className="font-medium mb-2">如何取得 Bot Token：</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>在 Telegram 搜尋 <strong>BotFather</strong>（認住藍色剔號 ✓）</li>
                <li>輸入 <code className="bg-muted px-1 rounded">/newbot</code></li>
                <li>設定 Bot 顯示名稱和 username（必須以 bot 結尾）</li>
                <li>BotFather 會發送一串 Token，格式如 <code className="bg-muted px-1 rounded text-xs">123456789:ABCdef...</code></li>
                <li>複製整串 Token 貼到這裏</li>
              </ol>
              <Link to="/bot-guide" className="text-primary text-xs mt-2 block hover:underline">
                查看完整圖文教學 →
              </Link>
            </GuideTooltip>
          </div>
          <Input
            id="botToken"
            type="text"
            placeholder="例如：123456789:ABCdefGHIjklMNOpqrsTUV"
            value={form.botToken}
            onChange={(e) => setForm({ ...form, botToken: e.target.value })}
            onBlur={() => markTouched("botToken")}
            className={`rounded-xl py-3 font-mono text-sm transition-all duration-200 ${getFieldState(form.botToken, botTokenRegex, touched.botToken)}`}
            required
          />
          {touched.botToken && form.botToken && !botTokenRegex.test(form.botToken) && (
            <p className="text-xs text-destructive">Token 格式應為：數字:英文字母組合</p>
          )}
        </div>

        {/* User ID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="userId" className="text-base font-medium">Telegram User ID *</Label>
            <GuideTooltip>
              <p className="font-medium mb-2">如何取得 User ID：</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>在 Telegram 搜尋 <strong>@userinfobot</strong></li>
                <li>向它發送任何訊息</li>
                <li>它會回覆你的 User ID（一串數字）</li>
                <li>複製這個數字貼到這裏</li>
              </ol>
            </GuideTooltip>
          </div>
          <Input
            id="userId"
            type="text"
            placeholder="例如：123456789"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            onBlur={() => markTouched("userId")}
            className={`rounded-xl py-3 font-mono text-sm transition-all duration-200 ${getFieldState(form.userId, userIdRegex, touched.userId)}`}
            required
          />
          {touched.userId && form.userId && !userIdRegex.test(form.userId) && (
            <p className="text-xs text-destructive">User ID 應為至少 5 位數字</p>
          )}
        </div>

        {/* Bot display name (optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="botName" className="text-base font-medium">Bot 顯示名稱</Label>
            <span className="text-xs text-muted-foreground">（選填）</span>
          </div>
          <Input
            id="botName"
            type="text"
            placeholder="例如：我的 AI 助手"
            value={form.botName}
            onChange={(e) => setForm({ ...form, botName: e.target.value })}
            className="rounded-xl py-3 transition-all duration-200"
          />
        </div>

        {/* Submit */}
        <div className="pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={!isValid || isSubmitting}
            className="w-full rounded-2xl text-lg py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 btn-press disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Send className="h-5 w-5 mr-2" />
            )}
            {isSubmitting ? "提交中…" : "提交並前往付款"}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            提交後選擇付款方式，信用卡付款即時開始安裝
          </p>
        </div>
      </form>

      {/* Help */}
      <div className="mt-10 rounded-xl border border-border bg-accent/30 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            需要幫助建立 Telegram Bot？{" "}
            <Link to="/bot-guide" className="text-primary font-medium hover:underline">
              查看圖文教學
            </Link>
          </p>
        </div>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            遇到問題？{" "}
            <Link to="/contact" className="text-primary font-medium hover:underline">
              提交支援工單
            </Link>
          </p>
        </div>
      </div>
    </section>
    </>
  );
};

export default Onboarding;
