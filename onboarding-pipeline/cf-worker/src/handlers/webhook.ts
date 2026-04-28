import { Env } from "../lib/types";
import { verifyLemonSqueezySignature } from "../lib/hmac";
import {
  confirmPayment,
  getJobById,
  getWebhookEventByEventId,
  insertWebhookEvent,
  updateWebhookEventResult,
  getUsageBySubscriptionId,
  getUsageByLsOrderId,
  getUsageByLsCustomerId,
  getUsageByCustomerId,
  linkLsIdentity,
  setPaymentFailed,
  clearPaymentFailed,
  setSubscriptionStatus,
  setBlocked,
  updateUsageBudget,
  writeAuditLog,
} from "../lib/db";
import { unauthorized, badRequest, json } from "../lib/auth";
import { parseVariantMap, validateVariant } from "../lib/constants";
import {
  notifyOwner,
  formatVariantMismatchAlert,
  formatPaymentFailedAlert,
  formatRefundAlert,
} from "../lib/notify";
import type { ApiUsage } from "../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// LS payload shape — kept loose because real payloads vary by event_name.
// Verified shape via real LS dashboard exports (Task 2.7) — until then, all
// fields are optional and we fall back gracefully.
// ─────────────────────────────────────────────────────────────────────────────

interface LemonSqueezyMeta {
  event_name: string;
  event_id?: string;          // LS sometimes puts it in body, sometimes only in X-Event-Id header
  test_mode?: boolean;
  custom_data?: {
    order_id?: string;        // Our internal numeric order id (1001, 1002, ...)
  };
}

interface LemonSqueezyAttributes {
  // Common
  test_mode?: boolean;
  user_email?: string;
  customer_id?: string | number;
  // Order
  total?: number;             // Cents
  total_usd?: number;
  currency?: string;
  first_order_item?: {
    variant_id?: string | number;
  };
  // Subscription
  variant_id?: string | number;
  subscription_id?: string | number;
  status?: string;
  renews_at?: string | null;
  ends_at?: string | null;
  refunded_amount?: number;
  // Refund
  amount?: number;
}

interface LemonSqueezyData {
  type?: string;
  id: string | number;        // LS object id (order id, subscription id, ...)
  attributes: LemonSqueezyAttributes;
}

