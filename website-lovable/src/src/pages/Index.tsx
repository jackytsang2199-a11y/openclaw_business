import { Helmet } from "react-helmet-async";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, ChevronDown, Briefcase, BookOpen, Pen, UtensilsCrossed, FileText, Cpu, ArrowRight, Brain, Globe, Shield, Monitor, Pause, Play, Check, Zap, Lock, Users, Banknote, Calendar, Search, Plug, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import NexGenLogo from "@/components/NexGenLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { useTranslation } from "react-i18next";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerScale = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

function useCounter(target: string, inView: boolean) {
  const [display, setDisplay] = useState("0");
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    const numericPart = target.replace(/[^0-9]/g, "");
    const num = parseInt(numericPart, 10);
    if (isNaN(num)) { setDisplay(target); return; }

    const suffix = target.replace(/[0-9,]/g, "");
    const prefix = target.match(/^[^0-9]*/)?.[0] || "";
    const duration = 1200;
    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(num * eased);
      setDisplay(`${prefix}${current.toLocaleString()}${suffix}`);
      if (step >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, target]);

  return display;
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const display = useCounter(value, inView);

  return (
    <motion.div
      ref={ref}
      variants={scaleIn}
      className="rounded-2xl border border-border bg-gradient-to-b from-card to-muted/30 p-6 text-center shadow-md card-hover hover:ring-1 hover:ring-primary/10"
    >
      <p className="text-2xl md:text-3xl font-bold text-primary">{display}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}

// ── Data ──
// Rich card components for each demo
const TicketCard = ({ t }: { t: (key: string) => string }) => (
  <div className="rounded-xl overflow-hidden bg-white/95 shadow-sm max-w-[90%]">
    <div className="bg-emerald-500 px-3 py-1.5 flex items-center gap-1.5">
      <Check className="h-3.5 w-3.5 text-white" />
      <span className="text-[11px] font-semibold text-white tracking-wide">{t('demo.ticketCard.badge')}</span>
    </div>
    <div className="p-3 space-y-2">
      <p className="text-[13px] font-bold text-foreground leading-tight">{t('demo.ticketCard.title')}</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>2026/05/15</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="text-sm">💺</span>
          <span>{t('demo.ticketCard.seat')}</span>
        </div>
      </div>
      <div className="pt-1 border-t border-border">
        <span className="text-base font-bold text-emerald-600">$1,360</span>
        <span className="text-[10px] text-muted-foreground ml-1">{t('demo.ticketCard.quantity')}</span>
      </div>
    </div>
  </div>
);

const SkiCard = ({ t }: { t: (key: string) => string }) => (
  <div className="rounded-xl overflow-hidden bg-white/95 shadow-sm max-w-[90%]">
    <div className="bg-sky-500 px-3 py-1.5 flex items-center gap-1.5">
      <span className="text-sm">🏔️</span>
      <span className="text-[11px] font-semibold text-white tracking-wide">{t('demo.skiCard.badge')}</span>
    </div>
    <div className="p-3 space-y-2">
      <p className="text-[13px] font-bold text-foreground leading-tight">{t('demo.skiCard.title')}</p>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="bg-sky-50 rounded-lg px-2 py-1.5 text-center">
          <p className="text-sky-600 font-bold text-sm">5</p>
          <p className="text-muted-foreground">{t('demo.skiCard.intermediateRuns')}</p>
        </div>
        <div className="bg-sky-50 rounded-lg px-2 py-1.5 text-center">
          <p className="text-sky-600 font-bold text-sm">180cm</p>
          <p className="text-muted-foreground">{t('demo.skiCard.snowDepth')}</p>
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{t('demo.skiCard.recommend')}</span>大會場、Sunshine Course
      </div>
    </div>
  </div>
);

const FinanceCard = ({ t }: { t: (key: string) => string }) => (
  <div className="rounded-xl overflow-hidden bg-white/95 shadow-sm max-w-[90%]">
    <div className="bg-violet-500 px-3 py-1.5 flex items-center gap-1.5">
      <span className="text-sm">📊</span>
      <span className="text-[11px] font-semibold text-white tracking-wide">{t('demo.financeCard.badge')}</span>
    </div>
    <div className="p-3 space-y-2">
      <p className="text-[13px] font-bold text-foreground leading-tight">{t('demo.financeCard.company')}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-muted-foreground">{t('demo.financeCard.revenue')}</span>
          <span className="font-semibold text-foreground">$2.8B <span className="text-emerald-500 font-medium">+12%</span></span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-muted-foreground">{t('demo.financeCard.margin')}</span>
          <span className="font-semibold text-foreground">42% <span className="text-red-500 font-medium">-3%</span></span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-muted-foreground">{t('demo.financeCard.netIncome')}</span>
          <span className="font-semibold text-foreground">$380M</span>
        </div>
      </div>
    </div>
  </div>
);

