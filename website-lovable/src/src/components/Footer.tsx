import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-[#2A1A1D] text-[#FFFAF5]">
    <div className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-lg font-medium">
            <span className="text-2xl">🦀</span>
            <span>蟹助手</span>
          </div>
          <p className="text-sm text-[#FFFAF5]/70 leading-relaxed">
            香港 AI 助手安裝服務<br />
            擁有你自己的私人 AI 系統
          </p>
        </div>

        {/* Nav */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">導航</h4>
          <nav className="flex flex-col gap-2">
            <Link to="/" className="text-sm text-[#FFFAF5]/70 hover:text-[#FFFAF5] transition-colors">首頁</Link>
            <Link to="/pricing" className="text-sm text-[#FFFAF5]/70 hover:text-[#FFFAF5] transition-colors">收費</Link>
            <Link to="/technology" className="text-sm text-[#FFFAF5]/70 hover:text-[#FFFAF5] transition-colors">技術</Link>
            <Link to="/faq" className="text-sm text-[#FFFAF5]/70 hover:text-[#FFFAF5] transition-colors">常見問題</Link>
            <Link to="/contact" className="text-sm text-[#FFFAF5]/70 hover:text-[#FFFAF5] transition-colors">聯絡我們</Link>
          </nav>
        </div>

        {/* Payment + Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">付款方式</h4>
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-[#FFFAF5]/10 px-3 py-1 rounded-md font-medium text-[#FFFAF5]/80">FPS 轉數快</span>
            <span className="bg-[#FFFAF5]/10 px-3 py-1 rounded-md font-medium text-[#FFFAF5]/80">PayMe</span>
          </div>
          <p className="text-xs text-[#FFFAF5]/40 mt-2">info@clawhk.com</p>
        </div>
      </div>

      <div className="border-t border-[#FFFAF5]/10 mt-8 pt-6 text-center text-xs text-[#FFFAF5]/40">
        © 2026 蟹助手 ClawHK. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
