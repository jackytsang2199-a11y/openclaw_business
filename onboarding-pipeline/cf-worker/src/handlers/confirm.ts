import { Env } from "../lib/types";
import { verifyConfirmApiKey, unauthorized, badRequest, notFound, json } from "../lib/auth";
import { confirmPayment, getJobById } from "../lib/db";

interface ConfirmRequest {
  payment_method: string;
  amount_hkd?: number;
  reference?: string;
}

export async function handleConfirm(request: Request, env: Env, orderId: string): Promise<Response> {
  if (!verifyConfirmApiKey(request, env)) {
    return unauthorized("Invalid API key");
  }

  const existing = await getJobById(env.DB, orderId);
  if (!existing) {
    return notFound("Order not found");
  }

  let body: ConfirmRequest;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.payment_method) {
    return badRequest("Missing required field: payment_method");
  }

  if (!["fps", "payme", "lemon_squeezy"].includes(body.payment_method)) {
    return badRequest("payment_method must be fps, payme, or lemon_squeezy");
  }

  const confirmed = await confirmPayment(env.DB, orderId, body.payment_method);
  if (!confirmed) {
    return badRequest(`Order ${orderId} is not in pending_payment status (current: ${existing.status})`);
  }

  return json({ order: { id: confirmed.id, status: confirmed.status } });
}