const tagColorKeys: Record<string, string> = {
  "自動化": "bg-accent-teal-light text-accent-teal",
  "排程": "bg-emerald-100 text-emerald-700",
  "Agent": "bg-accent-amber-light text-accent-amber",
  "瀏覽器": "bg-rose-100 text-rose-700",
  "記憶": "bg-purple-100 text-purple-700",
  "搜尋": "bg-accent-teal-light text-accent-teal",
};

const Index = () => {
  const { t } = useTranslation('home');
  const lp = useLocalizedPath();
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // ── Data arrays (must be inside component to use t()) ──
  const demoCases = [
    {
      title: t('demo.cases.0.title'),
      messages: [
        { role: "ai" as const, text: t('demo.cases.0.messages.0') },
        { role: "user" as const, text: t('demo.cases.0.messages.1') },
        { role: "ai" as const, text: t('demo.cases.0.messages.2'), card: "ticket" as const },
      ],
    },
    {
      title: t('demo.cases.1.title'),
      messages: [
        { role: "ai" as const, text: t('demo.cases.1.messages.0'), card: "ski" as const },
        { role: "user" as const, text: t('demo.cases.1.messages.1') },
        { role: "ai" as const, text: t('demo.cases.1.messages.2') },
      ],
    },
    {
      title: t('demo.cases.2.title'),
      messages: [
        { role: "ai" as const, text: t('demo.cases.2.messages.0'), card: "finance" as const },
        { role: "user" as const, text: t('demo.cases.2.messages.1') },
        { role: "ai" as const, text: t('demo.cases.2.messages.2') },
      ],
    },
  ];

  const pluginCards = [
    { benefit: t('plugins.memory'), tech: "Mem0 + Qdrant", icon: Brain },
    { benefit: t('plugins.search'), tech: "SearXNG", icon: Globe },
    { benefit: t('plugins.watchdog'), tech: "Watchdog", icon: Shield },
    { benefit: t('plugins.browser'), tech: "Chromium", icon: Monitor },
  ];

  const stats = [
    { value: "200,000+", label: "GitHub ⭐" },
    { value: "35,000+", label: t('stats.forks') },
    { value: "2,000,000+", label: t('stats.weeklyUsers') },
    { value: "50", label: t('stats.globalRank') },
  ];

  const techStackCards = [
    { name: "Mem0 OSS", desc: t('techStack.cards.0.desc') },
    { name: "Qdrant", desc: t('techStack.cards.1.desc') },
    { name: "SearXNG", desc: t('techStack.cards.2.desc') },
    { name: "Chromium Headless", desc: t('techStack.cards.3.desc') },
    { name: "ACPX Runtime", desc: t('techStack.cards.4.desc') },
    { name: "ClawTeam", desc: t('techStack.cards.5.desc') },
    { name: "Gateway Watchdog", desc: t('techStack.cards.6.desc') },
  ];

  const useCases = [
    { icon: Briefcase, title: t('useCases.items.0.title'), prompt: t('useCases.items.0.prompt'), tag: t('useCases.items.0.tag'), accent: "border-l-accent-teal" },
    { icon: BookOpen, title: t('useCases.items.1.title'), prompt: t('useCases.items.1.prompt'), tag: t('useCases.items.1.tag'), accent: "border-l-emerald-500" },
    { icon: Pen, title: t('useCases.items.2.title'), prompt: t('useCases.items.2.prompt'), tag: t('useCases.items.2.tag'), accent: "border-l-accent-amber" },
    { icon: UtensilsCrossed, title: t('useCases.items.3.title'), prompt: t('useCases.items.3.prompt'), tag: t('useCases.items.3.tag'), accent: "border-l-rose-400" },
    { icon: FileText, title: t('useCases.items.4.title'), prompt: t('useCases.items.4.prompt'), tag: t('useCases.items.4.tag'), accent: "border-l-purple-400" },
    { icon: Cpu, title: t('useCases.items.5.title'), prompt: t('useCases.items.5.prompt'), tag: t('useCases.items.5.tag'), accent: "border-l-accent-teal" },
  ];

  const beforeAfter = [
    { label: t('comparison.rows.0.label'), diy: t('comparison.rows.0.diy'), us: t('comparison.rows.0.us') },
    { label: t('comparison.rows.1.label'), diy: t('comparison.rows.1.diy'), us: t('comparison.rows.1.us') },
    { label: t('comparison.rows.2.label'), diy: t('comparison.rows.2.diy'), us: t('comparison.rows.2.us') },
    { label: t('comparison.rows.3.label'), diy: t('comparison.rows.3.diy'), us: t('comparison.rows.3.us') },
    { label: t('comparison.rows.4.label'), diy: t('comparison.rows.4.diy'), us: t('comparison.rows.4.us') },
    { label: t('comparison.rows.5.label'), diy: t('comparison.rows.5.diy'), us: t('comparison.rows.5.us') },
  ];

  const steps = [
    { title: t('steps.items.0.title'), desc: t('steps.items.0.desc') },
    { title: t('steps.items.1.title'), desc: t('steps.items.1.desc') },
    { title: t('steps.items.2.title'), desc: t('steps.items.2.desc') },
  ];

  const trustItems = [
    { icon: Lock, text: t('trust.dataOnYourMachine') },
    { icon: Users, text: t('trust.emailSupport') },
    { icon: Zap, text: t('trust.noContract') },
    { icon: Banknote, text: t('trust.noHiddenFees') },
  ];

  const inlineFaqItems = [
    { value: "faq-1", question: t('inlineFaq.items.0.question'), answer: t('inlineFaq.items.0.answer') },
    { value: "faq-2", question: t('inlineFaq.items.1.question'), answer: t('inlineFaq.items.1.answer') },
    { value: "faq-3", question: t('inlineFaq.items.2.question'), answer: t('inlineFaq.items.2.answer') },
    { value: "faq-4", question: t('inlineFaq.items.3.question'), answer: t('inlineFaq.items.3.answer') },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveDemoIndex((prev) => (prev + 1) % demoCases.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlaying, demoCases.length]);

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  const activeDemo = demoCases[activeDemoIndex];

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Helmet>
      {/* ── 1. Hero ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%)" }}>
        <div className="absolute inset-0 hero-pattern" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="container relative py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
              <motion.p variants={fadeUp} className="text-sm text-white/60 uppercase tracking-wider font-medium">{t('hero.kicker')}</motion.p>
              <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl text-white leading-[1.15]">
                {t('hero.title')}
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/80">
                {t('hero.subtitle')}
              </motion.p>
              {/* 3 Checkmarks */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                {[
                  t('hero.checks.0'),
                  t('hero.checks.1'),
                  t('hero.checks.2'),
                ].map((text) => (
                  <span key={text} className="flex items-center gap-2.5 text-base text-white/90">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-400/20">
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    </span>
                    {text}
                  </span>
                ))}
              </motion.div>
              <motion.p variants={fadeUp} className="text-sm text-white/50">
                {t('hero.flow')}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90 rounded-2xl text-base px-8 py-4 shadow-xl font-bold btn-press">
                  <Link to={lp('/pricing')}>{t('hero.cta')}</Link>
                </Button>
                <Button variant="ghost" size="lg" className="border border-white/30 text-white/80 hover:bg-white/10 hover:text-white text-base gap-2 rounded-2xl btn-press" onClick={scrollToHow}>
                  {t('hero.learnMore')} <ChevronDown className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Right — Telegram mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative block mt-8 lg:mt-0 max-w-xs mx-auto lg:max-w-sm lg:mx-0"
            >
              {/* Radial glow behind mockup */}
              <div className="absolute -inset-12 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden" aria-live="polite">
                {/* Status bar */}
                <div className="flex items-center justify-between px-5 py-1.5 text-[10px] text-white/50">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1.5 rounded-sm bg-white/50" />
                      <div className="w-1 h-2 rounded-sm bg-white/50" />
                      <div className="w-1 h-2.5 rounded-sm bg-white/50" />
                      <div className="w-1 h-3 rounded-sm bg-white/30" />
                    </div>
                    <span className="ml-1">WiFi</span>
                    <span>🔋</span>
                  </div>
                </div>
                {/* Telegram header */}
                <div className="bg-[#2AABEE]/90 px-4 py-3 flex items-center gap-3">
                  <NexGenLogo className="h-9 w-9" />
                  <div>
                    <p className="text-sm font-semibold text-white">NexGen</p>
                    <p className="text-[10px] text-white/60">{t('demo.mockup.online')}</p>
                  </div>
                </div>
                {/* Chat body */}
                <div className="p-4 min-h-[260px] bg-gradient-to-b from-black/20 to-black/10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeDemoIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-3"
                    >
                      {activeDemo.messages.map((msg, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`rounded-2xl px-4 py-2.5 max-w-[90%] text-sm leading-relaxed shadow-sm ${
                              msg.role === "user"
                                ? "bg-[#EFFDDE]/90 text-foreground rounded-tr-sm"
                                : "bg-white/95 text-foreground rounded-tl-sm"
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                          {"card" in msg && msg.card === "ticket" && <TicketCard t={t} />}
                          {"card" in msg && msg.card === "ski" && <SkiCard t={t} />}
                          {"card" in msg && msg.card === "finance" && <FinanceCard t={t} />}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
                {/* Dots + controls */}
                <div className="flex items-center justify-center gap-2 py-2.5 bg-black/10">
                  {demoCases.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDemoIndex(i)}
                      className={`h-1.5 rounded-full transition-all min-w-[44px] min-h-[44px] flex items-center justify-center`}
                    >
                      <span className={`block h-1.5 rounded-full transition-all ${
                        i === activeDemoIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                      }`} />
                    </button>
                  ))}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="ml-2 text-white/50 hover:text-white transition-colors"
                    aria-label={isPlaying ? t('demo.mockup.pauseLabel') : t('demo.mockup.playLabel')}
                  >
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                </div>
                {/* Input bar */}
                <div className="bg-black/20 px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 h-9 rounded-full bg-white/10 border border-white/10 px-4 flex items-center text-xs text-white/40">{t('demo.mockup.inputPlaceholder')}</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Tech Plugin Cards — uniform glass */}
          <motion.div
            variants={staggerScale}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-20"
          >
            {pluginCards.map((card) => (
              <motion.div
                key={card.tech}
                variants={scaleIn}
                className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 text-center space-y-2 hover:border-white/25 card-hover"
              >
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto">
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-lg font-semibold text-white">{card.benefit}</p>
                <p className="text-xs text-white/50 font-mono">{card.tech}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 2. Stat Strip ── */}
      <section className="bg-background">
        <div className="container py-16">
          <motion.div variants={staggerScale} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="text-center space-y-10 max-w-4xl mx-auto">
            <div className="space-y-3">
              <h2 className="text-2xl md:text-4xl">{t('stats.heading')}</h2>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">{t('stats.subheading')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((s) => (
                <AnimatedStat key={s.label} value={s.value} label={s.label} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">{t('stats.footnote')}</p>
          </motion.div>
        </div>
      </section>

      {/* ── 3. Plugin Ecosystem + Tech Stack ── */}
      <section className="bg-section-alt">
        <div className="container py-20">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16 max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="deco-line" />
              <h2 className="text-xl md:text-2xl">{t('techStack.heading')}</h2>
              <p className="text-base text-muted-foreground">{t('techStack.tagline')}</p>
              <p className="text-muted-foreground">{t('techStack.description')}</p>
              <p className="text-base text-muted-foreground">
                {t('techStack.hosting')}
              </p>
            </motion.div>

            <div className="space-y-8">
              <h3 className="text-xl font-semibold text-center">{t('techStack.componentsHeading')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {techStackCards.map((card) => (
                  <Link
                    key={card.name}
                    to={lp('/technology')}
                    className="rounded-2xl border border-border bg-background p-6 space-y-2 hover:border-primary/30 card-hover group shadow-sm"
                  >
                    <h4 className="font-semibold font-mono text-base tracking-tight">{card.name}</h4>
                    <p className="text-base text-muted-foreground">{card.desc}</p>
                    <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      {t('techStack.learnMore')} <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">{t('techStack.moreFeatures')} <Link to={lp('/technology')} className="text-primary hover:underline">{t('techStack.fullArchLink')}</Link></p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 4. Use Cases ── */}
      <section className="bg-background">
        <div className="container py-20">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-10 max-w-5xl mx-auto">
            <div className="text-center space-y-3">
              <div className="deco-line" />
              <h2 className="text-2xl md:text-4xl">{t('useCases.heading')}</h2>
            </div>
            <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {useCases.map((uc) => (
                <motion.div
                  key={uc.title}
                  variants={fadeUp}
                  className={`rounded-2xl border border-border/50 border-l-[3px] ${uc.accent} bg-card p-7 space-y-3 card-hover shadow-sm`}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <uc.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium ${tagColorKeys[uc.tag] || "bg-secondary text-muted-foreground"}`}>{uc.tag}</span>
                  </div>
                  <h3 className="text-lg">{uc.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{uc.prompt}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 4.5 Mid-page CTA Strip ── */}
      <section className="py-8 bg-primary/5 border-y border-primary/10">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-base font-semibold text-foreground">{t('cta.midPage')}</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 btn-press">
            <Link to={lp('/pricing')}>{t('cta.midPageButton')}</Link>
          </Button>
        </div>
      </section>

      {/* ── 5. Dark Section — Before/After ── */}
      <section className="bg-dark-section text-dark-section-foreground">
        <div className="container py-20">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-10 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-4xl text-white">{t('comparison.heading')}</h2>
              <p className="text-white/50">{t('comparison.subtitle')}</p>
            </div>
            <div className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 text-white/40 font-semibold" />
                    <th className="py-3 px-4 text-center text-white/40 font-semibold">{t('comparison.diyColumn')}</th>
                    <th className="py-3 px-4 text-center font-bold text-primary bg-primary/15 rounded-t-lg">{t('comparison.usColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeAfter.map((row, idx) => (
                    <tr key={row.label} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-white/60 font-medium whitespace-nowrap">{row.label}</td>
                      <td className="py-3 px-4 text-center text-white/40 text-sm">{row.diy}</td>
                      <td className={`py-3 px-4 text-center font-medium text-white bg-primary/10 ${idx === beforeAfter.length - 1 ? "rounded-b-lg" : ""}`}>{row.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 6. How It Works ── */}
      <section id="how-it-works" className="bg-background">
        <div className="container py-20">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="deco-line" />
              <h2 className="text-2xl md:text-4xl">{t('steps.heading')}</h2>
              <p className="text-base text-muted-foreground">{t('steps.subtitle')}</p>
            </div>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] border-t-2 border-dashed border-primary/20" />
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  variants={scaleIn}
                  className="text-center space-y-4 relative"
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                    {i + 1}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Step {i + 1}</div>
                  <h3 className="text-xl">{s.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 8. Inline FAQ ── */}
      <section className="py-16 bg-background">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10 space-y-3">
            <div className="deco-line" />
            <h2 className="text-2xl md:text-3xl">{t('inlineFaq.heading')}</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {inlineFaqItems.map((item) => (
              <AccordionItem key={item.value} value={item.value} className="bg-card rounded-xl px-6 border border-border/50 shadow-sm">
                <AccordionTrigger className="text-base font-medium hover:no-underline min-h-[44px]">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground prose-zh">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="text-center mt-6">
            <Link to={lp('/faq')} className="text-sm text-primary hover:underline">
              {t('inlineFaq.viewAll')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Story + Trust + Final CTA ── */}
      <section className="bg-section-alt">
        <div className="container py-20">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="max-w-2xl mx-auto space-y-8 text-center">
            <div className="deco-line" />
            <h2 className="text-2xl md:text-4xl">{t('story.heading')}</h2>
            <blockquote
              className="text-lg leading-[1.9] text-secondary-foreground text-left border-l-[3px] border-primary/30 pl-6"
              dangerouslySetInnerHTML={{ __html: t('story.body') }}
            />
            <p className="text-base text-muted-foreground">{t('story.tagline')}</p>
          </motion.div>
        </div>
      </section>

      <section className="bg-dark-section text-dark-section-foreground">
        <div className="container py-20 text-center space-y-10 max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {trustItems.map((item) => (
                <div key={item.text} className="flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center transition-all duration-200">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-white/80">{item.text}</span>
                </div>
              ))}
            </div>

            <h2 className="text-3xl md:text-4xl text-white">{t('finalCta.heading')}</h2>
            <p className="text-white/50 text-lg">{t('finalCta.subtitle')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-base px-8 py-4 shadow-xl shadow-primary/20 btn-press">
                <Link to={lp('/onboarding')}>{t('finalCta.ctaButton')}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="border border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-2xl text-base px-8 py-4 gap-2 btn-press">
                <Link to={lp('/contact')}>
                  <Mail className="h-5 w-5" />
                  {t('finalCta.contactButton')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Index;
