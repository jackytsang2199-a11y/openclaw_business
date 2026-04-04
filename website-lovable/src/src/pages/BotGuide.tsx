import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "開啟 BotFather",
    content: (
      <>
        <p>
          在 Telegram 搜尋{" "}
          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">
            @BotFather
          </code>{" "}
          並開始對話。
        </p>
        <p>
          或直接點擊：
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline ml-1"
          >
            t.me/BotFather
          </a>
        </p>
      </>
    ),
  },
  {
    title: "建立新 Bot",
    content: (
      <>
        <p>
          發送{" "}
          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">
            /newbot
          </code>{" "}
          指令。
        </p>
        <p>輸入 Bot 的顯示名稱（例如：「我的 AI 助手」）。</p>
        <p>
          輸入 Bot 的用戶名（必須以{" "}
          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">
            bot
          </code>{" "}
          結尾，例如：
          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">
            my_ai_assistant_bot
          </code>
          ）。
        </p>
      </>
    ),
  },
  {
    title: "複製 Bot Token",
    content: (
      <>
        <p>
          BotFather 會回覆一串 Token（格式如：
          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm break-all">
            123456789:ABCdefGHIjklMNOpqrsTUVwxyz
          </code>
          ）。
        </p>
        <p>將此 Token 貼到我們的設定表格中。</p>
      </>
    ),
  },
  {
    title: "查詢您的 Telegram User ID",
    content: (
      <>
        <p>
          在 Telegram 搜尋{" "}
          <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-sm">
            @userinfobot
          </code>{" "}
          並開始對話。
        </p>
        <p>發送任何訊息，Bot 會回覆您的 User ID（一串數字）。</p>
        <p>將此 ID 貼到設定表格中。</p>
      </>
    ),
  },
];

const BotGuide = () => {
  return (
    <section className="container py-20">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">如何建立 Telegram Bot</h1>
        <p className="text-base text-muted-foreground mt-2">
          只需 2 分鐘，跟著以下步驟即可完成。
        </p>
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto space-y-6">
        {steps.map((step, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-lg">{i + 1}</span>
              </div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
            </div>
            <div className="pl-14 space-y-2 text-muted-foreground text-base leading-relaxed">
              {step.content}
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <div className="text-center pt-8">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg shadow-primary/20"
          >
            <Link to="/onboarding">
              <ArrowLeft className="h-5 w-5" />
              已完成？返回填寫設定表格
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BotGuide;
