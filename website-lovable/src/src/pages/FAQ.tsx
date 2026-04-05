import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

const categoryDefs = [
  { key: "basic", count: 4 },
  { key: "billing", count: 3 },
  { key: "features", count: 4 },
  { key: "support", count: 3 },
];

const FAQ = () => {
  const { t } = useTranslation('faq');
  const lp = useLocalizedPath();

  const categories = categoryDefs.map((cat) => ({
    title: t(`categories.${cat.key}`),
    key: cat.key,
    faqs: Array.from({ length: cat.count }, (_, i) => ({
      q: t(`${cat.key}.${i}.q`),
      a: t(`${cat.key}.${i}.a`),
    })),
  }));

  return (
    <>
      <SEOHead page="faq" />
      <section className="container py-20 max-w-3xl mx-auto">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-5xl">{t('pageTitle')}</h1>
          <p className="text-lg text-muted-foreground mt-2">{t('pageSubtitle')}</p>
          <p className="text-muted-foreground">
            {t('cantFind')}
            <Link to={lp("/contact")} className="text-primary font-medium hover:underline ml-1">
              {t('supportCta')}
            </Link>
          </p>
        </div>

        <div className="space-y-10">
          {categories.map((cat) => (
            <div key={cat.key}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-1 rounded-full bg-primary" />
                <h2 className="text-2xl md:text-3xl">{cat.title}</h2>
              </div>
              <Accordion type="single" collapsible className="space-y-2">
                {cat.faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`${cat.key}-${i}`}
                    className="rounded-2xl border border-border bg-card px-6 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
                  >
                    <AccordionTrigger className="text-left font-medium py-5 hover:no-underline text-base min-h-[44px]">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground prose-zh pb-4 text-base">
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
          <p className="text-lg text-muted-foreground">{t('bottomCta.title')}</p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 text-base px-8 rounded-2xl shadow-lg">
            <Link to={lp("/contact")}>
              <FileText className="h-5 w-5" />
              {t('supportCta')}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
};

export default FAQ;
