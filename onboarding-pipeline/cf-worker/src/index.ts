import { Env } from "./lib/types";
import { handleWebhook } from "./handlers/webhook";
import { handleConfirm } from "./handlers/confirm";
import { handleGetNextJob, handleUpdateJob, handleListJobs, handleGetJob } from "./handlers/jobs";
import { handleHealthPing, checkPi5Health } from "./handlers/health";
import { handleCreateOrder } from "./handlers/orders";
import { handleGetRecyclableVps, handleCreateVps, handleUpdateVps, handleListVps } from "./handlers/vps";
import { handleAiProxy } from "./handlers/proxy";
import {
  handleListUsage,
  handleGetUsage,
  handleUpdateUsage,
  handleBulkUpdateBudgets,
  handleResetUsage,
  handleRevokeToken,
  handleRotateToken,
  handleCreateUsage,
} from "./handlers/usage";
import { json } from "./lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, X-Worker-Token, X-Signature",
  "Access-Control-Max-Age": "86400",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Background: check Pi5 health on every request
    ctx.waitUntil(checkPi5Health(env, ctx));

    // Route: Lemon Squeezy webhook
    if (method === "POST" && path === "/api/webhook/lemonsqueezy") {
      return handleWebhook(request, env);
    }

    // Route: Order submission (public — no auth, needs CORS)
    if (method === "POST" && path === "/api/orders") {
      return withCors(await handleCreateOrder(request, env));
    }

    // Route: Manual payment confirm (admin only)
    const confirmMatch = path.match(/^\/api\/confirm\/(\d+)$/);
    if (method === "POST" && confirmMatch) {
      return handleConfirm(request, env, confirmMatch[1]);
    }

    // Route: Pi5 polls for next job (atomically flips ready → provisioning)
    if (method === "GET" && path === "/api/jobs/next") {
      return handleGetNextJob(request, env);
    }

    // Route: List jobs by status (read-only, no mutation — for CLI "jobs" command)
    if (method === "GET" && path === "/api/jobs") {
      return handleListJobs(request, env);
    }

    // Route: Get single job by ID (read-only)
    const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/);
    if (method === "GET" && jobMatch) {
      return handleGetJob(request, env, jobMatch[1]);
    }

    // Route: Pi5 updates job status
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

    // Route: Admin — bulk update budgets by tier
    if (method === "POST" && path === "/api/usage/budgets") {
      return handleBulkUpdateBudgets(request, env);
    }

    // Route: Admin — reset customer spend
    const resetMatch = path.match(/^\/api\/usage\/([^/]+)\/reset$/);
    if (method === "POST" && resetMatch) {
      return handleResetUsage(request, env, resetMatch[1]);
    }

    // Route: Admin — revoke customer token
    const revokeMatch = path.match(/^\/api\/usage\/([^/]+)\/revoke$/);
    if (method === "POST" && revokeMatch) {
      return handleRevokeToken(request, env, revokeMatch[1]);
    }

    // Route: Admin — rotate customer token
    const rotateMatch = path.match(/^\/api\/usage\/([^/]+)\/rotate$/);
    if (method === "POST" && rotateMatch) {
      return handleRotateToken(request, env, rotateMatch[1]);
    }

    // Route: Admin — create usage record (Pi5 calls this during deploy)
    if (method === "POST" && path === "/api/usage") {
      return handleCreateUsage(request, env);
    }

    // Route: Admin — list all usage
    if (method === "GET" && path === "/api/usage") {
      return handleListUsage(request, env);
    }

    // Route: Admin — get/update single customer usage
    const usageMatch = path.match(/^\/api\/usage\/([^/]+)$/);
    if (method === "GET" && usageMatch) {
      return handleGetUsage(request, env, usageMatch[1]);
    }
    if (method === "PATCH" && usageMatch) {
      return handleUpdateUsage(request, env, usageMatch[1]);
    }

    // Route: AI Gateway proxy (customer API traffic)
    const aiMatch = path.match(/^\/api\/ai\/([^/]+)\/(.+)$/);
    if (method === "POST" && aiMatch) {
      return handleAiProxy(request, env, aiMatch[1], aiMatch[2]);
    }

    // Catch-all
    return json({ error: "Not found", endpoints: [
      "POST /api/orders",
      "POST /api/webhook/lemonsqueezy",
      "POST /api/confirm/:orderId",
      "GET  /api/jobs/next",
      "GET  /api/jobs?status=:status",
      "GET  /api/jobs/:id",
      "PATCH /api/jobs/:id",
      "POST /api/health",
      "GET  /api/vps/recyclable",
      "POST /api/vps",
      "PATCH /api/vps/:id",
      "GET  /api/vps?status=:status",
      "POST /api/ai/:provider/*",
      "GET  /api/usage",
      "GET  /api/usage/:customerId",
      "PATCH /api/usage/:customerId",
      "POST /api/usage",
      "POST /api/usage/budgets",
      "POST /api/usage/:customerId/reset",
      "POST /api/usage/:customerId/revoke",
      "POST /api/usage/:customerId/rotate",
    ]}, 404);
  },
};
