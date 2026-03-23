import { MessageCircle, Send, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL = "https://wa.me/85200000000";
const TELEGRAM_URL = "https://t.me/clawhk";
const INSTAGRAM_URL = "https://instagram.com/clawhk";

const contacts = [
  {
    emoji: "📱",
    platform: "WhatsApp",
    desc: "最快回覆，適合查詢和預約",
    response: "通常 2 小時內",
    url: WHATSAPP_URL,
    highlight: true,
  },
  {
    emoji: "✈️",
    platform: "Telegram",
    desc: "技術問題和售後支援",
    response: "通常 2 小時內",
    url: TELEGRAM_URL,
    highlight: false,
  },
  {
    emoji: "📷",
    platform: "Instagram",
    desc: "DM 我們或者看示範影片",
    response: "通常 24 小時內",
    url: INSTAGRAM_URL,
    highlight: false,
  },
];

const Contact = () => (
  <section className="container py-20">
    <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
      <h1 className="text-3xl md:text-5xl">聯絡我們</h1>
      <p className="text-muted-foreground text-lg">有問題？想了解更多？隨時找我們聊。</p>
    </div>

    {/* Contact cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto mb-16">
      {contacts.map((c) => (
        <a
          key={c.platform}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-2xl border p-8 space-y-4 text-center transition-all group shadow-sm hover:shadow-md ${
            c.highlight
              ? "border-primary/30 bg-card hover:border-primary/50"
              : "border-border bg-card hover:border-primary/20"
          }`}
        >
          <span className="text-4xl block">{c.emoji}</span>
          <h3 className="text-lg group-hover:text-primary transition-colors">{c.platform}</h3>
          <p className="text-sm text-muted-foreground">{c.desc}</p>
          <p className="text-xs text-muted-foreground/70">{c.response}</p>
        </a>
      ))}
    </div>

    {/* Quick contact note */}
    <div className="max-w-xl mx-auto mb-16 text-center">
      <p className="text-muted-foreground text-lg">
        直接用 WhatsApp 或 Telegram 聯絡我們最快！
      </p>
    </div>

    {/* Bottom CTA */}
    <div className="text-center space-y-4 py-8 rounded-2xl bg-accent/30 border border-border px-6 max-w-2xl mx-auto">
      <p className="text-lg text-muted-foreground">不確定自己是否需要？沒關係，先聊聊，免費諮詢，零壓力。</p>
      <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg">
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-5 w-5" />
          WhatsApp 聯絡我們
        </a>
      </Button>
    </div>
  </section>
);

export default Contact;
