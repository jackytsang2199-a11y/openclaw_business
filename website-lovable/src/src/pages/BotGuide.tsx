import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

const STEP_KEYS = ["1", "2", "3", "4"] as const;

const BotGuide = () => {
  const { t } = useTranslation('botguide');
  const lp = useLocalizedPath();

  return (
    <>
      <SEOHead page="botguide" />
      <section className="container py-20">
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
        <h1 className="text-3xl md:text-5xl">{t('pageTitle')}</h1>
        <p className="text-base text-muted-foreground mt-2">
          {t('pageSubtitle')}
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        <Link to={lp("/onboarding")} className="text-sm text-primary hover:underline flex items-center gap-1">
          {t('backLink')}
        </Link>
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto space-y-6">
        {STEP_KEYS.map((key, i) => (
          <div
            key={key}
            className="rounded-2xl border border-border bg-card p-6 md:p-8 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-lg">{i + 1}</span>
              </div>
              <h2 className="text-lg font-semibold">{t(`steps.${key}.title`)}</h2>
            </div>
            <div className="pl-14 space-y-2 text-muted-foreground text-base leading-relaxed">
              <p dangerouslySetInnerHTML={{ __html: t(`steps.${key}.line1`) }} />
              {t(`steps.${key}.line2`, { defaultValue: '' }) && (
                key === "1" ? (
                  <p>
                    {t(`steps.${key}.line2`)}{' '}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium hover:underline ml-1"
                    >
                      {t(`steps.${key}.linkText`)}
                    </a>
                  </p>
                ) : (
                  <p dangerouslySetInnerHTML={{ __html: t(`steps.${key}.line2`) }} />
                )
              )}
              {t(`steps.${key}.line3`, { defaultValue: '' }) && (
                <p dangerouslySetInnerHTML={{ __html: t(`steps.${key}.line3`) }} />
              )}
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
            <Link to={lp("/onboarding")}>
              <ArrowLeft className="h-5 w-5" />
              {t('doneCta')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
    </>
  );
};

export default BotGuide;
