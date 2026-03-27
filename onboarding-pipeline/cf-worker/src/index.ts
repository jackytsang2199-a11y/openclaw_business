import { Env } from "./lib/types";
import { handleWebhook } from "./handlers/webhook";
import { handleConfirm } from "./handlers/confirm";
import { handleGetNextJob, handleUpdateJob } from "./handlers/jobs";
import { handleHealthPing, checkPi5Health } from "./handlers/health";
import { handleCreateOrder } from "./handlers/orders";
import { handleGetRecyclableVps, handleCreateVps, handleUpdateVps, handleListVps } from "./handlers/vps";
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

    // Route: Order submission (public — no auth)
    if (method === "POST" && path === "/api/orders") {
      return handleCreateOrder(request, env);
    }

    // Route: Manual payment confirm (admin only)
    const confirmMatch = path.match(/^\/api\/confirm\/(\d+)$/);
    if (method === "POST" && confirmMatch) {
      return handleConfirm(request, env, confirmMatch[1]);
    }

    // Route: Pi5 polls for next job
    if (method === "GET" && path === "/api/jobs/next") {
      return handleGetNextJob(request, env);
    }

    // Route: Pi5 updates job status
    const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/);
    if (method === "PATCH" && jobMatch) {
      return handleUpdateJob(request, env, jobMatch[1]);
    }

    // Route: Pi5 health ping
    if (method === "POST" && path === "/api/health") {
      return handleHealthPing(request, env);
    }

    // Route: VPS recyclable check
    if (method === "GET" && path === "/api/vps/recyclable") {
      return handleGetRecyclableVps(request, env);
    }

    // Route: VPS list by status
    if (method === "GET" && path === "/api/vps") {
      return handleListVps(request, env);
    }

    // Route: VPS create
    if (method === "POST" && path === "/api/vps") {
      return handleCreateVps(request, env);
    }

    // Route: VPS update
    const vpsMatch = path.match(/^\/api\/vps\/(.+)$/);
    if (method === "PATCH" && vpsMatch) {
      return handleUpdateVps(request, env, vpsMatch[1]);
    }

    // Catch-all
    return json({ error: "Not found", endpoints: [
      "POST /api/orders",
      "POST /api/webhook/lemonsqueezy",
      "POST /api/confirm/:orderId",
      "GET  /api/jobs/next",
      "PATCH /api/jobs/:id",
      "POST /api/health",
      "GET  /api/vps/recyclable",
      "POST /api/vps",
      "PATCH /api/vps/:id",
      "GET  /api/vps?status=:status",
    ]}, 404);
  },
};