interface LemonSqueezyWebhook {
  meta: LemonSqueezyMeta;
  data: LemonSqueezyData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: derive a stable event id, preferring header → body → synthesized
// ─────────────────────────────────────────────────────────────────────────────

function deriveEventId(request: Request, payload: LemonSqueezyWebhook): string {
  const header = request.headers.get("X-Event-Id");
  if (header) return header;
  if (payload.meta.event_id) return payload.meta.event_id;
  // Synthetic deterministic key — used for legacy LS deliveries lacking event_id.
  // This is per-payload deterministic so re-deliveries dedupe; not 100% bulletproof.
  return `synth:${payload.meta.event_name}:${payload.data.id}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: find the matching api_usage row by trying every identifier we have
// in priority order: subscription_id → ls_order_id → ls_customer_id → custom_data.order_id (jobs join)
// ─────────────────────────────────────────────────────────────────────────────

async function resolveCustomer(
  env: Env,
  payload: LemonSqueezyWebhook,
): Promise<ApiUsage | null> {
  const attrs = payload.data.attributes;
  const subId = attrs.subscription_id !== undefined ? String(attrs.subscription_id) : null;
  const lsOrderId = payload.meta.event_name.startsWith("order_") ? String(payload.data.id) : null;
  const lsCustomerId = attrs.customer_id !== undefined ? String(attrs.customer_id) : null;
  const internalOrderId = payload.meta.custom_data?.order_id;

  if (subId) {
    const u = await getUsageBySubscriptionId(env.DB, subId);
    if (u) return u;
  }
  if (lsOrderId) {
    const u = await getUsageByLsOrderId(env.DB, lsOrderId);
    if (u) return u;
  }
  if (lsCustomerId) {
    const u = await getUsageByLsCustomerId(env.DB, lsCustomerId);
    if (u) return u;
  }
  if (internalOrderId) {
    // Fallback via jobs row → if we created api_usage tagged with internal id
    const u = await getUsageByCustomerId(env.DB, internalOrderId);
    if (u) return u;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grace policy helper
// ─────────────────────────────────────────────────────────────────────────────

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";
  const sigValid = await verifyLemonSqueezySignature(body, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  if (!sigValid) {
    return unauthorized("Invalid webhook signature");
  }

  let payload: LemonSqueezyWebhook;
  try {
    payload = JSON.parse(body);
  } catch {
    return badRequest("Invalid JSON body");
  }

  const event = payload.meta.event_name;
  const eventId = deriveEventId(request, payload);
  const attrs = payload.data.attributes;
  const lsTestMode = Boolean(payload.meta.test_mode ?? attrs.test_mode);
  const internalOrderId = payload.meta.custom_data?.order_id;
  const subId = attrs.subscription_id !== undefined ? String(attrs.subscription_id) : null;
  const lsOrderId = event.startsWith("order_") ? String(payload.data.id) : null;

  // ── Idempotency: dedupe by event_id ─────────────────────────────────────
  const dupe = await getWebhookEventByEventId(env.DB, eventId);
  if (dupe) {
    console.log(`[webhook] duplicate event ${eventId} (${event}) — skipped`);
    // Preserve old API contract for order_created: callers expected
    // { ok: true, already_confirmed: true } when the same order webhook is
    // delivered twice. Phase 2 dedup happens earlier (event_id) so we surface
    // both keys to keep downstream tooling working.
    if (event === "order_created") {
      return json({ ok: true, already_confirmed: true, deduped: true, event });
    }
    return json({ ok: true, deduped: true, event });
  }

  // Insert event record first (in-flight). Result will be updated at the end.
  const inserted = await insertWebhookEvent(env.DB, {
    event_id: eventId,
    event_name: event,
    ls_test_mode: lsTestMode,
    signature_valid: sigValid,
    ls_subscription_id: subId,
    ls_order_id: lsOrderId,
    payload_json: body,
  });
  if (!inserted) {
    // Rare race: another request inserted between our SELECT and INSERT
    console.log(`[webhook] race-deduped ${eventId}`);
    return json({ ok: true, deduped: true, event });
  }

  let resultStatus = "ok";
  let errorMessage: string | undefined;
  let resolvedCustomerId: string | undefined;

  try {
    // ── order_created: variant validation + payment confirmation ──────────
    if (event === "order_created") {
      // Variant validation
      const variantMap = parseVariantMap(env.VARIANT_TIER_MAP || "{}");
      const variantId = attrs.first_order_item?.variant_id !== undefined
        ? String(attrs.first_order_item.variant_id)
        : undefined;
      const totalCents = typeof attrs.total === "number" ? attrs.total : undefined;
      const currency = attrs.currency;

      const validation = validateVariant(variantMap, variantId, totalCents, currency);
      if (!validation.ok) {
        // Don't fail-close in soft-launch with placeholder variant map.
        // If variant_map is empty, log+warn and proceed. Otherwise reject.
        if (Object.keys(variantMap).length === 0) {
          console.log(`[webhook] order_created variant validation skipped — empty VARIANT_TIER_MAP`);
        } else {
          resultStatus = `rejected_${validation.reason}`;
          errorMessage = JSON.stringify({ expected: validation.expected, actual: validation.actual });
          // Fire-and-forget: notification must NOT block webhook response
          void notifyOwner(
            env.OWNER_TELEGRAM_BOT_TOKEN,
            env.OWNER_TELEGRAM_CHAT_ID,
            formatVariantMismatchAlert(eventId, validation.reason ?? "?", validation.expected, validation.actual),
          );
          return json({ rejected: validation.reason, expected: validation.expected, actual: validation.actual }, 400);
        }
      }

      if (!internalOrderId) {
        resultStatus = "missing_internal_order_id";
        errorMessage = "Payment received without custom_data.order_id";
        return json({ warning: "No order_id in custom_data" });
      }

      const existing = await getJobById(env.DB, internalOrderId);
      if (!existing) {
        resultStatus = "order_not_found";
        errorMessage = `Order ${internalOrderId} not found in D1`;
        return json({ warning: errorMessage });
      }

      const confirmed = await confirmPayment(env.DB, internalOrderId, "lemon_squeezy");
      if (!confirmed) {
        return json({ ok: true, already_confirmed: true });
      }

      // Link LS identity for future lifecycle events. Customer record may
      // not yet exist (api_usage created later by Pi5 deployer) — link is
      // best-effort here; deployer should also set ls_* on creation.
      resolvedCustomerId = internalOrderId;
      const usage = await getUsageByCustomerId(env.DB, internalOrderId);
      if (usage) {
        await linkLsIdentity(env.DB, internalOrderId, {
          ls_order_id: lsOrderId,
          ls_subscription_id: subId,
          ls_customer_id: attrs.customer_id !== undefined ? String(attrs.customer_id) : null,
          ls_variant_id: variantId ?? null,
          ls_status: "active",
        });
      }

      await writeAuditLog(env.DB, {
        action: "order_confirmed",
        customer_id: internalOrderId,
        details: JSON.stringify({ event_id: eventId, variant_id: variantId, total_cents: totalCents }),
      });
      return json({ ok: true, order_id: confirmed.id, status: confirmed.status });
    }

    // ── subscription_payment_success (renewal) ───────────────────────────
    if (event === "subscription_payment_success") {
      const customer = await resolveCustomer(env, payload);
      if (!customer) {
        resultStatus = "customer_not_found";
        return json({ ok: true, warning: "Customer not found for renewal", event });
      }
      resolvedCustomerId = customer.customer_id;
      // Renewal: clear failed-payment state if any
      if (customer.payment_failed_at) {
        await clearPaymentFailed(env.DB, customer.customer_id);
        await writeAuditLog(env.DB, {
          action: "payment_recovered",
          customer_id: customer.customer_id,
          details: JSON.stringify({ event_id: eventId, was_failed_at: customer.payment_failed_at }),
        });
      }
      return json({ ok: true, event, action: "renewal_logged" });
    }

    // ── subscription_payment_failed ──────────────────────────────────────
    if (event === "subscription_payment_failed") {
      const customer = await resolveCustomer(env, payload);
      if (!customer) {
        resultStatus = "customer_not_found";
        return json({ ok: true, warning: "Customer not found for payment_failed", event });
      }
      resolvedCustomerId = customer.customer_id;
      const updated = await setPaymentFailed(env.DB, customer.customer_id);
      const days = updated?.payment_failed_at ? daysSince(updated.payment_failed_at) : 0;

      // Day-3 enforcement: budget→0 if not yet
      if (days >= 3 && (updated?.monthly_budget_hkd ?? 1) > 0) {
        await updateUsageBudget(env.DB, customer.customer_id, 0);
        await setBlocked(env.DB, customer.customer_id);
      }

      // Fire-and-forget: notification must NOT block webhook response
      void notifyOwner(
        env.OWNER_TELEGRAM_BOT_TOKEN,
        env.OWNER_TELEGRAM_CHAT_ID,
        formatPaymentFailedAlert(customer.customer_id, days),
      );
      await writeAuditLog(env.DB, {
        action: "payment_failed",
        customer_id: customer.customer_id,
        details: JSON.stringify({ event_id: eventId, day: days }),
      });
      return json({ ok: true, event, day: days, action: days >= 3 ? "budget_zeroed" : "alerted_only" });
    }

    // ── subscription_cancelled / subscription_expired ────────────────────
    if (event === "subscription_cancelled" || event === "subscription_expired") {
      const customer = await resolveCustomer(env, payload);
      if (customer) {
        resolvedCustomerId = customer.customer_id;
        const newStatus = event === "subscription_cancelled" ? "cancelled" : "expired";
        await setSubscriptionStatus(env.DB, customer.customer_id, newStatus, attrs.ends_at ?? undefined);
        await writeAuditLog(env.DB, {
          action: newStatus,
          customer_id: customer.customer_id,
          details: JSON.stringify({ event_id: eventId, ls_subscription_id: subId, ends_at: attrs.ends_at }),
        });
      }

      // Legacy support: also create a cancel job via internal order_id
      if (!internalOrderId) {
        return json({ ok: true, event, action: "subscription_status_updated", warning: "no internal order_id" });
      }
      const existing = await getJobById(env.DB, internalOrderId);
      if (!existing) {
        return json({ ok: true, event, action: "subscription_status_updated", warning: `internal order ${internalOrderId} not found` });
      }
      const cancelJobId = `cancel_${internalOrderId}_${Date.now()}`;
      const now = new Date().toISOString();
      try {
        await env.DB.prepare(
          `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, bot_token, bot_username, payment_method, created_at, updated_at)
           VALUES (?, 'ready', 'cancel', ?, ?, ?, ?, ?, ?, 'lemon_squeezy', ?, ?)`,
        ).bind(
          cancelJobId, existing.tier, existing.display_name || internalOrderId,
          existing.telegram_user_id || "", existing.email || "",
          existing.bot_token || "", existing.bot_username || "",
          now, now,
        ).run();
      } catch (e) {
        resultStatus = "cancel_job_insert_failed";
        errorMessage = String(e).slice(0, 200);
        return json({ error: "Failed to create cancel job", event });
      }
      return json({ ok: true, event, cancel_job_id: cancelJobId });
    }

    // ── subscription_payment_refunded / order_refunded ───────────────────
    if (event === "subscription_payment_refunded" || event === "order_refunded") {
      const customer = await resolveCustomer(env, payload);
      if (!customer) {
        resultStatus = "customer_not_found";
        return json({ ok: true, warning: "Customer not found for refund", event });
      }
      resolvedCustomerId = customer.customer_id;
      // Budget→0 + block immediately
      await updateUsageBudget(env.DB, customer.customer_id, 0);
      await setBlocked(env.DB, customer.customer_id);
      await setSubscriptionStatus(env.DB, customer.customer_id, "refunded", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      const refundAmount = typeof attrs.refunded_amount === "number"
        ? attrs.refunded_amount
        : typeof attrs.amount === "number"
        ? attrs.amount
        : undefined;

      // Fire-and-forget: notification must NOT block webhook response
      void notifyOwner(
        env.OWNER_TELEGRAM_BOT_TOKEN,
        env.OWNER_TELEGRAM_CHAT_ID,
        formatRefundAlert(customer.customer_id, customer.ls_subscription_id ?? undefined, refundAmount),
      );
      await writeAuditLog(env.DB, {
        action: "refund_processed",
        customer_id: customer.customer_id,
        details: JSON.stringify({ event_id: eventId, ls_subscription_id: subId, amount_cents: refundAmount }),
      });
      return json({ ok: true, event, action: "refund_handled", schedule_cancel: "within_24h" });
    }

    // ── subscription_updated — log only ──────────────────────────────────
    if (event === "subscription_updated") {
      const customer = await resolveCustomer(env, payload);
      if (customer && attrs.status) {
        resolvedCustomerId = customer.customer_id;
        await setSubscriptionStatus(env.DB, customer.customer_id, attrs.status, attrs.ends_at ?? undefined);
      }
      return json({ ok: true, event, action: "logged" });
    }

    // ── unknown / ignored event ──────────────────────────────────────────
    return json({ ignored: true, event });
  } catch (err) {
    resultStatus = "error";
    errorMessage = String(err).slice(0, 500);
    console.log(`[webhook] handler error: ${err}`);
    return json({ error: "Internal handler error", event }, 500);
  } finally {
    // Always record the result, even on early returns / errors
    await updateWebhookEventResult(env.DB, eventId, resultStatus, errorMessage, resolvedCustomerId).catch((e) => {
      console.log(`[webhook] failed to update event result: ${e}`);
    });
  }
}
