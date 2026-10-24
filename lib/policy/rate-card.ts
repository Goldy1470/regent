/**
 * VERSIONED TikTok Shop US policy data. Text policies change often — the rate
 * card below is DATA, not hardcoded prose in business logic. When TikTok
 * changes a fee or a rule, add a NEW version entry (never mutate the old one)
 * with an effective_from, and point the audit engine at the right snapshot for
 * each settlement date. See /docs/policy-versions.md.
 */

export const COLLECTION = "US_MAINLAND" as const;

export type ReferralTier = {
  /** Product category slug (lowercase). "__default__" catches the rest. */
  category: string;
  percent: number;
};

export type PolicyVersion = {
  id: string;
  region: string;
  effective_from: string; // ISO date, inclusive
  effective_to: string | null; // ISO date, exclusive; null = current
  notes: string;
  rate_card: {
    /** Referral fee taken on each settled gross item amount. */
    referral: ReferralTier[];
    /** Refund admin fee: percent of the refunded item's referral fee,
     *  capped per SKU per refund. Feb 2025 rule, still current Aug 2026. */
    refund_admin: {
      percent_of_referral: number;
      cap_per_sku_usd: number;
      applies_to: "returned_orders";
    };
    /** Who pays return shipping. TikTok changed the default split in 2026. */
    return_shipping: {
      buyer_remorse_paid_by: "buyer" | "seller";
      seller_fault_paid_by: "seller";
      label_deduction_usd: number | null; // per return label cost deducted
    };
  };
};

export const POLICIES: PolicyVersion[] = [
  {
    id: "US-2026-08",
    region: COLLECTION,
    effective_from: "2026-08-01",
    effective_to: null,
    notes: "Referral fee standard 6% (was 8%). Refund admin fee = 20% of the refunded item's referral fee, capped at $5 per SKU. Return-cost split changes applied in 2026.",
    rate_card: {
      referral: [
        { category: "__default__", percent: 6 },
        { category: "beauty", percent: 6 },
        { category: "fashion", percent: 6 },
        { category: "home", percent: 6 },
        { category: "collectibles", percent: 15 },
        { category: "luxury", percent: 15 },
      ],
      refund_admin: {
        percent_of_referral: 0.2,
        cap_per_sku_usd: 5,
        applies_to: "returned_orders",
      },
      return_shipping: {
        buyer_remorse_paid_by: "buyer",
        seller_fault_paid_by: "seller",
        label_deduction_usd: null,
      },
    },
  },
  {
    id: "US-2026-07",
    region: COLLECTION,
    effective_from: "2025-02-01",
    effective_to: "2026-08-01",
    notes: "Referral fee standard 8% (TikTok's own reports mismatched 6% during the transition — audit the actual settled lines). Refund admin fee = 20% of referral, capped $5 per SKU. Return admin stage fees were introduced Feb 2025.",
    rate_card: {
      referral: [
        { category: "__default__", percent: 8 },
        { category: "collectibles", percent: 15 },
        { category: "luxury", percent: 15 },
      ],
      refund_admin: {
        percent_of_referral: 0.2,
        cap_per_sku_usd: 5,
        applies_to: "returned_orders",
      },
      return_shipping: {
        buyer_remorse_paid_by: "buyer",
        seller_fault_paid_by: "seller",
        label_deduction_usd: 7.5,
      },
    },
  },
];

export function policyForDate(iso: string): PolicyVersion {
  const d = iso.slice(0, 10);
  const hit =
    POLICIES.find(
      (p) => p.effective_from <= d && (p.effective_to === null || d < p.effective_to)
    ) ?? POLICIES[POLICIES.length - 1];
  return hit;
}

export const CURRENT_POLICY = POLICIES[0];

export function referralPercent(policy: PolicyVersion, category?: string | null): number {
  const tiers = policy.rate_card.referral;
  const hit = category ? tiers.find((t) => t.category === category.toLowerCase()) : undefined;
  return (hit ?? tiers.find((t) => t.category === "__default__")!).percent;
}

/**
 * Refund admin fee for one returned unit line.
 * Rule (both snapshots): 20% of the referral fee on the refunded item,
 * capped at $5 per SKU per refund.
 */
export function refundAdminFee(
  policy: PolicyVersion,
  refundedUnitAmount: number,
  category?: string | null
): number {
  const referral = (refundedUnitAmount * referralPercent(policy, category)) / 100;
  const fee = Math.min(referral * policy.rate_card.refund_admin.percent_of_referral, policy.rate_card.refund_admin.cap_per_sku_usd);
  return round2(fee);
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
