import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/Layout";
import LanguageDetector from "./components/LanguageDetector";
import Index from "./pages/Index";
import Pricing from "./pages/Pricing";
import Technology from "./pages/Technology";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refund from "./pages/Refund";
import Onboarding from "./pages/Onboarding";
import BotGuide from "./pages/BotGuide";
import NotFound from "./pages/NotFound";

/** Page routes shared by both the default (zh-HK, no prefix) and prefixed language layouts. */
function pageRoutes() {
  return (
    <>
      <Route index element={<Index />} />
      <Route path="pricing" element={<Pricing />} />
      <Route path="technology" element={<Technology />} />
      <Route path="faq" element={<FAQ />} />
      <Route path="contact" element={<Contact />} />
      <Route path="terms" element={<Terms />} />
      <Route path="privacy" element={<Privacy />} />
      <Route path="refund" element={<Refund />} />
      <Route path="onboarding" element={<Onboarding />} />
      <Route path="bot-guide" element={<BotGuide />} />
      <Route path="*" element={<NotFound />} />
    </>
  );
}

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
        <Routes>
          {/* Default language (zh-HK) — no URL prefix */}
          <Route element={<LanguageDetector />}>
            <Route element={<Layout />}>
              {pageRoutes()}
            </Route>
          </Route>

          {/* Other languages — /:lang prefix (e.g. /en/pricing, /ja/faq) */}
          <Route path=":lang" element={<LanguageDetector />}>
            <Route element={<Layout />}>
              {pageRoutes()}
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
  </TooltipProvider>
);

export default App;
