import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const WHATSAPP_URL = "https://wa.me/85200000000";

const categories = [
  {
    title: "基本問題",
    faqs: [
      {
        q: "這跟 ChatGPT 有甚麼不同？",
        a: "ChatGPT 是共用的雲端服務。我們提供的是安裝在你自己設備上的獨立 AI 智能體，擁有永久記憶、全網搜尋、瀏覽器自動化等功能 — 這些都是 ChatGPT 做不到的。",
      },
      {
        q: "我完全不懂技術，可以用嗎？",
        a: "完全可以。我們負責所有技術設定，你只需要在 Telegram 跟 AI 對話，就像跟朋友聊天一樣簡單。",
      },
      {
        q: "安裝需要多久？",
        a: "最快 30 分鐘。我們遠程連接你的設備完成安裝，你不需要做任何技術操作。",
      },
      {
        q: "支援甚麼設備？",
        a: "支援 Raspberry Pi 5 及任何 Linux VPS。我們也提供硬件代購服務。",
      },
    ],
  },
  {
    title: "收費與付款",
    faqs: [
      {
        q: "有沒有合約？可以隨時取消嗎？",
        a: "沒有合約，按月收費，隨時取消。年費方案有 85 折優惠但同樣可以隨時停止續費。",
      },
      {
        q: "月費包含甚麼？",
        a: "月費是全包價，包括 VPS 伺服器、AI 運算費用、VPN 服務、系統維護和監控。你不需要額外支付任何費用。",
      },
      {
        q: "接受甚麼付款方式？",
        a: "目前接受 Stripe、PayPal 及銀行轉帳。",
      },
    ],
  },
  {
    title: "功能與技術",
    faqs: [
      {
        q: "永久記憶是甚麼意思？",
        a: "基於 Qdrant 向量資料庫 + Mem0 記憶引擎，AI 會記住你說過的每一句話。不像 ChatGPT 只有 100 條記憶上限 — 三個月前提過的偏好，它都記得。",
      },
      {
        q: "全網搜尋跟 ChatGPT 的搜尋有甚麼不同？",
        a: "ChatGPT 的搜尋被大量網站封鎖（如 Reddit）。我們用 SearXNG 自架搜尋引擎，可以搜到 ChatGPT 搜不到的內容。",
      },
      {
        q: "瀏覽器自動化可以做甚麼？",
        a: "AI 可以直接操作瀏覽器幫你填表、格價、訂位、搶票、查評價。這是全能大師方案的專屬功能。",
      },
      {
        q: "我的資料安全嗎？",
        a: "你的所有資料都儲存在你自己的設備上，不會經過我們的伺服器。AI 模型調用使用加密 VPN 通道，確保通訊安全。",
      },
    ],
  },
  {
    title: "售後支援",
    faqs: [
      {
        q: "如果系統出問題怎麼辦？",
        a: "智能管家和全能大師方案包含自動恢復功能（Watchdog），系統會 24/7 監控並自動修復。如需人工支援，可透過 WhatsApp 聯絡我們。",
      },
      {
        q: "可以升級或降級方案嗎？",
        a: "可以。隨時透過 WhatsApp 聯絡我們調整方案，差價按比例計算。",
      },
      {
        q: "如果我想取消服務會怎樣？",
        a: "你可以隨時取消。取消後你仍然擁有已安裝的系統，只是不再享有我們的維護和支援服務。",
      },
    ],
  },
];

const FAQ = () => (
  <section className="container py-20 max-w-3xl mx-auto">
    <div className="text-center space-y-4 mb-12">
      <h1 className="text-3xl md:text-5xl">有問題？</h1>
      <p className="text-lg text-muted-foreground mt-2">我們已經準備好答案</p>
      <p className="text-muted-foreground">
        找不到答案？
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline ml-1">
          WhatsApp 問我們
        </a>
      </p>
    </div>

    <div className="space-y-10">
      {categories.map((cat) => (
        <div key={cat.title}>
          <h2 className="text-2xl md:text-3xl mb-4">{cat.title}</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {cat.faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`${cat.title}-${i}`}
                className="rounded-2xl border border-border bg-card px-6 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
              >
                <AccordionTrigger className="text-left font-medium py-4 hover:no-underline text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4 text-base">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>

    {/* Bottom CTA */}
    <div className="text-center space-y-4 mt-16 py-8 rounded-2xl bg-accent/30 border border-border px-6">
      <p className="text-lg text-muted-foreground">還有其他問題？</p>
      <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg">
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-5 w-5" />
          WhatsApp 聯絡我們
        </a>
      </Button>
    </div>
  </section>
);

export default FAQ;
