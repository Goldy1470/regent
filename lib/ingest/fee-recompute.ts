/**
 * Fee-recompute engine (pure). Input: settlement rows whose columns were
 * mapped by lib/ingest/mapping.ts. Output: overcharge evidence, each item
 * citing the rule/rate-card line that triggered it. Never promises recovery —
 * it only shows the delta between expected (rate card) and charged (export).
 */
import { policyForDate, refundAdminFee, referralPercent, round2 } from "../policy/rate-card";

export type SettlementRow = {
  order_id: string;
  settlement_id: string;
  settle_date: string; // ISO
  type: string; // normalized TYPE: "item" | "referral" | "refund_admin" | "return_label" | "shipping" | "refund" | "other"
  description: string;
  amount: number; // negative = charge to seller (as exported)
  sku: string | null;
  category?: string | null;
  quantity: number;
};

export type FeeAnomaly = {
  order_id: string;
  settlement_id: string;
  fee_type: string; // "referral" | "refund_admin" | "return_cost" | "shipping"
  expected: number;
  charged: number;
  delta: number;
  citation: string; // which policy entry / rule produced "expected"
  settle_date: string;
};

export type AuditResult = {
  policy_version: string;
  months: string[]; // YYYY-MM covered
  leaked_total: number;
  anomalies: FeeAnomaly[];
  checked_rows: number;
  skipped_rows: number;
};

const TYPE_ALIASES: Record<string, string> = {
  item: "item",
  product: "item",
  "product sales": "item",
  subtotal: "item",
  "settlement subtotal": "item",
  referral: "referral",
  "referral fee": "referral",
  commission: "referral",
  "commission fee": "referral",
  "refund admin": "refund_admin",
  "refund administration fee": "refund_admin",
  "refaund admin fee": "refund_admin",
  "return admin": "refund_admin",
  "return admin fee": "refund_admin",
  "return admin. fee": "refund_admin",
  shipping: "shipping",
  "shipping fee": "shipping",
  "shipping subsidy": "shipping",
  "seller shipping": "shipping",
  "return shipping": "return_label",
  "return label fee": "return_label",
  "return cost": "return_label",
  "return label": "return_label",
  refund: "refund",
  "full refund": "refund",
  "refund amount": "refund",
};

export function normalizeType(raw: string): string {
  const t = (raw ?? "").toString().trim().toLowerCase();
  if (TYPE_ALIASES[t]) return TYPE_ALIASES[t];
  if (t.includes("referral") || t.includes("comission") || t.includes("commission")) return "referral";
  if (t.includes("admin") && (t.includes("refund") || t.includes("return"))) return "refund_admin";
  if (t.includes("return")) return "return_label";
  if (t.includes("shipping") || t.includes("ship") || t.includes("logistics")) return "shipping";
  if (t.includes("refund")) return "refund";
  if (t.includes("item") || t.includes("product")) return "item";
  return "other";
}

/** Parse "-$12.30", "$12.30-", "(12.30)", "12.30 USD" → signed number. Sellers keep what's positive. */
export function parseMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) sign = -1;
  s = s.replace(/[()]/g, "");
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  } else if (s.endsWith("-")) {
    sign = -1;
    s = s.slice(0, -1);
  }
  s = s.replace(/[^0-9.,]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? sign * n : null;
}

/**
 * Core pass. Strategy per order group:
 *  - referral: expected = gross item line amount * rate; flagged if |charged - expected| > 1c
 *  - refund_admin: per returned order, expected = min(20% of referral among that order's returns, $5/SKU)
 *  - return_label + shipping: row-by-row context; flag if a buyer-remorse return label
 *    was charged to the seller (2026 split says buyer pays) — evidence only.
 *  - refund row anchors which order had a return (its negative amount is the refund to buyer).
 */
