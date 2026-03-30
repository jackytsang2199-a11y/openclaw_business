import { Link } from "react-router-dom";
import NexGenLogo from "@/components/NexGenLogo";
import { TELEGRAM_URL } from "@/lib/constants";

const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const Footer = () => (
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
            AI 智能體安裝服務<br />
            擁有你自己的私人 AI 系統
          </p>
          <p className="text-sm opacity-70">真人團隊。真正解答。</p>
          {/* Social icons */}
          <div className="flex items-center gap-3 pt-2">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 hover:text-[#26A5E4] transition-all" aria-label="Telegram AI 機械人">
              <TelegramIcon />
            </a>
          </div>
        </div>

        {/* Nav */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">導航</h4>
          <nav className="flex flex-col gap-2">
            <Link to="/" className="text-sm opacity-80 hover:opacity-100 transition-opacity">首頁</Link>
            <Link to="/pricing" className="text-sm opacity-80 hover:opacity-100 transition-opacity">收費</Link>
            <Link to="/technology" className="text-sm opacity-80 hover:opacity-100 transition-opacity">技術</Link>
            <Link to="/faq" className="text-sm opacity-80 hover:opacity-100 transition-opacity">常見問題</Link>
            <Link to="/contact" className="text-sm opacity-80 hover:opacity-100 transition-opacity">聯絡我們</Link>
            <Link to="/contact" className="text-sm opacity-80 hover:opacity-100 transition-opacity">支援工單</Link>
          </nav>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">付款方式</h4>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="bg-white/10 px-3 py-1 rounded-md font-medium opacity-80">FPS</span>
            <span className="bg-white/10 px-3 py-1 rounded-md font-medium opacity-80">PayMe</span>
            <span className="bg-white/10 px-3 py-1 rounded-md font-medium opacity-80">信用卡</span>
          </div>
          <p className="text-xs opacity-50 mt-2">support@3nexgen.com</p>
        </div>
      </div>

      <div className="border-t border-white/10 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-50">
        <span>© 2026 NexGen. All rights reserved.</span>
        <div className="flex items-center gap-3">
          <Link to="/terms" className="hover:opacity-80 transition-opacity">服務條款</Link>
          <span>|</span>
          <Link to="/privacy" className="hover:opacity-80 transition-opacity">私隱政策</Link>
          <span>|</span>
          <Link to="/refund" className="hover:opacity-80 transition-opacity">退款政策</Link>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
