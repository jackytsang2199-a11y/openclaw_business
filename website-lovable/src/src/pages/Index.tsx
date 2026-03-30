import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { Mail, ChevronDown, Briefcase, BookOpen, Pen, UtensilsCrossed, FileText, Cpu, ArrowRight, Brain, Globe, Shield, Monitor, Pause, Play, Check, Send, Zap, Lock, Users, Banknote, Calendar, Search, Plug, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import NexGenLogo from "@/components/NexGenLogo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SUPPORT_EMAIL } from "@/lib/constants";

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
      className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm card-hover"
    >
      <p className="text-2xl md:text-3xl font-bold text-primary">{display}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </motion.div>
  );
}

// ── Data ──
const demoCases = [
  {
    title: "主動提醒 + 搶票",
    messages: [
      { role: "ai" as const, text: "你之前提過想看陳奕迅演唱會 — 明天早上 10 點開賣。需要我自動排隊搶票嗎？$680 山頂位，跟你上次說的預算一樣。" },
      { role: "user" as const, text: "好，幫我搶兩張" },
      { role: "ai" as const, text: "收到。明天 9:55 自動進入排隊系統，搶到後即時通知你。" },
    ],
  },
  {
    title: "主動整理 + 旅行",
    messages: [
      { role: "ai" as const, text: "你下個月的神樂滑雪場行程 — 今天有 3 成地區未開放。我已整理了最新雪道地圖給你參考。" },
      { role: "ai" as const, text: "目前開放的中級雪道有 5 條，推薦大會場和 Sunshine Course。需要我幫你查最新積雪狀況嗎？" },
      { role: "user" as const, text: "好，順便查一下住宿" },
    ],
  },
  {
    title: "主動追蹤 + 報告",
    messages: [
      { role: "ai" as const, text: "你追蹤的 3 間競爭對手中，A 公司剛發佈了 Q4 財報。我已用你慣用的「摘要 → 數據 → 分析」格式整理好，要看嗎？" },
      { role: "user" as const, text: "好，傳過來" },
      { role: "ai" as const, text: "已整理完成。重點：營收按年增長 12%，但毛利率下跌 3%。完整報告已發送。" },
    ],
  },
];

const pluginCards = [
  { benefit: "永久記憶", tech: "Mem0 + Qdrant", icon: Brain },
  { benefit: "全網搜尋", tech: "SearXNG", icon: Globe },
  { benefit: "自動修復", tech: "Watchdog", icon: Shield },
  { benefit: "代你上網", tech: "Chromium", icon: Monitor },
];

const stats = [
  { value: "200,000+", label: "GitHub ⭐" },
  { value: "35,000+", label: "Forks" },
  { value: "2,000,000+", label: "Weekly Users" },
  { value: "Top 50", label: "GitHub Global" },
];

const techStackCards = [
  { name: "Mem0 OSS", desc: "基於 OpenAI text-embedding-3-small 自動記憶所有對話與偏好" },
  { name: "Qdrant", desc: "高維向量語義索引，毫秒級記憶檢索" },
  { name: "SearXNG", desc: "突破 AI 搜尋封鎖，聚合 70+ 搜尋源" },
  { name: "Chromium Headless", desc: "AI 直接操作瀏覽器 — 填表、格價、訂位、搶票" },
  { name: "ACPX Runtime", desc: "Agent Communication Protocol 即時通訊層" },
  { name: "ClawTeam", desc: "venv 隔離 + tmux 3.5a 多進程，智能體分工並行" },
  { name: "Gateway Watchdog", desc: "24/7 連線監控，斷線自動重連，多節點故障轉移" },
];

const tagColors: Record<string, string> = {
  "效率": "bg-accent-teal-light text-accent-teal",
  "學習": "bg-emerald-100 text-emerald-700",
  "創業": "bg-accent-amber-light text-accent-amber",
  "生活": "bg-rose-100 text-rose-700",
  "寫作": "bg-purple-100 text-purple-700",
  "記憶": "bg-accent-teal-light text-accent-teal",
};

