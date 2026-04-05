import SEOHead from "@/components/SEOHead";
import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { HelpCircle, Check, X, Server, Brain, Search, Calendar, Plug, Eye, Mail, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

type BillingCycle = "monthly" | "quarterly" | "annual";

const Pricing = () => {
  const { t } = useTranslation('pricing');
  const lp = useLocalizedPath();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("quarterly");

  const billingCycles = [
    { key: "monthly" as const, label: t('billing.monthly'), badge: null },
    { key: "quarterly" as const, label: t('billing.quarterly'), badge: null },
    { key: "annual" as const, label: t('billing.annual'), badge: t('billing.bestValue') },
  ];

  const tiers = [
    {
      id: "starter",
      name: t('tiers.starter.name'),
      subtitle: "Starter",
      concept: t('tiers.starter.concept'),
      tagline: t('tiers.starter.tagline'),
      description: t('tiers.starter.description'),
      recommended: false,
      pricing: {
        monthly:   { perMonth: 248, total: 248 },
        quarterly: { perMonth: 188, total: 564 },
        annual:    { perMonth: 158, total: 1896 },
      },
      monthlyTokens: "5,000,000",
      dailyConversations: "150",
      specs: { vps: "4 核 / 8GB", memory: false, search: false },
      features: {
        messaging: "Telegram",
        memory:   { has: false, label: t('features.memory') },
        search:   { has: false, label: t('features.search') },
        recovery: { has: false, label: t('features.recovery') },
        browser:  { has: false, label: t('features.browser') },
        multiAgent: { has: false, label: t('features.multiAgent') },
      },
    },
    {
      id: "pro",
      name: t('tiers.pro.name'),
      subtitle: "Pro",
      concept: t('tiers.pro.concept'),
      tagline: t('tiers.pro.tagline'),
      description: t('tiers.pro.description'),
      recommended: true,
      pricing: {
        monthly:   { perMonth: 398, total: 398 },
        quarterly: { perMonth: 298, total: 894 },
        annual:    { perMonth: 248, total: 2976 },
      },
      monthlyTokens: "10,000,000",
      dailyConversations: "300",
      specs: { vps: "4 核 / 8GB", memory: true, search: true },
      features: {
        messaging: "Telegram",
        memory:   { has: true, label: t('features.memory'), detail: t('features.memory.detailPro') },
        search:   { has: true, label: t('features.search'), detail: t('features.search.detailPro') },
        recovery: { has: true, label: t('features.recovery'), detail: t('features.recovery.detailPro') },
        browser:  { has: false, label: t('features.browser') },
        multiAgent: { has: false, label: t('features.multiAgent') },
      },
    },
    {
      id: "elite",
      name: t('tiers.elite.name'),
      subtitle: "Elite",
      concept: t('tiers.elite.concept'),
      tagline: t('tiers.elite.tagline'),
      description: t('tiers.elite.description'),
      recommended: false,
      pricing: {
        monthly:   { perMonth: 598, total: 598 },
        quarterly: { perMonth: 458, total: 1374 },
        annual:    { perMonth: 388, total: 4656 },
      },
      monthlyTokens: "20,000,000",
      dailyConversations: "600",
      specs: { vps: "4 核 / 8GB", memory: true, search: true },
      features: {
        messaging: "Telegram",
        memory:   { has: true, label: t('features.memory'), detail: t('features.memory.detailElite') },
        search:   { has: true, label: t('features.search'), detail: t('features.search.detailElite') },
        recovery: { has: true, label: t('features.recovery'), detail: t('features.recovery.detailElite') },
        browser:  { has: true, label: t('features.browser'), detail: t('features.browser.detailElite') },
        multiAgent: { has: true, label: t('features.multiAgent'), detail: t('features.multiAgent.detailElite') },
      },
    },
  ];

  const openClawFeatures = [
    { icon: Calendar, title: t('openClaw.features.automation.title'), desc: t('openClaw.features.automation.desc') },
    { icon: Search, title: t('openClaw.features.research.title'), desc: t('openClaw.features.research.desc') },
    { icon: Plug, title: t('openClaw.features.integration.title'), desc: t('openClaw.features.integration.desc') },
    { icon: Eye, title: t('openClaw.features.browser.title'), desc: t('openClaw.features.browser.desc') },
  ];

  return (
    <>
      <SEOHead page="pricing" />
      <section className="container py-20 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-3xl md:text-5xl">{t('header.title')}</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('header.subtitle')}
          </p>

          {/* Billing cycle selector */}
          <div className="flex items-center justify-center gap-2 pt-4">
            {billingCycles.map((cycle) => (
              <button
                key={cycle.key}
                onClick={() => setBillingCycle(cycle.key)}
                className={`relative text-sm font-medium px-4 py-2.5 min-h-[44px] rounded-2xl transition-all duration-200 btn-press ${
                  billingCycle === cycle.key
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-2 ring-primary/30"
                    : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cycle.label}
                {cycle.badge && (
                  <Badge className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 bg-emerald-600 text-white border-0">
                    {cycle.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* What is OpenClaw? */}
        <div className="max-w-3xl mx-auto mb-16 space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl">{t('openClaw.heading')}</h2>
            <p className="text-primary font-medium text-lg">{t('openClaw.tagline')}</p>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed text-base max-w-2xl mx-auto">
            <p>{t('openClaw.body1')}</p>
            <p>{t('openClaw.body2')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {openClawFeatures.map((feat) => (
              <div key={feat.title} className="rounded-2xl border border-border bg-card px-5 py-8 flex flex-col items-center text-center space-y-4 shadow-sm card-hover">
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
            const pricing = tier.pricing[billingCycle];
            const monthlyPrice = tier.pricing.monthly.perMonth;
            const annualSavings = (monthlyPrice - pricing.perMonth) * 12;
            const quarterlyAnnualSavings = (monthlyPrice - tier.pricing.quarterly.perMonth) * 12;

            const cycleTotalLabel =
              billingCycle === "quarterly"
                ? t('tiers.cycleTotalQuarterly', { total: pricing.total.toLocaleString() })
                : billingCycle === "annual"
                ? t('tiers.cycleTotalAnnual', { total: pricing.total.toLocaleString() })
                : null;

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl border p-6 md:p-8 flex flex-col card-hover ${mobileOrderClass} md:order-none ${
                  tier.recommended
                    ? "border-primary border-2 bg-card shadow-xl shadow-primary/10 md:scale-105 md:-my-4 ring-1 ring-primary/20"
                    : "border-border bg-muted/70 shadow-sm"
                }`}
              >
                {tier.recommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                    {t('tiers.recommended')}
                  </Badge>
                )}

                <div className="text-center space-y-3 mb-6">
                  <h3 className="text-xl">
                    {tier.name}{" "}
                    <span className="text-muted-foreground text-base font-normal">{tier.subtitle}</span>
                  </h3>
                  <p className={`text-xs uppercase tracking-wider font-medium ${tier.recommended ? "text-primary" : "text-muted-foreground"}`}>
                    {tier.concept}
                  </p>
                  <p className={`text-sm ${tier.recommended ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {tier.tagline}
                  </p>

                  {/* Price display */}
                  <div>
                    <span className={`font-bold text-foreground ${tier.recommended ? "text-4xl md:text-5xl" : "text-3xl"}`}>
                      HK${pricing.perMonth}
                    </span>
                    <span className="text-sm text-muted-foreground">{t('tiers.perMonth')}</span>
                  </div>

                  {/* Cycle total */}
                  {cycleTotalLabel && (
                    <p className="text-sm text-muted-foreground">{cycleTotalLabel}</p>
                  )}

                  {/* Savings badge or nudge */}
                  {billingCycle !== "monthly" && annualSavings > 0 ? (
                    <Badge className="bg-emerald-600 text-white border-0 font-bold px-3 py-1 text-sm animate-in fade-in-0 duration-500">
                      {t('tiers.savingsAnnual', { savings: annualSavings.toLocaleString() })}
                    </Badge>
                  ) : billingCycle === "monthly" && quarterlyAnnualSavings > 0 ? (
                    <button
                      onClick={() => setBillingCycle("quarterly")}
                      className="text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1.5 hover:bg-primary/10 transition-all duration-200 cursor-pointer"
                    >
                      {t('tiers.savingsNudge', { savings: quarterlyAnnualSavings.toLocaleString() })}
                    </button>
                  ) : null}
                </div>

                {/* Spec Grid */}
                <div className="grid grid-cols-3 gap-2 text-center py-4 border-y border-border/50 mb-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Server className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{t('specs.vps')}</span>
                    <span className="text-sm font-semibold">{tier.specs.vps}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tier.specs.memory ? "bg-primary/10" : "bg-muted"}`}>
                      <Brain className={`h-4 w-4 ${tier.specs.memory ? "text-primary" : "text-muted-foreground/40"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{t('specs.memory')}</span>
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
                    <span className="text-xs text-muted-foreground">{t('specs.search')}</span>
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
                      <Coins className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>
                        <span className="font-medium">{t('tiers.tokens', { tokens: tier.monthlyTokens })}</span>
                        <span className="text-muted-foreground text-xs ml-1">{t('tiers.dailyConversations', { count: tier.dailyConversations })}</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-base">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{tier.features.messaging}</span>
                    </li>
                    {(["memory", "search", "recovery", "browser", "multiAgent"] as const).map((key) => {
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
                            {feat.has && "detail" in feat && feat.detail && (
                              <span className="text-muted-foreground text-sm ml-1">— {feat.detail}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <Button
                  asChild
                  className={`w-full gap-2 rounded-2xl btn-press ${
                    tier.recommended
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      : "bg-transparent border border-primary/20 text-primary hover:bg-primary/[0.05]"
                  }`}
                >
                  <Link to={lp(`/onboarding?tier=${tier.id}&plan=${billingCycle}`)}>
                    {t('tiers.ctaSelect', { name: tier.name })}
                  </Link>
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Payment methods */}
        <p className="text-center text-xs text-muted-foreground mt-2 mb-2">
          {t('payment.methods')}
        </p>

        {/* Post-checkout note */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('payment.postCheckout')}
        </p>

        {/* Bottom CTA */}
        <div className="text-center space-y-6 py-8 rounded-2xl bg-accent/30 border border-border px-6 mt-12">
          <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground" />
          <h2 className="text-2xl md:text-3xl">{t('help.heading')}</h2>
          <p className="text-muted-foreground text-lg">{t('help.subtitle')}</p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg shadow-primary/20 btn-press">
            <Link to={lp("/contact")}>
              <Mail className="h-5 w-5" />
              {t('help.cta')}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default Pricing;
