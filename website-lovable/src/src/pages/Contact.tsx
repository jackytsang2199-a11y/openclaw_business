import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Send, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

const Contact = () => {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const bodyParts: string[] = [];
    if (orderNumber.trim()) {
      bodyParts.push(`訂單號碼：${orderNumber.trim()}`);
    }
    bodyParts.push(`回覆電郵：${email.trim()}`);
    bodyParts.push("");
    bodyParts.push(description.trim());

    const mailtoSubject = encodeURIComponent(subject.trim());
    const mailtoBody = encodeURIComponent(bodyParts.join("\n"));
    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

    window.location.href = mailtoLink;
    setSubmitted(true);
  };

  return (
    <section className="container py-20">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">提交支援工單</h1>
        <p className="text-base text-muted-foreground mt-2">
          填寫以下表格，我們會在 24 小時內透過電郵回覆。
        </p>
      </div>

      {/* Ticket Form */}
      <div className="max-w-xl mx-auto">
        {submitted ? (
          <div className="rounded-2xl border border-primary/30 bg-card p-10 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">工單已提交</h2>
            <p className="text-muted-foreground">
              我們會盡快透過電郵回覆。
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-2xl"
              onClick={() => {
                setSubmitted(false);
                setOrderNumber("");
                setEmail("");
                setSubject("");
                setDescription("");
              }}
            >
              提交另一個工單
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-8 space-y-6"
          >
            {/* Order Number (optional) */}
            <div className="space-y-2">
              <label
                htmlFor="orderNumber"
                className="block text-sm font-medium"
              >
                訂單號碼
                <span className="text-muted-foreground ml-1 font-normal">
                  （選填）
                </span>
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="例如：T1043"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Email (required) */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                電郵地址
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Subject (required) */}
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-sm font-medium">
                主題
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="例如：無法連接 AI 助手"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Description (required) */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                問題描述
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <textarea
                id="description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="請詳細描述您遇到的問題..."
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors resize-y"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base rounded-2xl shadow-lg"
            >
              <Send className="h-4 w-4" />
              提交工單
            </Button>
          </form>
        )}

        {/* Info box */}
        <div className="mt-8 rounded-xl border border-border bg-accent/30 p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              您也可以直接發送電郵至{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-medium hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>
              常見問題可能已有解答{" "}
              <Link
                to="/faq"
                className="text-primary font-medium hover:underline"
              >
                查看 FAQ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