export function auditSettlement(rows: SettlementRow[], category?: string): AuditResult {
  const byOrder = new Map<string, SettlementRow[]>();
  for (const r of rows) {
    if (!byOrder.has(r.order_id)) byOrder.set(r.order_id, []);
    byOrder.get(r.order_id)!.push(r);
  }

  const anomalies: FeeAnomaly[] = [];
  let checked = 0;
  let skipped = 0;
  const months = new Set<string>();

  const groups = Array.from(byOrder.entries());
  for (const [orderId, group] of groups) {
    const itemLines = group.filter((g) => g.type === "item");
    if (!itemLines.length) {
      skipped += group.length;
      continue;
    }
    const settleDate = group[0].settle_date;
    const policy = policyForDate(settleDate);
    months.add(settleDate.slice(0, 7));

    // 1) referral lines
    const referralLines = group.filter((g) => g.type === "referral");
    const gross = itemLines.reduce((a, g) => a + g.amount, 0);
    if (referralLines.length) {
      checked += referralLines.length;
      const charged = round2(Math.abs(referralLines.reduce((a, g) => a + g.amount, 0)));
      const expected = round2((gross * referralPercent(policy, category ?? itemLines[0].category)) / 100);
      // Only flag overcharges. Undercharges (rare) are logged as skipped evidence, not leaks.
      if (charged - expected >= 0.01) {
        anomalies.push({
          order_id: orderId,
          settlement_id: group[0].settlement_id,
          fee_type: "referral",
          expected,
          charged,
          delta: round2(charged - expected),
          citation: `Policy ${policy.id}: referral fee ${
            referralPercent(policy, category ?? itemLines[0].category)
          }% on gross item amount $${round2(gross)} (referral tiers table)`,
          settle_date: settleDate,
        });
      }
    } else if (gross > 0) {
      // missing referral entirely = structure different exports (combined rows)
      skipped += group.length - itemLines.length;
      continue;
    }

    // 2) refund admin fee: cap $5/SKU, 20% of the referral on refunded items
    const refundLines = group.filter((g) => g.type === "refund");
    const adminLines = group.filter((g) => g.type === "refund_admin");
    if (refundLines.length && adminLines.length) {
      checked += adminLines.length;
      // scale the refund by its share of total item gross to estimate the refunded unit amount
      const refundTotal = Math.abs(refundLines.reduce((a, g) => a + g.amount, 0));
      const perLine = itemLines.length ? refundTotal / itemLines.length : refundTotal;
      const expected = refundAdminFee(policy, Math.min(perLine, refundTotal), category ?? itemLines[0].category);
      const charged = round2(Math.abs(adminLines.reduce((a, g) => a + g.amount, 0)));
      if (charged - expected >= 0.5) {
        anomalies.push({
          order_id: orderId,
          settlement_id: group[0].settlement_id,
          fee_type: "refund_admin",
          expected,
          charged,
          delta: round2(charged - expected),
          citation: `Policy ${policy.id}: refund admin fee = ${policy.rate_card.refund_admin.percent_of_referral * 100}% of the refunded item's referral fee, capped at $${policy.rate_card.refund_admin.cap_per_sku_usd.toFixed(2)} per SKU`,
          settle_date: settleDate,
        });
      }
    }

    // 3) buyer-remorse return labels billed to seller (2026 split: buyer pays)
    const returnLabels = group.filter((g) => g.type === "return_label");
    if (returnLabels.length && refundLines.length) {
      checked += returnLabels.length;
      for (const rl of returnLabels) {
        if (rl.amount < -4.5) {
          anomalies.push({
            order_id: orderId,
            settlement_id: rl.settlement_id,
            fee_type: "return_cost",
            expected: 0,
            charged: round2(Math.abs(rl.amount)),
            delta: round2(Math.abs(rl.amount)),
            citation: `Policy ${policy.id}: buyer-remorse return shipping is paid by the buyer; a $${
              round2(Math.abs(rl.amount))
            } label was billed to the seller — evidence for a return-cost dispute`,
            settle_date: settleDate,
          });
        }
      }
    }

    // 4) shipping double-charge: two+ shipping/subsidy lines where one repeats another.
    const shipping = group.filter((g) => g.type === "shipping");
    if (shipping.length > 1) {
      checked += shipping.length;
      const negatives = shipping
        .filter((g: SettlementRow) => g.amount < 0)
        .map((g: SettlementRow) => g.amount)
        .sort((a: number, b: number) => b - a);
      // The least-negative line is treated as the legitimate charge; the rest are duplicates.
      const legitimate: number = negatives[0];
      const duplicate: number = negatives.slice(1).reduce((a: number, x: number) => a + x, 0);
      if (duplicate < -1) {
        anomalies.push({
          order_id: orderId,
          settlement_id: group[0].settlement_id,
          fee_type: "shipping",
          expected: round2(Math.abs(legitimate)),
          charged: round2(Math.abs(legitimate) + Math.abs(duplicate)),
          delta: round2(Math.abs(duplicate)),
          citation: `Order ${orderId}: ${shipping.length} shipping/subsidy lines — $${round2(Math.abs(duplicate))} looks like a duplicate shipping deduction`,
          settle_date: settleDate,
        });
      }
    }
  }

  const leaked_total = round2(
    anomalies.reduce((a, x) => a + (x.fee_type === "referral" ? Math.abs(x.delta) : x.delta), 0)
  );

  return {
    policy_version: (policyForDate(new Date().toISOString()) ).id,
    months: Array.from(months).sort(),
    leaked_total,
    anomalies: anomalies.sort((a, b) => b.delta - a.delta),
    checked_rows: checked,
    skipped_rows: skipped,
  };
}
