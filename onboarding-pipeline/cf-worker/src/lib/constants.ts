// Phase 2 — payment integrity constants
//
// LS variant validation works by comparing webhook payload's variant_id +
// total to a known-good map. The map lives in env var VARIANT_TIER_MAP as
// JSON; this module parses and validates it.
//
// User MUST update VARIANT_TIER_MAP in wrangler.toml (or via wrangler secret)
// once real LS variant IDs are known. Until then, validation falls back to
// "warn but accept" mode controlled by VARIANT_VALIDATION_STRICT (default off).

export interface VariantInfo {
  tier: number;                     // 1, 2, or 3
  cycle: "monthly" | "quarterly" | "annual";
  amount_cents: number;             // expected total per billing cycle in HKD cents
  monthly_equivalent_hkd: number;   // for display/logging
}

// Canonical tier prices per CLAUDE.md (2026-04-28)
//   Tier 1 Starter:  $248/m, $188/m × 3 = $564 quarterly, $158/m × 12 = $1896 annual
//   Tier 2 Pro:      $398/m, $298/m × 3 = $894 quarterly, $248/m × 12 = $2976 annual
//   Tier 3 Elite:    $598/m, $458/m × 3 = $1374 quarterly, $388/m × 12 = $4656 annual
//
// Used as oracle when validating LS webhook total.
export const EXPECTED_PRICES_HKD_CENTS: Record<string, number> = {
  "1:monthly":   24800,
  "1:quarterly": 56400,
  "1:annual":    189600,
  "2:monthly":   39800,
  "2:quarterly": 89400,
  "2:annual":    297600,
  "3:monthly":   59800,
  "3:quarterly": 137400,
  "3:annual":    465600,
};

export function expectedAmountCents(tier: number, cycle: string): number | null {
  const key = `${tier}:${cycle}`;
  return EXPECTED_PRICES_HKD_CENTS[key] ?? null;
}

export interface VariantMap {
  [variant_id: string]: VariantInfo;
}

/**
 * Parse VARIANT_TIER_MAP env var.
 *
 * Accepts two shapes for backward-compat:
 *   1. Legacy: { "var_xxx": 2 }                            → tier only, cycle/amount unknown
 *   2. New:    { "var_xxx": { tier, cycle, amount_cents } } → full info
 *
 * Returns map of variant_id → VariantInfo. Legacy shape gets cycle="monthly" + amount_cents from EXPECTED_PRICES_HKD_CENTS.
 */
export function parseVariantMap(rawJson: string): VariantMap {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {};
  }
  const out: VariantMap = {};
  for (const [variantId, value] of Object.entries(parsed)) {
    if (typeof value === "number") {
      // Legacy shape — assume monthly
      const cents = expectedAmountCents(value, "monthly");
      out[variantId] = {
        tier: value,
        cycle: "monthly",
        amount_cents: cents ?? 0,
        monthly_equivalent_hkd: cents ? cents / 100 : 0,
      };
    } else if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      const tier = typeof v.tier === "number" ? v.tier : 0;
      const cycle = (typeof v.cycle === "string" ? v.cycle : "monthly") as VariantInfo["cycle"];
      const amount_cents = typeof v.amount_cents === "number" ? v.amount_cents : (expectedAmountCents(tier, cycle) ?? 0);
      const monthly_equivalent_hkd = cycle === "monthly"
        ? amount_cents / 100
        : cycle === "quarterly"
        ? amount_cents / 100 / 3
        : amount_cents / 100 / 12;
      out[variantId] = { tier, cycle, amount_cents, monthly_equivalent_hkd };
    }
  }
  return out;
}

export interface VariantValidationResult {
  ok: boolean;
  reason?: string;
  expected?: VariantInfo;
  actual?: { variant_id: string; total_cents?: number; currency?: string };
}

/**
 * Validate an incoming LS order_created event against expected variant map.
 *
 * Checks:
 *  - variant_id is in the map (known variant)
 *  - total matches expected amount_cents (within ±0)
 *  - currency is HKD
 *
 * Returns ok=false with reason on any mismatch. Caller decides whether to
 * reject (strict mode) or warn-and-accept (lenient mode for soft launch).
 */
export function validateVariant(
  variantMap: VariantMap,
  variant_id: string | undefined,
  total_cents: number | undefined,
  currency: string | undefined,
): VariantValidationResult {
  if (!variant_id) {
    return { ok: false, reason: "missing_variant_id" };
  }
  const expected = variantMap[variant_id];
  if (!expected) {
    return { ok: false, reason: "unknown_variant", actual: { variant_id, total_cents, currency } };
  }
  if (total_cents !== undefined && total_cents !== expected.amount_cents) {
    return {
      ok: false,
      reason: "amount_mismatch",
      expected,
      actual: { variant_id, total_cents, currency },
    };
  }
  if (currency !== undefined && currency !== "HKD") {
    return {
      ok: false,
      reason: "currency_mismatch",
      expected,
      actual: { variant_id, total_cents, currency },
    };
  }
  return { ok: true, expected };
}
