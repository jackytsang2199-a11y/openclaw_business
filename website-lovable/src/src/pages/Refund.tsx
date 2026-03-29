const Refund = () => (
  <section className="container py-20 max-w-3xl mx-auto">
    <div className="text-center space-y-4 mb-12">
      <h1 className="text-3xl md:text-5xl">退款政策</h1>
    </div>

    <div className="space-y-8 text-base leading-relaxed text-muted-foreground">
      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">安裝費</h2>
        <p>
          安裝完成後不設退款。如安裝過程中出現技術問題導致無法完成，將全額退款。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">月費</h2>
        <p>
          月費按已使用的完整月份計算。取消後，服務將運行至當月計費週期結束。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">冷靜期</h2>
        <p>
          新客戶首次安裝後享有 48
          小時冷靜期。如在此期間內取消，將退還安裝費及已收月費。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">退款方式</h2>
        <p>
          退款將以原付款方式處理，一般需要 5-10 個工作天。
        </p>
      </div>

      <div>
        <h2 className="text-xl font-medium text-foreground mb-3">聯絡方式</h2>
        <p>
          如需申請退款，請聯絡{" "}
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

export default Refund;
