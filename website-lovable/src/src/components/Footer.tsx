import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";
import NexGenLogo from "@/components/NexGenLogo";
import { CreditCard, Smartphone } from "lucide-react";
const Footer = () => {
  const { t } = useTranslation("common");
  const lp = useLocalizedPath();

  return (
    <footer className="bg-dark-surface text-dark-section-foreground">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-medium">
              <NexGenLogo className="h-7 w-7" />
              <span>NexGen</span>
            </div>
            <p className="text-sm opacity-80 leading-relaxed">
              {t("footer.tagline")}<br />
              {t("footer.subtitle")}
            </p>
            <p className="text-sm opacity-70">{t("footer.slogan")}</p>
          </div>

          {/* Nav */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{t("footer.navHeading")}</h4>
            <nav className="flex flex-col gap-2">
              <Link to={lp("/")} className="text-sm opacity-80 hover:opacity-100 transition-all duration-200">{t("nav.home")}</Link>
              <Link to={lp("/pricing")} className="text-sm opacity-80 hover:opacity-100 transition-all duration-200">{t("nav.pricing")}</Link>
              <Link to={lp("/technology")} className="text-sm opacity-80 hover:opacity-100 transition-all duration-200">{t("nav.technology")}</Link>
              <Link to={lp("/faq")} className="text-sm opacity-80 hover:opacity-100 transition-all duration-200">{t("nav.faq")}</Link>
              <Link to={lp("/contact")} className="text-sm opacity-80 hover:opacity-100 transition-all duration-200">{t("nav.contact")}</Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{t("footer.paymentHeading")}</h4>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <span className="bg-white/10 px-3 py-1.5 rounded-md font-medium opacity-80 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" />{t("footer.creditCard")}</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-md font-medium opacity-80 flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" />PayMe</span>
            </div>
            <p className="text-xs opacity-70 mt-2">support@3nexgen.com</p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-70">
          <span>{t("footer.copyright")}</span>
          <div className="flex items-center gap-3">
            <Link to={lp("/terms")} className="hover:opacity-80 transition-opacity">{t("footer.terms")}</Link>
            <span>|</span>
            <Link to={lp("/privacy")} className="hover:opacity-80 transition-opacity">{t("footer.privacy")}</Link>
            <span>|</span>
            <Link to={lp("/refund")} className="hover:opacity-80 transition-opacity">{t("footer.refund")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
