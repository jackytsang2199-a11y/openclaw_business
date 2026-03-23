import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, ChevronDown, Briefcase, BookOpen, Pen, UtensilsCrossed, FileText, Cpu, ArrowRight, Brain, Globe, Shield, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL = "https://wa.me/85200000000";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

// ── Data ──
const demoCases = [
  {
    title: "瀏覽器 + 記憶",
    messages: [
      { role: "user" as const, text: "上次我說想去看陳奕迅，幫我買演唱會飛" },
      {
        role: "ai" as const, text: "記得！你之前提過想坐 $680 價位 🎤",
        details: ["正在瀏覽 Ticketmaster...", "✅ 4月12日 紅館 — $680 山頂位 有票", "✅ 4月13日 紅館 — $680 已售罄"],
        followUp: "要我直接幫你下單 4月12日的嗎？",
      },
    ],
  },
  {
    title: "瀏覽器 + 訂位",
    messages: [
      { role: "user" as const, text: "幫我去 OpenRice 訂今晚 8 點旺角日本菜" },
      {
        role: "ai" as const, text: "已在 OpenRice 搜尋... 推薦 3 間有位：",
        details: ["🍣 鮨銀座 — 評分 4.8 — 今晚 8 點有位", "🍜 牛角 — 評分 4.2 — 需等 15 分鐘"],
        followUp: "要我幫你預訂鮨銀座嗎？",
      },
    ],
  },
  {
    title: "搜尋 + 記憶",
    messages: [
      { role: "user" as const, text: "幫我搜尋競爭對手上季財報，整理成我慣用的格式" },
      {
        role: "ai" as const, text: '記得你喜歡用「摘要 → 數據 → 分析」三段格式 📊',
        details: ["正在搜尋最新財報數據...", "✅ 已找到 3 間競爭對手的 Q4 報告"],
        followUp: "整理中，約 2 分鐘後完成。",
      },
    ],
  },
];

const pluginCards = [
  { benefit: "永久記憶", tech: "Mem0 + Qdrant", icon: Brain, color: "text-purple-400" },
  { benefit: "全網搜尋", tech: "SearXNG", icon: Globe, color: "text-blue-400" },
  { benefit: "自動修復", tech: "Watchdog", icon: Shield, color: "text-green-400" },
  { benefit: "代你上網", tech: "Chromium", icon: Monitor, color: "text-amber-400" },
];

const stats = [
  { value: "200,000+", label: "GitHub ⭐" },
  { value: "35,000+", label: "Forks" },
  { value: "2M+", label: "Weekly Users" },
  { value: "Top 50", label: "GitHub Global" },
];

const techStackCards = [
  { name: "OpenClaw", desc: "#1 AI 智能體" },
  { name: "Mem0 + Qdrant", desc: "向量級永久記憶" },
  { name: "SearXNG", desc: "突破 AI 搜尋封鎖" },
  { name: "WireGuard", desc: "軍事級 VPN 隧道" },
  { name: "Chromium", desc: "AI 代你操作瀏覽器" },
  { name: "Docker", desc: "容器化一鍵部署" },
];

const useCases = [
  { icon: Briefcase, title: "每日整理工作", prompt: "「幫我歸納今天 10 封 email 的重點」", tag: "效率" },
  { icon: BookOpen, title: "溫習考試好幫手", prompt: "「我明天考 Marketing，幫我整理 Chapter 5-8 的重點」", tag: "學習" },
  { icon: Pen, title: "幫你寫文案、出 post", prompt: "「幫我寫一段 IG caption，賣手工蠟燭」", tag: "創業" },
  { icon: UtensilsCrossed, title: "私人助理隨時待命", prompt: "「今晚想吃日本菜，尖沙咀附近有甚麼推薦？」", tag: "生活" },
  { icon: FileText, title: "寫東西不再頭痛", prompt: "「幫我改這段英文 email，要禮貌但 firm」", tag: "寫作" },
  { icon: Cpu, title: "你的第二個腦", prompt: "「我上個月跟你說過想轉行做 UX，你記得嗎？」", tag: "記憶" },
];

