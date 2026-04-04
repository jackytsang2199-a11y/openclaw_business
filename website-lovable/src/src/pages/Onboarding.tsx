import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Info, HelpCircle, MessageCircle } from "lucide-react";

const steps = [
  { number: 1, text: "填寫以上表格" },
  { number: 2, text: "我們會在 30 分鐘內自動安裝" },
  { number: 3, text: "安裝完成後，您會收到 Telegram 通知" },
];

const Onboarding = () => {
  useEffect(() => {
    // Load Tally embed script for better UX
    const existingScript = document.querySelector(
      'script[src="https://tally.so/widgets/embed.js"]'
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://tally.so/widgets/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section className="container py-20">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">完成設定</h1>
        <p className="text-base text-muted-foreground mt-2">
          感謝您的訂購！請填寫以下資料，我們會在 30 分鐘內為您完成安裝。
        </p>
      </div>

      {/* Tally Form Embed */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="rounded-2xl border border-border bg-card p-2 md:p-4">
          <iframe
            src="https://tally.so/r/MeYGv0"
            width="100%"
            height={800}
            frameBorder="0"
            title="客戶資料表格"
            className="rounded-xl"
          />
        </div>

        {/* Steps */}
        <div className="mt-12 space-y-4">
          <h2 className="text-xl font-semibold text-center mb-6">
            接下來的流程
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-border bg-card p-6 text-center space-y-3"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <span className="text-primary font-bold text-lg">
                    {step.number}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Help Links */}
        <div className="mt-8 rounded-xl border border-border bg-accent/30 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              需要幫助建立 Telegram Bot？{" "}
              <Link
                to="/bot-guide"
                className="text-primary font-medium hover:underline"
              >
                查看教學指南
              </Link>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              遇到問題？{" "}
              <Link
                to="/contact"
                className="text-primary font-medium hover:underline"
              >
                提交支援工單
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Onboarding;