const useCases = [
  { icon: Briefcase, title: "工作更有效率", prompt: "「幫我歸納今天 10 封 email 的重點」", tag: "效率", accent: "border-l-accent-teal" },
  { icon: BookOpen, title: "考試更有把握", prompt: "「我明天考 Marketing，幫我整理 Chapter 5-8 的重點」", tag: "學習", accent: "border-l-emerald-500" },
  { icon: Pen, title: "文案一秒完成", prompt: "「幫我寫一段 IG caption，賣手工蠟燭」", tag: "創業", accent: "border-l-accent-amber" },
  { icon: UtensilsCrossed, title: "生活瑣事交給 AI", prompt: "「今晚想吃日本菜，尖沙咀附近有甚麼推薦？」", tag: "生活", accent: "border-l-rose-400" },
  { icon: FileText, title: "寫作不再費力", prompt: "「幫我改這段英文 email，要禮貌但 firm」", tag: "寫作", accent: "border-l-purple-400" },
  { icon: Cpu, title: "所有對話永遠記得", prompt: "「我上個月跟你說過想轉行做 UX，你記得嗎？」", tag: "記憶", accent: "border-l-accent-teal" },
];

const beforeAfter = [
  { label: "時間", diy: "3-8 小時（不計 debug）", us: "30 分鐘遠程裝好" },
  { label: "技術要求", diy: "Docker、VPN、API key、Linux…", us: "零。懂用 Telegram 就行" },
  { label: "長期記憶", diy: "❌ 自行設定 Qdrant + Mem0", us: "✅ 裝好即用" },
  { label: "即時搜尋", diy: "❌ 自行架設 SearXNG", us: "✅ 裝好即用" },
  { label: "斷線修復", diy: "❌ 手動 debug", us: "✅ Watchdog 自動 24/7" },
  { label: "售後支援", diy: "❌ 自行上網找答案", us: "✅ 中文真人 + AI 支援" },
];

const steps = [
  { title: "選擇方案", desc: "查看哪個計劃適合你，透過電郵提交支援工單" },
  { title: "我們遠程安裝", desc: "你提供存取權限，我們遠程幫你安裝好。最快 30 分鐘。" },
  { title: "開始使用", desc: "在 Telegram 直接與你的 AI 對話，就這麼簡單" },
];

const trustItems = [
  { icon: Lock, text: "資料在你機器" },
  { icon: Users, text: "真人支援" },
  { icon: Zap, text: "不綁約" },
  { icon: Banknote, text: "無隱藏費用" },
];

const platforms = [
  { name: "Telegram", icon: Send, color: "hover:text-[#26A5E4]" },
];

