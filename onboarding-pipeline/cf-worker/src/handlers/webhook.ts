import { Env } from "../lib/types";
import { verifyLemonSqueezySignature } from "../lib/hmac";
import {
  confirmPayment,
  getJobById,
  getJobByLsSubscriptionId,
  getJobByLsOrderId,
  getWebhookEventByEventId,
  insertWebhookEvent,
  updateWebhookEventResult,
  getUsageBySubscriptionId,
  getUsageByLsOrderId,
  getUsageByLsCustomerId,
  getUsageByCustomerId,
  linkLsIdentity,
  linkJobLsIdentity,
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
// Helper: derive a stable event id, preferring header → body → body hash
//
// Codex Round 4 #4: synthetic id `synth:event_name:data.id` would collapse
// distinct renewals (same subscription_id) into a single dedup. Replaced
// with SHA-256 of the raw body — guaranteed unique per delivery payload,
// so re-deliveries of the SAME body still dedupe.
// ─────────────────────────────────────────────────────────────────────────────

async function deriveEventId(request: Request, payload: LemonSqueezyWebhook, rawBody: string): Promise<string> {
  const header = request.headers.get("X-Event-Id");
  if (header) return header;
  if (payload.meta.event_id) return payload.meta.event_id;

  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `bodyhash:${hex.slice(0, 32)}`;
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

  // 1. api_usage by subscription_id (most reliable for subscription_* events,
  //    only works once Pi5 deployer has created the api_usage row)
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

  // 2. Fallback via jobs row → resolve internal customer_id, then api_usage
  //    Covers the window between order_created and api_usage creation.
  if (subId) {
    const job = await getJobByLsSubscriptionId(env.DB, subId);
    if (job) {
      const u = await getUsageByCustomerId(env.DB, job.id);
      if (u) return u;
    }
  }
  if (lsOrderId) {
    const job = await getJobByLsOrderId(env.DB, lsOrderId);
    if (job) {
      const u = await getUsageByCustomerId(env.DB, job.id);
      if (u) return u;
    }
  }

  // 3. Last resort: caller-supplied internal order id
  if (internalOrderId) {
    const u = await getUsageByCustomerId(env.DB, internalOrderId);
    if (u) return u;
  }
  return null;
}

/**
 * Helper: insert a cancel job for a given internal order id (idempotent-ish —
 * timestamp suffix prevents PK collision). Returns the cancel job id.
 */
async function createCancelJob(env: Env, internalOrderId: string, reason: string): Promise<string | null> {
  const existing = await getJobById(env.DB, internalOrderId);
  if (!existing) return null;
  const cancelJobId = `cancel_${internalOrderId}_${Date.now()}`;
  const now = new Date().toISOString();
  // The bot_token + bot_username UNIQUE constraint forces us to suffix the
  // cancel job's values so they don't collide with the original order. The
  // deployer already keys actions off jobs.id + jobs.job_type, not bot_*.
  const suffix = `__cancel_${Date.now()}`;
  try {
    await env.DB.prepare(
      `INSERT INTO jobs (id, status, job_type, tier, display_name, telegram_user_id, email, bot_token, bot_username, payment_method, error_log, created_at, updated_at)
       VALUES (?, 'ready', 'cancel', ?, ?, ?, ?, ?, ?, 'lemon_squeezy', ?, ?, ?)`,
    ).bind(
      cancelJobId, existing.tier, existing.display_name || internalOrderId,
      existing.telegram_user_id || "", existing.email || "",
      (existing.bot_token || cancelJobId) + suffix, (existing.bot_username || cancelJobId) + suffix,
      reason, now, now,
    ).run();
    return cancelJobId;
  } catch (e) {
    console.log(`[webhook] createCancelJob failed: ${e}`);
    return null;
  }
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
  const eventId = await deriveEventId(request, payload, body);
  const attrs = payload.data.attributes;
  const lsTestMode = Boolean(payload.meta.test_mode ?? attrs.test_mode);
  const internalOrderId = payload.meta.custom_data?.order_id;
  const subId = attrs.subscription_id !== undefined ? String(attrs.subscription_id) : null;
  const lsOrderId = event.startsWith("order_") ? String(payload.data.id) : null;
  const lsCustomerId = attrs.customer_id !== undefined ? String(attrs.customer_id) : null;
  const variantId = attrs.first_order_item?.variant_id !== undefined
    ? String(attrs.first_order_item.variant_id)
    : (attrs.variant_id !== undefined ? String(attrs.variant_id) : null);

  // ── Production test_mode rejection (Codex Round 4 #9) ──────────────────
  // LS test webhooks must NOT be processed by production worker. Set
  // ALLOW_TEST_MODE_IN_PROD="1" only when intentionally driving E2E tests.
  if (lsTestMode && env.ALLOW_TEST_MODE_IN_PROD !== "1") {
    console.log(`[webhook] ${event}: rejecting test_mode webhook in prod`);
    // Still record for audit, then return 400
    await insertWebhookEvent(env.DB, {
      event_id: eventId,
      event_name: event,
      ls_test_mode: true,
      signature_valid: sigValid,
      ls_subscription_id: subId,
      ls_order_id: lsOrderId,
      payload_json: body,
      result_status: "rejected_test_mode_in_prod",
    }).catch(() => {});
    return json({ rejected: "test_mode_in_prod", event }, 400);
  }

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
      const totalCents = typeof attrs.total === "number" ? attrs.total : undefined;
      const currency = attrs.currency;

      const validation = validateVariant(variantMap, variantId ?? undefined, totalCents, currency);
      if (!validation.ok) {
        const strict = env.VARIANT_VALIDATION_STRICT === "1";
        const mapEmpty = Object.keys(variantMap).length === 0;
        if (mapEmpty || !strict) {
          // Soft mode (Codex Round 4 #3) — log + proceed. Owner gets a single
          // alert per variant problem so prod isn't silent during soft launch.
          console.log(`[webhook] order_created soft-validation: ${validation.reason} (strict=${strict}, map_empty=${mapEmpty})`);
          void notifyOwner(
            env.OWNER_TELEGRAM_BOT_TOKEN,
            env.OWNER_TELEGRAM_CHAT_ID,
            `<b>ℹ️ LS variant soft-validate</b>\nReason: <code>${validation.reason}</code>\nVariant: <code>${variantId ?? "?"}</code>\nTotal cents: ${totalCents ?? "?"}\nMode: ${strict ? "strict" : "lenient"}, map ${mapEmpty ? "EMPTY" : "set"}\nProceeding because not strict / map empty.`,
          );
        } else {
          resultStatus = `rejected_${validation.reason}`;
          errorMessage = JSON.stringify({ expected: validation.expected, actual: validation.actual });
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

      resolvedCustomerId = internalOrderId;

      // Codex Round 4 #1: persist LS identity on the JOBS row at order_created.
      // api_usage doesn't yet exist — Pi5 deployer creates it later via
      // POST /api/usage, which inherits ls_* from this jobs row.
      await linkJobLsIdentity(env.DB, internalOrderId, {
        ls_order_id: lsOrderId,
        ls_subscription_id: subId,
        ls_customer_id: lsCustomerId,
        ls_variant_id: variantId,
        ls_test_mode: lsTestMode,
      });

      // Best-effort: also link to api_usage if a row already exists (rare,
      // but happens when deploy completed before webhook arrived)
      const usage = await getUsageByCustomerId(env.DB, internalOrderId);
      if (usage) {
        await linkLsIdentity(env.DB, internalOrderId, {
          ls_order_id: lsOrderId,
          ls_subscription_id: subId,
          ls_customer_id: lsCustomerId,
          ls_variant_id: variantId,
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
      let internalId = internalOrderId;
      if (customer) {
        resolvedCustomerId = customer.customer_id;
        internalId = internalId ?? customer.customer_id;
        const newStatus = event === "subscription_cancelled" ? "cancelled" : "expired";
        await setSubscriptionStatus(env.DB, customer.customer_id, newStatus, attrs.ends_at ?? undefined);
        await writeAuditLog(env.DB, {
          action: newStatus,
          customer_id: customer.customer_id,
          details: JSON.stringify({ event_id: eventId, ls_subscription_id: subId, ends_at: attrs.ends_at }),
        });
      } else if (subId) {
        // No api_usage row yet — try resolving via jobs.ls_subscription_id
        const job = await getJobByLsSubscriptionId(env.DB, subId);
        if (job) internalId = job.id;
      }

      if (!internalId) {
        return json({ ok: true, event, action: "subscription_status_updated", warning: "no internal order id resolved" });
      }
      const cancelJobId = await createCancelJob(env, internalId, `${event}: event_id=${eventId}`);
      if (!cancelJobId) {
        resultStatus = "cancel_job_insert_failed";
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
      // Budget→0 + block immediately. Refund means service ends NOW (Codex Round 4 #6).
      await updateUsageBudget(env.DB, customer.customer_id, 0);
      await setBlocked(env.DB, customer.customer_id);
      const nowIso = new Date().toISOString();
      await setSubscriptionStatus(env.DB, customer.customer_id, "refunded", nowIso);

      // Codex Round 4 #6: refund must actually CREATE a cancel job, not just
      // log "scheduled within 24h". Cancel ASAP. Customer is paid out.
      const cancelJobId = await createCancelJob(env, customer.customer_id, `refund: event_id=${eventId}`);

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
        details: JSON.stringify({ event_id: eventId, ls_subscription_id: subId, amount_cents: refundAmount, cancel_job_id: cancelJobId }),
      });
      return json({ ok: true, event, action: "refund_handled", cancel_job_id: cancelJobId });
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
