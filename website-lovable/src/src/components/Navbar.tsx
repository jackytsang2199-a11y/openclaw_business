import { useState } from "react";
import NexGenLogo from "@/components/NexGenLogo";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { useLocalizedPath } from "@/hooks/useLocalizedPath";
import LanguageSwitcher from "./LanguageSwitcher";

const navKeys = [
  { to: "/", key: "nav.home" },
  { to: "/pricing", key: "nav.pricing" },
  { to: "/technology", key: "nav.technology" },
  { to: "/faq", key: "nav.faq" },
  { to: "/contact", key: "nav.contact" },
];

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
              <div className="border-t border-white/10 mt-4 pt-2">
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
