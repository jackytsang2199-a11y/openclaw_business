import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, Brain, Search, Shield, Lock, ChevronDown, Briefcase, BookOpen, Pen, UtensilsCrossed, FileText, Cpu } from "lucide-react";
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

const features = [
  {
    icon: Brain,
    emoji: "🧠",
    title: "它會記住你",
    desc: "你的偏好、工作內容、之前聊過的事 — 它全部記住，越用越聰明。",
    hint: "「上次你說想學 Python，學得怎樣了？」",
  },
  {
    icon: Search,
    emoji: "🔍",
    title: "懂得上網找資料",
    desc: "即時搜尋最新資訊。天氣、新聞、餐廳推薦、Reddit 討論 — 即問即答。",
    hint: "即時結果 · 剛剛更新",
  },
  {
    icon: Shield,
    emoji: "🛡️",
    title: "永遠不會停機",
    desc: "斷線時自動重新連接。真正的 24/7，不需要你處理。",
    hint: "Uptime 99.9%",
  },
  {
    icon: Lock,
    emoji: "🔒",
    title: "你的資料只屬於你",
    desc: "運行在你自己的機器上，對話不會被任何公司看到。",
    hint: "你 → 你自己的機器",
  },
];

const steps = [
  { emoji: "💬", title: "選擇方案", desc: "查看哪個計劃適合你，透過 WhatsApp / Telegram 聯絡我們" },
  { emoji: "🔧", title: "我們遠程安裝", desc: "你提供存取權限，我們遠程幫你安裝好。最快 30 分鐘。" },
  { emoji: "🚀", title: "開始使用", desc: "在 Telegram 直接與你的 AI 對話，就這麼簡單" },
];

const useCases = [
  { icon: Briefcase, title: "每日整理工作", prompt: "「幫我歸納今天 10 封 email 的重點」", tag: "效率" },
  { icon: BookOpen, title: "溫習考試好幫手", prompt: "「我明天考 Marketing，幫我整理 Chapter 5-8 的重點」", tag: "學習" },
  { icon: Pen, title: "幫你寫文案、出 post", prompt: "「幫我寫一段 IG caption，賣手工蠟燭」", tag: "創業" },
  { icon: UtensilsCrossed, title: "私人助理隨時待命", prompt: "「今晚想吃日本菜，尖沙咀附近有甚麼推薦？」", tag: "生活" },
  { icon: FileText, title: "寫東西不再頭痛", prompt: "「幫我改這段英文 email，要禮貌但 firm」", tag: "寫作" },
  { icon: Cpu, title: "你的第二個腦", prompt: "「我上個月跟你說過想轉行做 UX，你記得嗎？」", tag: "記憶" },
];

const beforeAfter = [
  { label: "時間", diy: "3-8 小時（不計 debug）", us: "30 分鐘遠程裝好" },
  { label: "技術要求", diy: "Docker、VPN、API key、Linux…", us: "零。懂用 WhatsApp 就行" },
  { label: "長期記憶", diy: "❌ 自行設定 Qdrant + Mem0", us: "✅ 裝好即用" },
  { label: "即時搜尋", diy: "❌ 自行架設 SearXNG", us: "✅ 裝好即用" },
  { label: "斷線修復", diy: "❌ 手動 debug", us: "✅ Watchdog 自動 24/7" },
  { label: "售後支援", diy: "❌ 自行上網找答案", us: "✅ 中文真人 + AI 支援" },
];

const trustItems = [
  { emoji: "🔒", text: "資料儲存在你自己的機器" },
  { emoji: "💬", text: "香港本地支援" },
  { emoji: "🔓", text: "不綁約，隨時取消" },
  { emoji: "💰", text: "收費公開，沒有隱藏費用" },
];

