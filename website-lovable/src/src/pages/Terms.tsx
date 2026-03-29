const Terms = () => (
  <section className="container py-20 max-w-3xl mx-auto">
    <div className="text-center space-y-4 mb-12">
      <h1 className="text-3xl md:text-5xl">服務條款</h1>
    </div>

    <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">服務範圍</h2>
        <p>
          NexGen 提供遠程 OpenClaw AI 助手安裝及維護服務。服務內容包括在客戶指定的 VPS
          伺服器上安裝及配置 AI 智能體系統，以及持續的技術支援和系統維護。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">付款條款</h2>
        <p>
          安裝費為一次性收費，於服務開始前支付。月費按月計算，每月自動收取。所有費用以港幣
          (HKD) 計算。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">服務保證</h2>
        <p>
          我們承諾 99% 以上的服務可用性。如因我方原因導致服務中斷超過 24
          小時，將按比例退還該期間的月費。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">終止服務</h2>
        <p>
          客戶可隨時聯絡我們取消服務。取消後，服務將運行至當月計費週期結束。取消後客戶仍保留
          VPS 上已安裝的系統。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">免責聲明</h2>
        <p>
          AI 助手的回覆僅供參考，不構成專業建議。NexGen
          不對因使用或依賴 AI 回覆而產生的任何損失承擔責任。
        </p>
      </div>
    </div>

    <p className="text-sm text-muted-foreground mt-12 text-center opacity-60">
      最後更新：2026 年 3 月
    </p>
  </section>
);

export default Terms;
