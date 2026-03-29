const Privacy = () => (
  <section className="container py-20 max-w-3xl mx-auto">
    <div className="text-center space-y-4 mb-12">
      <h1 className="text-3xl md:text-5xl">私隱政策</h1>
    </div>

    <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">資料收集</h2>
        <p>
          我們收集的個人資料包括：姓名、電郵地址、Telegram
          用戶資料及付款資訊。這些資料僅在您主動提供時收集。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">資料用途</h2>
        <p>
          個人資料僅用於提供及改善服務，包括帳戶管理、技術支援、服務通知及系統維護。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">資料儲存</h2>
        <p>
          您的對話數據儲存在您的專屬 VPS
          伺服器上，不會與其他客戶共用。我們不會存取或備份您的對話內容。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">第三方共享</h2>
        <p>
          我們不會將您的個人資料出售或分享給第三方，除非法律要求或獲得您的明確同意。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">API 代理</h2>
        <p>
          所有 API 請求通過加密代理伺服器轉發，您的 VPS 上不存儲任何真實 API
          密鑰。代理伺服器僅處理請求轉發，不會記錄或存儲對話內容。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">您的權利</h2>
        <p>
          您有權查閱、更正或刪除您的個人資料。如需行使上述權利，請透過以下聯絡方式與我們聯繫。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">聯絡方式</h2>
        <p>
          如有私隱相關查詢，請聯絡{" "}
          <a
            href="mailto:support@3nexgen.com"
            className="text-primary hover:underline"
          >
            support@3nexgen.com
          </a>
        </p>
      </div>
    </div>

    <p className="text-sm text-muted-foreground mt-12 text-center opacity-60">
      最後更新：2026 年 3 月
    </p>
  </section>
);

export default Privacy;