const Index = () => {
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveDemoIndex((prev) => (prev + 1) % demoCases.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  const activeDemo = demoCases[activeDemoIndex];

  return (
    <>
      {/* ── 1. Hero ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 50%, #020617 100%)" }}>
        <div className="absolute inset-0 hero-pattern" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="container relative py-24 md:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
              <motion.p variants={fadeUp} className="text-sm text-white/60 uppercase tracking-wider font-medium">Self-Hosted OpenClaw</motion.p>
              <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl text-white leading-[1.15]">
                專屬於你的全配版 AI 智能體
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-white/80">
                獨家插件生態，ChatGPT 做不到的它全部做到
              </motion.p>
              {/* 3 Checkmarks */}
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
                {[
                  "無需技術知識",
                  "Telegram 直接使用",
                  "記得你的所有對話",
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
                提供 Telegram ID → 付款 → 最快 30 分鐘內上線
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90 rounded-2xl text-base px-8 py-4 shadow-xl font-bold btn-press">
                  <Link to="/pricing">立即開始</Link>
                </Button>
                <Button variant="ghost" size="lg" className="border border-white/30 text-white/80 hover:bg-white/10 hover:text-white text-base gap-2 rounded-2xl btn-press" onClick={scrollToHow}>
                  了解更多 <ChevronDown className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Right — Telegram mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="block mt-8 lg:mt-0 max-w-xs mx-auto lg:max-w-sm lg:mx-0"
            >
              <div className="mx-auto max-w-sm rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl p-0 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden" aria-live="polite">
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
                    <p className="text-[10px] text-white/60">在線</p>
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
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`rounded-2xl px-4 py-2.5 max-w-[90%] text-sm leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "bg-[#EFFDDE]/90 text-foreground rounded-tr-sm"
                              : "bg-white/95 text-foreground rounded-tl-sm"
                          }`}>
                            {msg.text}
                          </div>
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
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeDemoIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="ml-2 text-white/50 hover:text-white transition-colors"
                    aria-label={isPlaying ? "暫停示範" : "播放示範"}
                  >
                    {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </button>
                </div>
                {/* Input bar */}
                <div className="bg-black/20 px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 h-9 rounded-full bg-white/10 border border-white/10 px-4 flex items-center text-xs text-white/40">輸入訊息…</div>
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
              <h2 className="text-2xl md:text-4xl">基於全球排名第一的開源 AI 智能體平台打造</h2>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Built on the #1 Open-Source AI Agent</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((s) => (
                <AnimatedStat key={s.label} value={s.value} label={s.label} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">— OpenClaw 開源項目數據</p>
          </motion.div>
        </div>
      </section>

      {/* ── 3. Plugin Ecosystem + Tech Stack ── */}
      <section className="bg-section-alt">
        <div className="container py-20">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16 max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="text-center space-y-4 max-w-2xl mx-auto">
              <div className="deco-line" />
              <h2 className="text-xl md:text-2xl">同樣是 OpenClaw AI 助手，我們多了什麼？</h2>
              <p className="text-base text-muted-foreground">對話。記憶。行動。</p>
              <p className="text-muted-foreground">經過數月研究、調試與深度整合，遠超原版 OpenClaw</p>
              <p className="text-base text-muted-foreground">
                你的 AI 系統託管於最近的數據中心，確保低延遲、高速回應。所有節點均提供無限流量、DDoS 防護，以及穩定的 AI 運算表現。服務覆蓋全球。
              </p>
            </motion.div>

            <div className="space-y-8">
              <h3 className="text-xl font-semibold text-center">背後的技術</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {techStackCards.map((card) => (
                  <Link
                    key={card.name}
                    to="/technology"
                    className="rounded-2xl border border-border bg-background p-6 space-y-2 hover:border-primary/30 card-hover group shadow-sm"
                  >
                    <h4 className="font-semibold font-mono text-base tracking-tight">{card.name}</h4>
                    <p className="text-base text-muted-foreground">{card.desc}</p>
                    <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      了解更多 <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">以及更多持續更新的功能 — <Link to="/technology" className="text-primary hover:underline">查看完整技術架構 →</Link></p>
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
              <h2 className="text-2xl md:text-4xl">你的助手，能做什麼？</h2>
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
                    <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium ${tagColors[uc.tag] || "bg-secondary text-muted-foreground"}`}>{uc.tag}</span>
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
          <p className="text-base font-semibold text-foreground">由 HK$148/月起 — 每日不到 HK$5</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 btn-press">
            <Link to="/pricing">立即開始</Link>
          </Button>
        </div>
      </section>

      {/* ── 5. Dark Section — Before/After ── */}
      <section className="bg-dark-section text-dark-section-foreground">
        <div className="container py-20">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-10 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <h2 className="text-2xl md:text-4xl text-white">省時間，不是學技術</h2>
              <p className="text-white/50">你只需要使用，技術的事全部由我們處理。</p>
            </div>
            <div className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 pr-4 text-white/40 font-semibold" />
                    <th className="py-3 px-4 text-center text-white/40 font-semibold">自己安裝 OpenClaw</th>
                    <th className="py-3 px-4 text-center font-bold text-primary">找 NexGen</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeAfter.map((row) => (
                    <tr key={row.label} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-white/60 font-medium whitespace-nowrap">{row.label}</td>
                      <td className="py-3 px-4 text-center text-white/40 text-sm">{row.diy}</td>
                      <td className="py-3 px-4 text-center font-medium text-white">{row.us}</td>
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
              <h2 className="text-2xl md:text-4xl">三步開始使用</h2>
              <p className="text-base text-muted-foreground">安裝。使用。忘記技術。</p>
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

      {/* ── 7. Integration Logo Strip ── */}
      <section className="py-12 bg-section-alt">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground mb-8">支援你常用的平台</p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {platforms.map((platform) => (
              <div key={platform.name} className="flex flex-col items-center gap-2.5 text-muted-foreground/40 hover:text-foreground transition-all duration-300 group cursor-default">
                <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                  <platform.icon className={`h-6 w-6 transition-colors duration-300 ${platform.color}`} />
                </div>
                <span className="text-xs font-medium">{platform.name}</span>
                {"comingSoon" in platform && platform.comingSoon && (
                  <span className="text-[10px] text-muted-foreground/60">即將推出</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Inline FAQ ── */}
      <section className="py-16 bg-background">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10 space-y-3">
            <div className="deco-line" />
            <h2 className="text-2xl md:text-3xl">常見問題</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="faq-1" className="bg-card rounded-xl px-6 border border-border/50 shadow-sm">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                我完全不懂技術，適合使用嗎？
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                完全適合！整個安裝、設定、維護過程由我們的工程團隊處理。你只需要提供 Telegram ID，選擇方案並付款，最快 30 分鐘內即可開始使用。日後有任何問題，透過電郵提交工單即可。
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2" className="bg-card rounded-xl px-6 border border-border/50 shadow-sm">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                月費包含什麼？
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                月費已包含 VPS 伺服器、AI 模型 API 使用費、VPN 服務、系統維護及更新。無隱藏收費，無額外費用。
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3" className="bg-card rounded-xl px-6 border border-border/50 shadow-sm">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                跟 ChatGPT Plus 有什麼分別？
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                ChatGPT Plus 是聊天機器人，我們安裝的是 AI 智能體。智能體可以記住所有對話、搜尋全網資訊、操作瀏覽器幫你做事 — 不只是回答問題，是真正動手幫你完成任務。
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4" className="bg-card rounded-xl px-6 border border-border/50 shadow-sm">
              <AccordionTrigger className="text-base font-medium hover:no-underline">
                如何開始使用？
              </AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">
                提供你的 Telegram ID，選擇方案並付款，我們最快 30 分鐘內完成安裝。完成後你會收到通知，直接在 Telegram 開始使用。
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="text-center mt-6">
            <Link to="/faq" className="text-sm text-primary hover:underline">
              查看所有常見問題 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Story + Trust + Final CTA ── */}
      <section className="bg-section-alt">
        <div className="container py-20">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="max-w-2xl mx-auto space-y-8 text-center">
            <div className="deco-line" />
            <h2 className="text-2xl md:text-4xl">我們為什麼做這件事</h2>
            <blockquote className="text-lg leading-[1.9] text-secondary-foreground text-left border-l-[3px] border-primary/30 pl-6">
              原版 OpenClaw 是個好開始，但遠遠不夠。記憶只有基本功能，搜尋受限，斷線了？自己 debug。這不是真正的 AI 智能體。真正的 AI 智能體，應該擁有完整的長期記憶、替你搜尋全網、幫你操作瀏覽器、永遠在線不中斷。所以我們重新打造了它。但即使是全配版，安裝過程依然極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個過程產品化，讓任何人都能用到這套系統。
            </blockquote>
            <p className="text-base text-muted-foreground">你的伺服器。你的數據。</p>
          </motion.div>
        </div>
      </section>

      <section className="bg-dark-section text-dark-section-foreground">
        <div className="container py-20 text-center space-y-10 max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {trustItems.map((item) => (
                <div key={item.text} className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-white/80">{item.text}</span>
                </div>
              ))}
            </div>

            <p className="text-lg font-semibold text-primary">真人團隊。真正解答。</p>

            <h2 className="text-3xl md:text-4xl text-white">今天安裝，今晚開始使用</h2>
            <p className="text-white/50 text-lg">即時遠程安裝，最快 30 分鐘完成</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-base px-8 py-4 shadow-xl shadow-primary/20 btn-press">
                <Link to="/pricing">由 HK$148/月起 — 立即開始</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="border border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-2xl text-base px-8 py-4 gap-2 btn-press">
                <Link to="/contact">
                  <Mail className="h-5 w-5" />
                  提交支援工單
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
