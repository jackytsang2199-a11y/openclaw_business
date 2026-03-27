import { Env } from "../lib/types";
import { verifyWorkerToken, unauthorized, badRequest, notFound, json } from "../lib/auth";
import { getRecyclableVps, createVpsInstance, updateVpsInstance, listVpsByStatus, getVpsById } from "../lib/db";

export async function handleGetRecyclableVps(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const vps = await getRecyclableVps(env.DB);
  return json({ vps });
}

export async function handleCreateVps(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.vps_id || !body.status) {
    return badRequest("Missing required fields: vps_id, status");
  }

  try {
    const vps = await createVpsInstance(env.DB, {
      vps_id: body.vps_id as string,
      contabo_contract_id: (body.contabo_contract_id as string) ?? undefined,
      contabo_ip: (body.contabo_ip as string) ?? undefined,
      customer_id: (body.customer_id as string) ?? undefined,
      status: body.status as string,
      tier: (body.tier as number) ?? undefined,
      reinstall_count: (body.reinstall_count as number) ?? undefined,
      billing_start: (body.billing_start as string) ?? undefined,
      cancel_date: (body.cancel_date as string) ?? undefined,
      cancel_deadline: (body.cancel_deadline as string) ?? undefined,
    });
    return json({ vps }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("UNIQUE constraint")) {
      return json({ error: "VPS instance already exists" }, 409);
    }
    throw err;
  }
}

export async function handleUpdateVps(request: Request, env: Env, vpsId: string): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const existing = await getVpsById(env.DB, vpsId);
  if (!existing) {
    return notFound("VPS instance not found");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const vps = await updateVpsInstance(env.DB, vpsId, body);
  return json({ vps });
}

export async function handleListVps(request: Request, env: Env): Promise<Response> {
  if (!verifyWorkerToken(request, env)) return unauthorized("Invalid worker token");

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  if (!status) {
    return badRequest("Missing required query param: status");
  }

  const vpsList = await listVpsByStatus(env.DB, status);
  return json({ vps_list: vpsList });
}