const qualifiers = [
  { fit: true, text: "想要 AI 助手但不懂技術 — 適合" },
  { fit: true, text: "重視私隱，不想資料交給 OpenAI — 適合" },
  { fit: true, text: "想要 AI 幫你做事，不只是聊天 — 適合" },
  { fit: false, text: "本身已懂 Docker / Linux 自己安裝 — 可能不需要我們" },
];

const beforeAfter = [
  { label: "時間", diy: "3-8 小時（不計 debug）", us: "30 分鐘遠程裝好" },
  { label: "技術要求", diy: "Docker、VPN、API key、Linux…", us: "零。懂用 WhatsApp 就行" },
  { label: "長期記憶", diy: "❌ 自行設定 Qdrant + Mem0", us: "✅ 裝好即用" },
  { label: "即時搜尋", diy: "❌ 自行架設 SearXNG", us: "✅ 裝好即用" },
  { label: "斷線修復", diy: "❌ 手動 debug", us: "✅ Watchdog 自動 24/7" },
  { label: "售後支援", diy: "❌ 自行上網找答案", us: "✅ 中文真人 + AI 支援" },
];

const steps = [
  { emoji: "💬", title: "選擇方案", desc: "查看哪個計劃適合你，透過 WhatsApp / Telegram 聯絡我們" },
  { emoji: "🔧", title: "我們遠程安裝", desc: "你提供存取權限，我們遠程幫你安裝好。最快 30 分鐘。" },
  { emoji: "🚀", title: "開始使用", desc: "在 Telegram 直接與你的 AI 對話，就這麼簡單" },
];

const trustItems = [
  { emoji: "🔒", text: "資料在你機器" },
  { emoji: "💬", text: "香港支援" },
  { emoji: "🔓", text: "不綁約" },
  { emoji: "💰", text: "無隱藏費用" },
];