const Index = () => {
  const scrollToHow = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,_hsl(12_60%_58%_/_0.12),_transparent_70%)]" />
        <div className="container relative py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
              <motion.div variants={fadeUp} className="space-y-2">
                <p className="text-sm text-primary font-medium tracking-wide">遠程安裝 · 私人專屬 · 香港本地支援</p>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
                擁有你自己的
                <span className="text-primary"> AI 助手</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg">
                記住你、幫助你、24/7 隨時待命。
                <br />不需要懂程式，我們幫你處理好。
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8">
                  <Link to="/pricing">了解方案與收費 →</Link>
                </Button>
                <Button variant="ghost" size="lg" className="text-muted-foreground text-base gap-2" onClick={scrollToHow}>
                  或者看看如何運作 <ChevronDown className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Right — Telegram mockup */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <div className="mx-auto max-w-sm rounded-3xl border border-border/50 bg-card p-1 shadow-2xl shadow-primary/5">
                {/* Phone frame header */}
                <div className="rounded-t-2xl bg-secondary/60 px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">🦀</div>
                  <div>
                    <p className="text-sm font-semibold">蟹助手</p>
                    <p className="text-[10px] text-muted-foreground">在線</p>
                  </div>
                </div>
                {/* Chat */}
                <div className="p-4 space-y-4 min-h-[280px]">
                  {/* User msg */}
                  <div className="flex justify-end">
                    <div className="bg-primary/15 text-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
                      今晚想吃日本菜，尖沙咀有甚麼推薦？
                    </div>
                  </div>
                  {/* AI msg */}
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[90%] text-sm leading-relaxed space-y-2">
                      <p>根據最新搜尋結果，尖沙咀這幾間評價最高：</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                        <li>鮨銀座 Onodera — 高級 omakase，K11 MUSEA</li>
                        <li>一蘭拉麵 — 24 小時營業，重慶大廈旁邊</li>
                        <li>牛角 — 放題，平均 HK$200/人</li>
                      </ol>
                      <p className="text-primary text-xs pt-1">上次你說喜歡吃 omakase，需要我幫你查銀座今晚有沒有位？</p>
                    </div>
                  </div>
                </div>
                {/* Input bar */}
                <div className="rounded-b-2xl bg-secondary/40 px-4 py-3 flex items-center gap-2">
                  <div className="flex-1 h-8 rounded-full bg-background/50 border border-border/50 px-3 flex items-center text-xs text-muted-foreground">輸入訊息…</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Before/After ── */}
      <section className="border-t border-border/50">
        <div className="container py-20 md:py-28">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-12">
            <motion.div variants={fadeUp} className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">自己安裝 vs 找我們</h2>
            </motion.div>
            <motion.div variants={fadeUp} className="max-w-3xl mx-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium" />
                    <th className="py-3 px-4 text-center text-muted-foreground font-medium">自己安裝 OpenClaw</th>
                    <th className="py-3 px-4 text-center font-semibold text-primary">找蟹助手</th>
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
            </motion.div>
            <motion.p variants={fadeUp} className="text-center text-muted-foreground">
              你只需要使用，技術的事全部由我們處理。
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Section 3: Features ── */}
      <section className="border-t border-border/50 bg-secondary/20">
        <div className="container py-20 md:py-28">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16">
            <motion.div variants={fadeUp} className="text-center space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">你的 AI 助手有甚麼不同？</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  variants={fadeUp}
                  className="rounded-xl border border-border/50 bg-card p-6 space-y-4 hover:border-primary/30 transition-colors"
                >
                  <span className="text-2xl">{f.emoji}</span>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  <div className="text-xs text-primary/80 bg-primary/5 rounded-lg px-3 py-2 italic">
                    {f.hint}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 4: How It Works ── */}
      <section id="how-it-works" className="border-t border-border/50">
        <div className="container py-20 md:py-28">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16">
            <motion.div variants={fadeUp} className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold">三步完成</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((s, i) => (
                <motion.div key={s.title} variants={fadeUp} className="text-center space-y-4">
                  <div className="text-4xl">{s.emoji}</div>
                  <div className="text-sm text-muted-foreground font-mono">Step {i + 1}</div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 5: Use Cases ── */}
      <section className="border-t border-border/50 bg-secondary/20">
        <div className="container py-20 md:py-28">
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="space-y-16">
            <motion.div variants={fadeUp} className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold">它可以幫你做甚麼？</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {useCases.map((uc) => (
                <motion.div
                  key={uc.title}
                  variants={fadeUp}
                  className="rounded-xl border border-border/50 bg-card p-6 space-y-3 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <uc.icon className="h-5 w-5 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{uc.tag}</span>
                  </div>
                  <h3 className="font-semibold">{uc.title}</h3>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">{uc.prompt}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 6: Social Proof ── */}
      <section className="border-t border-border/50">
        <div className="container py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center space-y-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold">我們的故事</h2>
            <blockquote className="text-muted-foreground text-lg leading-relaxed border-l-4 border-primary/40 pl-6 text-left italic">
              「我們是一群香港 IT 人，自己使用 OpenClaw 幾個月，覺得非常好用但太難安裝。所以我們推出了這個服務 — 幫你省下那幾個小時的痛苦。」
            </blockquote>
            <div className="rounded-xl border border-border/50 bg-card p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Early Access 用戶評價</p>
              <p className="text-muted-foreground/60 text-sm italic">即將推出 — 正在收集首批用戶意見</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 7: Trust Bar ── */}
      <section className="border-t border-border/50 bg-secondary/20">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {trustItems.map((item) => (
              <div key={item.text} className="space-y-2">
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-sm text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 8: Final CTA ── */}
      <section className="border-t border-border/50 bg-primary/5">
        <div className="container py-20 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">準備好擁有你自己的 AI 助手了嗎？</h2>
          <p className="text-muted-foreground text-lg">最快今天安裝，今晚就能使用。</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8">
              <Link to="/pricing">查看收費方案 →</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 gap-2">
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
