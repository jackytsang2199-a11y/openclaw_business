import SEOHead from "@/components/SEOHead";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Info, HelpCircle, Send, CheckCircle2, Loader2, CreditCard, Smartphone, ExternalLink, Copy, Check } from "lucide-react";
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
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

// Lemon Squeezy checkout URLs — all 9 products (3 tiers × 3 billing cycles)
const checkoutUrls: Record<string, string> = {
  "starter-monthly":   "https://3nexgen.lemonsqueezy.com/checkout/buy/b4d40f92-0f9b-4666-8556-e59dcbde6b01",
  "starter-quarterly": "https://3nexgen.lemonsqueezy.com/checkout/buy/be7b4d15-c389-4cb0-bb91-9033da013c8c",
  "starter-annual":    "https://3nexgen.lemonsqueezy.com/checkout/buy/3516ca39-a81d-4519-9eeb-9ba93dc1d939",
  "pro-monthly":       "https://3nexgen.lemonsqueezy.com/checkout/buy/a4ef4f6c-709d-4176-8802-68c189b33613",
  "pro-quarterly":     "https://3nexgen.lemonsqueezy.com/checkout/buy/39cbcd75-95da-4d53-9901-903fade1310d",
  "pro-annual":        "https://3nexgen.lemonsqueezy.com/checkout/buy/6956f865-2f54-44d9-95bd-7f3c2e15ec26",
  "elite-monthly":     "https://3nexgen.lemonsqueezy.com/checkout/buy/7251f5b3-193a-47a4-9023-78c27266079f",
  "elite-quarterly":   "https://3nexgen.lemonsqueezy.com/checkout/buy/3c2314e9-e005-4e31-a98e-ddb763ea1bf5",
  "elite-annual":      "https://3nexgen.lemonsqueezy.com/checkout/buy/cb786c99-ac37-4ec2-b79a-7e83c494f3a6",
};

const PLAN_IDS = [
  "starter-monthly", "starter-quarterly", "starter-annual",
  "pro-monthly", "pro-quarterly", "pro-annual",
  "elite-monthly", "elite-quarterly", "elite-annual",
] as const;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const botTokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
const userIdRegex = /^\d{5,}$/;

