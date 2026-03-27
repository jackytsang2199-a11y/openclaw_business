import { Env } from "../lib/types";
import { verifyWorkerToken, unauthorized, badRequest, json } from "../lib/auth";
import { getNextJob, getJobById, updateJobStatus } from "../lib/db";

export async function handleGetNextJob(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const job = await getNextJob(env.DB);
  return json({ job });
}

export async function handleUpdateJob(request: Request, env: Env, jobId: string): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const existing = await getJobById(env.DB, jobId);
  if (!existing) {
    return json({ error: "Job not found" }, 404);
  }

  let body: { status?: string; server_ip?: string; error_log?: string; re_queue_count?: number };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.status) {
    return badRequest("status is required");
  }

  const validStatuses = ["pending_payment", "ready", "provisioning", "installing", "qa", "complete", "failed", "stale"];
  if (!validStatuses.includes(body.status)) {
    return badRequest(`Invalid status: ${body.status}`);
  }

  const job = await updateJobStatus(env.DB, jobId, body.status, {
    server_ip: body.server_ip,
    error_log: body.error_log,
    re_queue_count: body.re_queue_count,
  });

  return json({ job });
}
