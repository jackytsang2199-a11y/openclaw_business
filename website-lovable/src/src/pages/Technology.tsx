import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const techSections = [
  {
    name: "OpenClaw",
    headline: "全球第一開源 AI 智能體框架",
    body: "200,000+ GitHub Stars，全球 200 萬人每週使用。我們基於此平台深度定製，加入獨家插件生態，打造遠超原版的完整系統。",
  },
  {
    name: "Mem0 + Qdrant",
    headline: "向量級永久記憶 — AI 最強大腦",
    body: "不是 ChatGPT 那種 100 條記憶上限。基於 Qdrant 向量資料庫 + Mem0 記憶引擎，你說過的每一句話，它永遠記得。三個月前提過的偏好？它記得。越用越聰明，越用越了解你。",
  },
  {
    name: "SearXNG",
    headline: "突破 AI 搜尋封鎖 — 全網搜尋引擎",
    body: "ChatGPT 的搜尋被大量網站封鎖 — Reddit、論壇、部分新聞網站都搜不到。SearXNG 是自架元搜尋引擎，bypass 所有 AI 搜尋封鎖，即時搜尋全網資訊。ChatGPT 搜不到的，它搜得到。",
  },
  {
    name: "Chromium Headless",
    headline: "AI 代你操作瀏覽器 — 不只聊天，真正做事",
    body: "無頭瀏覽器自動化引擎。AI 直接操作瀏覽器幫你填表、格價、訂位、搶票、查評價。不只是回答問題 — 是真正動手幫你完成任務。（🚀 全能大師 專屬功能）",
  },
  {
    name: "Docker",
    headline: "容器化一鍵部署 — 穩定可靠",
    body: "整套系統以 Docker 容器化部署。環境完全隔離，安全穩定，一鍵啟動。你的系統獨立運行，需要搬遷時一鍵打包，資料完整保留。",
  },
  {
    name: "ACPX",
    headline: "ACP 協議運行環境",
    body: "Agent Communication Protocol 即時通訊層，支援多智能體間的即時訊息傳遞與任務分配。",
  },
  {
    name: "ClawTeam",
    headline: "多智能體協作框架",
    body: "基於 venv 隔離環境 + tmux 3.5a 多進程管理，多個 AI 智能體分工並行，同時處理複雜任務。",
  },
  {
    name: "Gateway Watchdog",
    headline: "自動恢復守護進程",
    body: "24/7 連線監控系統，自動偵測斷線並重新連接，支援多節點故障轉移，確保服務永不中斷。",
  },
];

const Technology = () => (
  <section className="container py-20">
    <div className="text-center space-y-4 mb-16">
      <h1 className="text-3xl md:text-5xl">我們的技術生態系統</h1>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
        經過數月研究與深度整合，每個組件都經過嚴格測試。這不是原版 OpenClaw — 這是完整的 AI 生態系統。
      </p>
    </div>

    <div className="max-w-3xl mx-auto space-y-6">
      {techSections.map((tech) => (
        <div
          key={tech.name}
          className="rounded-2xl border border-border bg-card p-8 space-y-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
        >
          <p className="text-xs text-primary font-semibold uppercase tracking-wider">{tech.name}</p>
          <h2 className="text-2xl md:text-3xl">{tech.headline}</h2>
          <p className="text-muted-foreground leading-relaxed text-base">{tech.body}</p>
        </div>
      ))}
    </div>

    {/* Privacy diagram */}
    <div className="max-w-4xl mx-auto text-center mt-20 space-y-6">
      <h2 className="text-2xl md:text-4xl">數據私隱比較</h2>
      <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
        了解蟹助手如何保護您的數據安全
      </p>
      <img
        src="/privacy-diagram.svg"
        alt="ChatGPT 與蟹助手數據流比較"
        className="w-full max-w-4xl mx-auto rounded-lg"
      />
    </div>

    {/* Bottom CTA */}
    <div className="max-w-xl mx-auto text-center mt-16 space-y-4">
      <p className="text-muted-foreground text-lg">想了解更多？</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 rounded-2xl shadow-lg">
          <Link to="/pricing">查看收費方案 →</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="border-primary/20 text-primary hover:bg-primary/[0.05] rounded-2xl text-base px-8 gap-2">
          <Link to="/contact">
            <Mail className="h-5 w-5" />
            提交支援工單
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

export default Technology;
