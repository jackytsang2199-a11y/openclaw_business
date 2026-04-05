import { Helmet } from "react-helmet-async";
import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Send, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

const Contact = () => {
  const { t } = useTranslation('contact');
  const lp = useLocalizedPath();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const bodyParts: string[] = [];
    if (orderNumber.trim()) {
      bodyParts.push(t('form.mailBodyOrder', { order: orderNumber.trim() }));
    }
    bodyParts.push(t('form.mailBodyEmail', { email: email.trim() }));
    bodyParts.push("");
    bodyParts.push(description.trim());

    const mailtoSubject = encodeURIComponent(subject.trim());
    const mailtoBody = encodeURIComponent(bodyParts.join("\n"));
    const mailtoLink = `mailto:${SUPPORT_EMAIL}?subject=${mailtoSubject}&body=${mailtoBody}`;

    window.location.href = mailtoLink;
    setSubmitted(true);
  };

  return (
    <>
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
      </Helmet>
      <section className="container py-20 bg-section-alt min-h-[80vh]">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">{t('pageTitle')}</h1>
        <p className="text-base text-muted-foreground mt-2">
          {t('pageSubtitle')}
        </p>
      </div>

      {/* Ticket Form */}
      <div className="max-w-xl mx-auto">
        {submitted ? (
          <div className="rounded-2xl border border-primary/30 bg-card p-10 text-center space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">{t('success.title')}</h2>
            <p className="text-muted-foreground">
              {t('success.body')}
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
              {t('success.another')}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-lg border-t-4 border-t-primary"
          >
            {/* Order Number (optional) */}
            <div className="space-y-2">
              <label
                htmlFor="orderNumber"
                className="block text-sm font-medium"
              >
                {t('form.orderNumber')}
                <span className="text-muted-foreground ml-1 font-normal">
                  {t('form.orderNumberOptional')}
                </span>
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t('form.orderNumberPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Email (required) */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                {t('form.email')}
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('form.emailPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Subject (required) */}
            <div className="space-y-2">
              <label htmlFor="subject" className="block text-sm font-medium">
                {t('form.subject')}
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <input
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('form.subjectPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>

            {/* Description (required) */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium"
              >
                {t('form.description')}
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <textarea
                id="description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('form.descriptionPlaceholder')}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors resize-y"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base rounded-2xl shadow-lg"
            >
              <Send className="h-4 w-4" />
              {t('form.submit')}
            </Button>
          </form>
        )}

        {/* Info box */}
        <div className="mt-8 rounded-xl border border-border bg-accent/30 p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              {t('info.directEmail')}{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-medium hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p>
              {t('info.faqHint')}{" "}
              <Link
                to={lp("/faq")}
                className="text-primary font-medium hover:underline"
              >
                {t('info.faqLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
    </>
  );
};

export default Contact;
