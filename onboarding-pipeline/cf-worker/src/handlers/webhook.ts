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

  const event = payload.meta.event_name;
  const orderId = payload.meta.custom_data?.order_id;

  // Handle order_created — confirm payment
  if (event === "order_created") {
    if (!orderId) {
      console.log("[webhook] Payment received without order_id in custom_data");
      return json({ warning: "No order_id in custom_data" });
    }
    const existing = await getJobById(env.DB, orderId);
    if (!existing) {
      console.log(`[webhook] Order ${orderId} not found in D1`);
      return json({ warning: `Order ${orderId} not found` });
    }
    const confirmed = await confirmPayment(env.DB, orderId, "lemon_squeezy");
    if (!confirmed) {
      return json({ ok: true, already_confirmed: true });
    }
    return json({ ok: true, order_id: confirmed.id, status: confirmed.status });
  }

  // Handle subscription_cancelled or subscription_expired — create cancel job
  if (event === "subscription_cancelled" || event === "subscription_expired") {
    if (!orderId) {
      console.log(`[webhook] ${event} received without order_id`);
      return json({ warning: `${event} without order_id`, event });
    }
    const existing = await getJobById(env.DB, orderId);
    if (!existing) {
      console.log(`[webhook] ${event}: order ${orderId} not found`);
      return json({ warning: `Order ${orderId} not found for ${event}`, event });
    }
    // Create a cancel job — Pi5 will notify owner, owner confirms via CLI
    const cancelJobId = `cancel_${orderId}_${Date.now()}`;
    const now = new Date().toISOString();
    try {
      await env.DB.prepare(
        `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, bot_token, bot_username, payment_method, created_at, updated_at)
         VALUES (?, 'ready', 'cancel', ?, ?, ?, ?, ?, ?, 'lemon_squeezy', ?, ?)`
      ).bind(
        cancelJobId,
        existing.tier,
        existing.display_name || orderId,
        existing.telegram_user_id || "",
        existing.email || "",
        existing.bot_token || "",
        existing.bot_username || "",
        now,
        now,
      ).run();
    } catch (e) {
      console.log(`[webhook] Failed to create cancel job: ${e}`);
      return json({ error: "Failed to create cancel job", event });
    }
    console.log(`[webhook] ${event}: cancel job ${cancelJobId} created for order ${orderId}`);
    return json({ ok: true, event, cancel_job_id: cancelJobId });
  }

  // Handle subscription_payment_failed — notify only (LS retries automatically)
  if (event === "subscription_payment_failed") {
    console.log(`[webhook] Payment failed for order ${orderId || "unknown"}`);
    return json({ ok: true, event, action: "notify_only" });
  }

  // Handle subscription_updated — log only
  if (event === "subscription_updated") {
    console.log(`[webhook] Subscription updated for order ${orderId || "unknown"}`);
    return json({ ok: true, event, action: "logged" });
  }

  // All other events — ignore
  return json({ ignored: true, event });
}