const Index = () => {
  const [activeDemoIndex, setActiveDemoIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveDemoIndex((prev) => (prev + 1) % demoCases.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  const activeDemo = demoCases[activeDemoIndex];

  return (
    <>
      {/* ── Section 1: Hero (warm gradient) ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #E8D5C4 0%, #F5C6AA 30%, #E6A889 60%, #D4826A 100%)" }}>
        <div className="container relative py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
              <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl text-white">
                最強 AI 智能體
              </motion.h1>
              <motion.p variants={fadeUp} className="text-xl md:text-2xl text-white/80 font-normal">
                ChatGPT 做不到的，它全部做到。
              </motion.p>
              <motion.p variants={fadeUp} className="text-sm text-white/60">
                提供 Telegram ID → 付款 → 最快 30 分鐘內上線
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-base px-7 py-3.5 shadow-lg">
                  <Link to="/pricing">立即開始 →</Link>
                </Button>
                <Button variant="ghost" size="lg" className="text-white/80 hover:text-white hover:bg-white/[0.12] text-base gap-2 rounded-2xl" onClick={scrollToHow}>
                  了解更多 <ChevronDown className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Right — Auto-rotating Telegram mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <div className="mx-auto max-w-sm rounded-3xl border border-white/15 bg-white/[0.1] backdrop-blur-md p-1 shadow-2xl">
                <div className="rounded-t-2xl bg-white/10 px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🦀</div>
                  <div>
                    <p className="text-sm font-semibold text-white">蟹助手</p>
                    <p className="text-[10px] text-white/50">在線</p>
                  </div>
                </div>
                <div className="p-4 min-h-[280px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeDemoIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-4"
                    >
                      <div className="flex justify-end">
                        <div className="bg-white/15 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
                          {activeDemo.messages[0].text}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-white/10 text-white rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[90%] text-sm leading-relaxed space-y-2">
                          <p>{activeDemo.messages[1].text}</p>
                          {"details" in activeDemo.messages[1] && (
                            <ul className="space-y-1 text-xs text-white/60">
                              {(activeDemo.messages[1] as any).details.map((d: string, i: number) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          )}
                          {"followUp" in activeDemo.messages[1] && (
                            <p className="text-white/80 text-xs pt-1">{(activeDemo.messages[1] as any).followUp}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
                {/* Dots */}
                <div className="flex items-center justify-center gap-2 pb-3">
                  {demoCases.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveDemoIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeDemoIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
                <div className="rounded-b-2xl bg-white/[0.06] px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 h-8 rounded-full bg-white/10 border border-white/10 px-3 flex items-center text-xs text-white/40">輸入訊息…</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Section 1A: Tech Plugin Cards — with distinct icons */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16"
          >
            {pluginCards.map((card) => (
              <motion.div
                key={card.tech}
                variants={fadeUp}
                className="rounded-2xl border border-white/15 bg-white/[0.1] backdrop-blur-md p-5 text-center space-y-2 hover:border-white/30 transition-colors"
              >
                <card.icon className={`h-6 w-6 mx-auto ${card.color}`} />
                <p className="text-lg font-semibold text-white">{card.benefit}</p>
                <p className="text-xs text-white/50">{card.tech}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Section 2: FOMO Banner (dark) ── */}
      <section className="bg-[#1A1215]">
        <div className="container py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-xl md:text-2xl font-bold leading-relaxed text-white">
              2026 年，AI 智能體正在取代傳統聊天機器人及大量傳統文書工作。
            </p>
            <p className="text-lg md:text-xl text-white/60">
              全球已有超過 200 萬人每週使用開源 AI 智能體。
            </p>
            <p className="text-lg md:text-xl text-primary font-bold">
              你還在用受限的 ChatGPT 嗎？
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 3: Repositioning Bridge ── */}
      <section className="bg-background">
        <div className="container py-20">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <p className="text-xl md:text-2xl font-bold text-foreground">
              這不是普通聊天機器人 — 是真正幫你做事的 AI 智能體。
            </p>
            <p className="text-muted-foreground text-lg">
              搜尋資料、整理日程、處理文件 — 從回答問題到動手執行，全部在 Telegram 完成。
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 4: Credibility + Tech Stack (alt bg) ── */}
      <section style={{ backgroundColor: "hsl(25 30% 93%)" }}>
        <div className="container py-20">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16 max-w-5xl mx-auto">
            {/* Layer A: Platform + Stats */}
            <motion.div variants={fadeUp} className="text-center space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl md:text-4xl">基於全球排名第一的開源 AI 智能體平台打造</h2>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Built on the #1 Open-Source AI Agent</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-2xl border border-border bg-background p-6 text-center shadow-sm">
                    <p className="text-2xl md:text-3xl font-bold text-primary">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Layer B: Plugin Ecosystem */}
            <motion.div variants={fadeUp} className="text-center space-y-4 max-w-2xl mx-auto">
              <h3 className="text-xl md:text-2xl">我們不只是安裝 — 我們打造了一整套獨家插件生態系統</h3>
              <p className="text-muted-foreground">經過數月研究、調試與深度整合，遠超原版 OpenClaw</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Exclusive Plugin Ecosystem · Extensively Tested
              </p>
              <p className="text-sm text-muted-foreground">
                由資深工程團隊打造 · 服務覆蓋全球<br />
                10+ 年系統架構經驗 · 企業級部署標準
              </p>
            </motion.div>

            {/* Layer C: 6 Tech Stack Cards */}
            <div className="space-y-8">
              <h3 className="text-2xl text-center">採用頂級開源技術深度整合</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {techStackCards.map((card) => (
                  <Link
                    key={card.name}
                    to="/technology"
                    className="rounded-2xl border border-border bg-background p-6 space-y-2 hover:border-primary/30 hover:shadow-md transition-all group shadow-sm"
                  >
                    <h4 className="font-semibold">{card.name}</h4>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                    <span className="text-xs text-primary font-medium flex items-center gap-1">
                      了解更多 <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 5: Use Cases ── */}
      <section className="bg-background">
        <div className="container py-20">
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl">它可以幫你做甚麼？</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {useCases.map((uc) => (
                <div
                  key={uc.title}
                  className="rounded-2xl border border-border bg-card p-6 space-y-3 hover:border-primary/30 hover:shadow-md transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <uc.icon className="h-5 w-5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{uc.tag}</span>
                  </div>
                  <h3 className="text-base">{uc.title}</h3>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{uc.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Qualifier (alt bg) ── */}
      <section style={{ backgroundColor: "hsl(25 30% 93%)" }}>
        <div className="container py-20">
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border border-border bg-background p-10 space-y-6 shadow-sm">
              <h2 className="text-2xl text-center">適合你嗎？</h2>
              <ul className="space-y-3">
                {qualifiers.map((q) => (
                  <li key={q.text} className={`flex items-start gap-3 text-sm ${q.fit ? "text-[#5A8A5A]" : "text-muted-foreground"}`}>
                    <span className="shrink-0 mt-0.5">{q.fit ? "✓" : "—"}</span>
                    <span>{q.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Before/After ── */}
      <section className="bg-background">
        <div className="container py-20">
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl">自己安裝 vs 找我們</h2>
            </div>
            <div className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-semibold" />
                    <th className="py-3 px-4 text-center text-muted-foreground font-semibold">自己安裝 OpenClaw</th>
                    <th className="py-3 px-4 text-center font-bold text-primary">找蟹助手</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeAfter.map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="py-3 pr-4 text-muted-foreground font-medium whitespace-nowrap">{row.label}</td>
                      <td className="py-3 px-4 text-center text-muted-foreground text-xs">{row.diy}</td>
                      <td className="py-3 px-4 text-center text-sm font-medium">{row.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-center text-muted-foreground">
              你只需要使用，技術的事全部由我們處理。
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 8: How It Works (dark band) ── */}
      <section id="how-it-works" className="bg-[#1A1215]">
        <div className="container py-20">
          <div className="space-y-16 max-w-5xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl text-white">三步完成</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((s, i) => (
                <div key={s.title} className="text-center space-y-4">
                  <div className="text-4xl">{s.emoji}</div>
                  <div className="text-sm text-white/40">Step {i + 1}</div>
                  <h3 className="text-xl text-white">{s.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 9: Our Story ── */}
      <section className="bg-background">
        <div className="container py-20">
          <div className="max-w-[600px] mx-auto space-y-8">
            <h2 className="text-3xl md:text-4xl text-center">我們的故事</h2>
            <div className="text-left space-y-4">
              <p className="text-lg leading-[1.8] text-secondary-foreground">
                我們是三個在香港做 IT 超過十年的工程師。半年前自己裝了 OpenClaw，用過之後再也回不去 ChatGPT。但安裝過程極其複雜 — Linux 指令、伺服器設定、VPN 配置、記憶系統串接 — 非技術人員根本無法完成。所以我們把整個安裝過程產品化，讓任何人都能用到這套系統。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 10: Final CTA (alt bg) ── */}
      <section style={{ backgroundColor: "hsl(25 30% 93%)" }}>
        <div className="container py-20 text-center space-y-8 max-w-5xl mx-auto">
          {/* Trust bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{item.emoji}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <h2 className="text-3xl md:text-4xl">準備好擁有你自己的 AI 助手了嗎？</h2>
          <p className="text-muted-foreground text-lg">最快今天安裝，今晚就能使用。</p>
          <p className="text-sm text-muted-foreground">
            由 <span className="text-primary font-bold">HK$148/月</span> 起 — 每日不到 HK$5
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-base px-7 py-3.5 shadow-lg">
              <Link to="/pricing">查看收費方案 →</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-primary/20 text-primary hover:bg-primary/[0.05] rounded-2xl text-base px-7 py-3.5 gap-2">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                WhatsApp 聯絡我們
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Index;
