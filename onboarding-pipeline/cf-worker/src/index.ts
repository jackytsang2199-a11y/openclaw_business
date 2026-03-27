import { Env } from "./lib/types";
import { handleWebhook } from "./handlers/webhook";
import { handleConfirm } from "./handlers/confirm";
import { handleGetNextJob, handleUpdateJob } from "./handlers/jobs";
import { handleHealthPing, checkPi5Health } from "./handlers/health";
import { handleCreateOrder } from "./handlers/orders";
import { json } from "./lib/auth";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Background: check Pi5 health on every request
    ctx.waitUntil(checkPi5Health(env, ctx));

    // Route: Lemon Squeezy webhook
    if (method === "POST" && path === "/api/webhook/lemonsqueezy") {
      return handleWebhook(request, env);
    }

    // Route: Manual confirm (FPS/PayMe)
    if (method === "POST" && path === "/api/confirm") {
      return handleConfirm(request, env);
    }

    // Route: Pi5 polls for next job
    if (method === "GET" && path === "/api/jobs/next") {
      return handleGetNextJob(request, env);
    }

    // Route: Pi5 updates job status
    const jobMatch = path.match(/^\/api\/jobs\/(T\d+)$/);
    if (method === "PATCH" && jobMatch) {
      return handleUpdateJob(request, env, jobMatch[1]);
    }

    // Route: Pi5 health ping
    if (method === "POST" && path === "/api/health") {
      return handleHealthPing(request, env);
    }

    // Route: Order submission (public — no auth)
    if (method === "POST" && path === "/api/orders") {
      return handleCreateOrder(request, env);
    }

    // Catch-all
    return json({ error: "Not found", endpoints: [
      "POST /api/webhook/lemonsqueezy",
      "POST /api/confirm",
      "GET  /api/jobs/next",
      "PATCH /api/jobs/:id",
      "POST /api/health",
      "POST /api/orders",
    ]}, 404);
  },
};
