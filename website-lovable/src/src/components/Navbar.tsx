import { useState } from "react";
import NexGenLogo from "@/components/NexGenLogo";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";
import LanguageSwitcher from "./LanguageSwitcher";
import { TELEGRAM_URL } from "@/lib/constants";

const navKeys = [
  { to: "/", key: "nav.home" },
  { to: "/pricing", key: "nav.pricing" },
  { to: "/technology", key: "nav.technology" },
  { to: "/faq", key: "nav.faq" },
  { to: "/contact", key: "nav.contact" },
];

const TelegramIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation("common");
  const lp = useLocalizedPath();

  return (
    <header className="sticky top-0 z-50 w-full bg-gray-950/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="container flex h-16 items-center justify-between">
        <Link to={lp("/")} className="flex items-center gap-2 text-lg font-bold text-white">
          <NexGenLogo className="h-7 w-7" />
          <span>NexGen</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navKeys.map((link) => {
            const localizedTo = lp(link.to);
            const isActive = location.pathname === localizedTo;
            return (
              <Link
                key={link.to}
                to={localizedTo}
                aria-current={isActive ? "page" : undefined}
                className={`relative text-sm font-semibold transition-colors py-1 ${
                  isActive ? "text-primary" : "text-gray-400 hover:text-white"
                }`}
              >
                {t(link.key)}
                {isActive && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTA — Telegram AI bot link */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to={lp("/pricing")}
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors btn-press"
          >
            {t("nav.cta")}
          </Link>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center rounded-full border border-white/20 bg-white/10 p-2.5 text-gray-300 hover:text-[#26A5E4] hover:shadow-[0_0_12px_rgba(38,165,228,0.3)] transition-all"
            aria-label={t("nav.telegram")}
          >
            <TelegramIcon className="h-5 w-5" />
          </a>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
              <span className="sr-only">{t("nav.openMenu")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-gray-950 border-white/10">
            <SheetTitle className="sr-only">{t("nav.menuLabel")}</SheetTitle>
            <nav className="flex flex-col gap-6 mt-8">
              {navKeys.map((link) => {
                const localizedTo = lp(link.to);
                const isActive = location.pathname === localizedTo;
                return (
                  <Link
                    key={link.to}
                    to={localizedTo}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-lg font-semibold transition-colors hover:text-primary ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {t(link.key)}
                  </Link>
                );
              })}
              <div className="flex items-center gap-4 mt-4">
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-[#26A5E4] transition-colors"
                >
                  <TelegramIcon className="h-6 w-6" />
                  <span className="text-sm">{t("nav.telegram")}</span>
                </a>
              </div>
              <div className="border-t border-white/10 mt-2 pt-2">
                <LanguageSwitcher variant="inline" onSelect={() => setOpen(false)} />
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Navbar;
