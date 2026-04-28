// Owner Telegram notifications from CF Worker
//
// Sends messages to OWNER_TELEGRAM_CHAT_ID via OWNER_TELEGRAM_BOT_TOKEN.
// All sends are best-effort — Telegram failures must NOT block webhook
// handling. Errors are logged for review but never thrown.

export async function notifyOwner(
  botToken: string | undefined,
  chatId: string | undefined,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!botToken || !chatId) {
    console.log("[notify] skipped — missing OWNER_TELEGRAM_BOT_TOKEN or OWNER_TELEGRAM_CHAT_ID");
    return { ok: false, error: "missing_credentials" };
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
      // Telegram occasionally lags; cap at 5s so we don't tie up worker
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.log(`[notify] Telegram ${resp.status}: ${body.slice(0, 200)}`);
      return { ok: false, error: `telegram_${resp.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.log(`[notify] error: ${err}`);
    return { ok: false, error: String(err).slice(0, 200) };
  }
}

export function formatVariantMismatchAlert(
  eventId: string,
  reason: string,
  expected?: { tier: number; cycle: string; amount_cents: number },
  actual?: { variant_id?: string; total_cents?: number; currency?: string },
): string {
  return [
    "<b>⚠️ LS Webhook Rejected — Variant Mismatch</b>",
    `Event ID: <code>${eventId.slice(0, 16)}...</code>`,
    `Reason: <code>${reason}</code>`,
    expected ? `Expected: T${expected.tier} ${expected.cycle} HK$${expected.amount_cents / 100}` : "",
    actual ? `Got: variant=<code>${actual.variant_id}</code> total=${actual.total_cents !== undefined ? `HK$${actual.total_cents / 100}` : "?"} currency=${actual.currency ?? "?"}` : "",
    "",
    "Job NOT marked ready. Investigate before manual approval.",
  ].filter(Boolean).join("\n");
}

export function formatPaymentFailedAlert(
  customerId: string,
  daysSinceFirstFail: number,
): string {
  if (daysSinceFirstFail === 0) {
    return [
      "<b>💳 Customer Payment Failed</b>",
      `Customer: <code>${customerId}</code>`,
      "First fail today. Email sent to customer.",
      "Day 3 → budget→0. Day 7 → schedule VPS cancel.",
    ].join("\n");
  }
  return [
    `<b>💳 Customer Payment Failed (Day ${daysSinceFirstFail})</b>`,
    `Customer: <code>${customerId}</code>`,
    daysSinceFirstFail >= 7 ? "Scheduled for VPS cancellation." : daysSinceFirstFail >= 3 ? "Budget set to 0." : "Continuing grace period.",
  ].join("\n");
}

export function formatRefundAlert(
  customerId: string,
  lsSubscriptionId: string | undefined,
  amount_cents: number | undefined,
): string {
  return [
    "<b>↩️ Refund Processed</b>",
    `Customer: <code>${customerId}</code>`,
    lsSubscriptionId ? `LS subscription: <code>${lsSubscriptionId}</code>` : "",
    amount_cents !== undefined ? `Amount: HK$${amount_cents / 100}` : "",
    "Customer budget set to 0. VPS cancellation scheduled within 24h.",
  ].filter(Boolean).join("\n");
}