function GuideTooltip({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('onboarding');
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-primary hover:bg-primary/10 hover:text-primary/80 transition-all duration-200">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{t('tooltip.guide')}</span>
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
  const { t } = useTranslation('onboarding');
  const lp = useLocalizedPath();
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
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (tierParam && planParam) {
      setForm((prev) => ({ ...prev, plan: `${tierParam}-${planParam}` }));
    }
  }, [tierParam, planParam]);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const isValid = form.email && emailRegex.test(form.email) && form.plan && form.botToken && botTokenRegex.test(form.botToken) && form.userId && userIdRegex.test(form.userId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, botToken: true, userId: true });
    if (!isValid) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Parse tier from plan id (e.g. "pro-quarterly" -> 2)
    const tierMap: Record<string, number> = { starter: 1, pro: 2, elite: 3 };
    const tierName = form.plan.split("-")[0];
    const tier = tierMap[tierName];

    try {
      const res = await fetch("https://api.3nexgen.com/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          display_name: form.botName || `NexGen ${tierName}`,
          telegram_user_id: form.userId,
          email: form.email,
          bot_token: form.botToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || `Order creation failed (${res.status})`);
        setIsSubmitting(false);
        return;
      }
      const newOrderId = data.order?.id;
      if (!newOrderId) {
        setSubmitError("Order created but no ID returned");
        setIsSubmitting(false);
        return;
      }
      setOrderId(newOrderId);
      sessionStorage.setItem("nexgen_onboarding", JSON.stringify({ ...form, orderId: newOrderId }));
      setIsSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error");
      setIsSubmitting(false);
    }
  };

  const handleCardPayment = () => {
    const url = checkoutUrls[form.plan];
    if (url && orderId) {
      // Pass order_id as custom_data so webhook can find the pending D1 job
      const params = new URLSearchParams();
      params.set("checkout[email]", form.email);
      params.set("checkout[custom][order_id]", orderId);
      const checkoutUrl = `${url}?${params.toString()}`;
      sessionStorage.removeItem("nexgen_onboarding");
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    }
  };

  const [showPayme, setShowPayme] = useState(false);
  const [copiedPayme, setCopiedPayme] = useState(false);

  const PAYME_URL = "https://payme.hsbc/nexgen";

  const handlePaymePayment = () => {
    setShowPayme(true);
  };

  const handleCopyPaymeLink = () => {
    navigator.clipboard.writeText(PAYME_URL);
    setCopiedPayme(true);
    setTimeout(() => setCopiedPayme(false), 2000);
  };

  const selectedPlanLabel = t(`plans.${form.plan}`, { defaultValue: form.plan });

  const handlePaymeEmailConfirm = () => {
    const subject = encodeURIComponent(t('email.subject', { plan: form.plan }));
    const body = encodeURIComponent(
      `${t('email.bodyPlan', { plan: selectedPlanLabel })}\n` +
      `${t('email.bodyEmail', { email: form.email })}\n` +
      `${t('email.bodyBotToken', { botToken: form.botToken })}\n` +
      `${t('email.bodyUserId', { userId: form.userId })}\n` +
      `${t('email.bodyBotName', { botName: form.botName || t('email.bodyBotNameEmpty') })}\n\n` +
      `${t('email.bodyMethod')}\n` +
      t('email.bodyConfirm')
    );
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`, "_blank");
  };

  // Payment choice screen after form submission
  if (submitted) {
    return (
      <>
      <SEOHead page="onboarding" />
      <section className="container py-20 max-w-lg mx-auto text-center space-y-8">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl md:text-4xl">{t('payment.confirmedTitle')}</h1>
        <p className="text-muted-foreground">
          {t('payment.selectedPlan')}<span className="text-foreground font-medium">{selectedPlanLabel}</span>
        </p>
        <p className="text-muted-foreground">{t('payment.choosePayment')}</p>

        <div className="space-y-4 max-w-sm mx-auto">
          {/* Primary: Card payment via Lemon Squeezy */}
          <Button
            onClick={handleCardPayment}
            size="lg"
            className="w-full rounded-2xl text-base py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 btn-press"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            {t('payment.cardPayment')}
          </Button>

          {/* Secondary: PayMe */}
          <Button
            onClick={handlePaymePayment}
            variant="outline"
            size="lg"
            className="w-full rounded-2xl text-base py-6 border-border hover:bg-accent btn-press"
          >
            <Smartphone className="h-5 w-5 mr-2" />
            {t('payment.paymePayment')}
          </Button>

          {showPayme && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4 text-left">
              <p className="text-sm font-medium">{t('payment.paymeInstruction')}</p>
              <div className="flex items-center gap-2">
                <a
                  href={PAYME_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm font-mono text-primary hover:underline break-all"
                >
                  {PAYME_URL}
                  <ExternalLink className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />
                </a>
                <button
                  onClick={handleCopyPaymeLink}
                  className="shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
                  title={t('payment.paymeCopyTitle')}
                >
                  {copiedPayme ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('payment.paymeEmailHint')}
              </p>
              <Button
                onClick={handlePaymeEmailConfirm}
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {t('payment.paymeSendEmail')}
              </Button>
            </div>
          )}

          <button onClick={() => setSubmitted(false)} className="text-sm text-primary hover:underline mt-2">
            {t('payment.editInfo')}
          </button>

          <p className="text-xs text-muted-foreground">
            {t('payment.cardNote')}<br />
            {t('payment.paymeNote')}
          </p>
        </div>

        <p className="text-sm text-muted-foreground pt-4">
          {t('payment.contactSupport')}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </section>
      </>
    );
  }

  return (
    <>
    <SEOHead page="onboarding" />
    <section className="container py-16 max-w-xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3 mb-10">
        <h1 className="text-3xl md:text-5xl">{t('pageTitle')}</h1>
        <p className="text-muted-foreground prose-zh">
          {t('pageSubtitle')}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Plan selection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="plan" className="text-base font-medium">{t('form.planLabel')}</Label>
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
            <option value="" disabled>{t('form.planPlaceholder')}</option>
            <optgroup label={t('optgroup.starter')}>
              {PLAN_IDS.filter((p) => p.startsWith("starter")).map((p) => (
                <option key={p} value={p}>{t(`plans.${p}`)}</option>
              ))}
            </optgroup>
            <optgroup label={t('optgroup.pro')}>
              {PLAN_IDS.filter((p) => p.startsWith("pro")).map((p) => (
                <option key={p} value={p}>{t(`plans.${p}`)}</option>
              ))}
            </optgroup>
            <optgroup label={t('optgroup.elite')}>
              {PLAN_IDS.filter((p) => p.startsWith("elite")).map((p) => (
                <option key={p} value={p}>{t(`plans.${p}`)}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-base font-medium">{t('form.emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('form.emailPlaceholder')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onBlur={() => markTouched("email")}
            className={`rounded-xl py-3 transition-all duration-200 ${getFieldState(form.email, emailRegex, touched.email)}`}
            required
          />
          {touched.email && form.email && !emailRegex.test(form.email) && (
            <p className="text-xs text-destructive">{t('form.emailError')}</p>
          )}
        </div>

        {/* Bot Token */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="botToken" className="text-base font-medium">{t('form.botTokenLabel')}</Label>
            <GuideTooltip>
              <p className="font-medium mb-2">{t('tooltip.botToken.title')}</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li dangerouslySetInnerHTML={{ __html: t('tooltip.botToken.step1') }} />
                <li dangerouslySetInnerHTML={{ __html: t('tooltip.botToken.step2') }} />
                <li>{t('tooltip.botToken.step3')}</li>
                <li dangerouslySetInnerHTML={{ __html: t('tooltip.botToken.step4') }} />
                <li>{t('tooltip.botToken.step5')}</li>
              </ol>
              <Link to={lp("/bot-guide")} className="text-primary text-xs mt-2 block hover:underline">
                {t('tooltip.botToken.fullGuide')}
              </Link>
            </GuideTooltip>
          </div>
          <Input
            id="botToken"
            type="text"
            placeholder={t('form.botTokenPlaceholder')}
            value={form.botToken}
            onChange={(e) => setForm({ ...form, botToken: e.target.value })}
            onBlur={() => markTouched("botToken")}
            className={`rounded-xl py-3 font-mono text-sm transition-all duration-200 ${getFieldState(form.botToken, botTokenRegex, touched.botToken)}`}
            required
          />
          {touched.botToken && form.botToken && !botTokenRegex.test(form.botToken) && (
            <p className="text-xs text-destructive">{t('form.botTokenError')}</p>
          )}
        </div>

        {/* User ID */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="userId" className="text-base font-medium">{t('form.userIdLabel')}</Label>
            <GuideTooltip>
              <p className="font-medium mb-2">{t('tooltip.userId.title')}</p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li dangerouslySetInnerHTML={{ __html: t('tooltip.userId.step1') }} />
                <li>{t('tooltip.userId.step2')}</li>
                <li>{t('tooltip.userId.step3')}</li>
                <li>{t('tooltip.userId.step4')}</li>
              </ol>
            </GuideTooltip>
          </div>
          <Input
            id="userId"
            type="text"
            placeholder={t('form.userIdPlaceholder')}
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            onBlur={() => markTouched("userId")}
            className={`rounded-xl py-3 font-mono text-sm transition-all duration-200 ${getFieldState(form.userId, userIdRegex, touched.userId)}`}
            required
          />
          {touched.userId && form.userId && !userIdRegex.test(form.userId) && (
            <p className="text-xs text-destructive">{t('form.userIdError')}</p>
          )}
        </div>

        {/* Bot display name (optional) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="botName" className="text-base font-medium">{t('form.botNameLabel')}</Label>
            <span className="text-xs text-muted-foreground">{t('form.botNameOptional')}</span>
          </div>
          <Input
            id="botName"
            type="text"
            placeholder={t('form.botNamePlaceholder')}
            value={form.botName}
            onChange={(e) => setForm({ ...form, botName: e.target.value })}
            className="rounded-xl py-3 transition-all duration-200"
          />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {submitError}
          </div>
        )}

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
            {isSubmitting ? t('form.submitting') : t('form.submit')}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-3">
            {t('form.submitHint')}
          </p>
        </div>
      </form>

      {/* Help */}
      <div className="mt-10 rounded-xl border border-border bg-accent/30 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {t('help.botGuideHint')}
            <Link to={lp("/bot-guide")} className="text-primary font-medium hover:underline">
              {t('help.botGuideLink')}
            </Link>
          </p>
        </div>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {t('help.supportHint')}
            <Link to={lp("/contact")} className="text-primary font-medium hover:underline">
              {t('help.supportLink')}
            </Link>
          </p>
        </div>
      </div>
    </section>
    </>
  );
};

export default Onboarding;
