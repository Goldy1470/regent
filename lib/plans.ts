import type { PlanId } from "./types";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  /** annual price (per year, USD). 0 = not purchasable / n-a */
  annualPrice: number;
  shops: number;
  /** Listing Guard scans per month */
  scansMonth: number;
  /** Leak audits per month */
  auditsMonth: number;
  /** AI draft packets (appeals/disputes/fee notes) per month */
  packetsMonth: number;
  /** weekly auto-audit switch for Growth+ */
  weeklyAudit: boolean;
  blurb: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    annualPrice: 0,
    shops: 1,
    scansMonth: 5,
    auditsMonth: 1,
    packetsMonth: 2,
    weeklyAudit: false,
    blurb: "One audit. One truth moment.",
    features: [
      "1 leak audit / month (your own settlement export)",
      "5 Listing Guard scans / month",
      "Account Health tracker (read-only)",
      "Demo shop included - labeled DEMO, never mixed with real data",
      "No card required",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 29,
    annualPrice: 290,
    shops: 1,
    scansMonth: 999,
    auditsMonth: 30,
    packetsMonth: 999,
    weeklyAudit: false,
    blurb: "For shops that lost money one month too many. $29 buys the watchtower.",
    features: [
      "1 shop connection (CSV or Seller Center export)",
      "Unlimited Listing Guard scans",
      "30 leak audits / month",
      "Full fee history re-check",
      "Appeal drafts (always human-review gated)",
      "Email findings digest",
    ],
    highlight: true,
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 59,
    annualPrice: 590,
    shops: 3,
    scansMonth: 9999,
    auditsMonth: 9999,
    packetsMonth: 9999,
    weeklyAudit: true,
    blurb: "Multi-shop operators. Weekly auto-audit + alerts.",
    features: [
      "3 shop connections",
      "Everything in Starter",
      "Weekly auto-audit + alert emails",
      "Priority dispute evidence packets",
      "CSV/Sheets exports",
      "Priority support",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "growth"];
/** first-year promo codes map to Dodo products; annual = 2 months free */
export const ANNUAL_DISCOUNT_LABEL = "2 months free";

export function planOf(id: PlanId | null | undefined): Plan {
  return PLANS[(id ?? "free") as PlanId] ?? PLANS.free;
}

export function isPaidPlan(id: PlanId | null | undefined) {
  return id === "starter" || id === "growth";
}

export function planLabel(id: PlanId | null | undefined) {
  return planOf(id).name;
}
