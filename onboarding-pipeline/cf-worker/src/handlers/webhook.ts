import { Env } from "../lib/types";
import { verifyLemonSqueezySignature } from "../lib/hmac";
import { confirmPayment, getJobById } from "../lib/db";
import { unauthorized, badRequest, json } from "../lib/auth";

interface LemonSqueezyWebhook {
  meta: {
    event_name: string;
    custom_data?: {
      order_id?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      first_order_item?: {
        variant_id?: string;
      };
      user_email?: string;
    };
  };
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";

  if (!await verifyLemonSqueezySignature(body, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET)) {
    return unauthorized("Invalid webhook signature");
  }

  let payload: LemonSqueezyWebhook;
  try {
    payload = JSON.parse(body);
  } catch {
    return badRequest("Invalid JSON body");
  }

  // Only process order_created events
  if (payload.meta.event_name !== "order_created") {
    return json({ ignored: true, event: payload.meta.event_name });
  }

  // Match order by custom_data.order_id
  const orderId = payload.meta.custom_data?.order_id;
  if (!orderId) {
    console.log("[webhook] Lemon Squeezy payment received without order_id in custom_data — manual investigation needed");
    return json({ warning: "No order_id in custom_data — payment received but not matched" });
  }

  const existing = await getJobById(env.DB, orderId);
  if (!existing) {
    console.log(`[webhook] Order ${orderId} not found in D1 — payment received but order missing`);
    return json({ warning: `Order ${orderId} not found` });
  }

  const confirmed = await confirmPayment(env.DB, orderId, "lemon_squeezy");
  if (!confirmed) {
    // Already confirmed — idempotent, no error
    return json({ ok: true, already_confirmed: true });
  }

  return json({ ok: true, order_id: confirmed.id, status: confirmed.status });
}
