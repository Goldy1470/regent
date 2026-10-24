import type { PlanId } from "./types";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  shops: number;
  recoveryCap: number;
  performanceFee: number;
  blurb: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    shops: 1,
    recoveryCap: 500,
    performanceFee: 0.15,
    blurb: "See exactly what you lose every month.",
    features: [
      "1 shop connection (demo mode)",
      "10 AI listing scans / month",
      "2 AI appeal packets / month",
      "Violations inbox + SFRR radar (read-only)",
      "$500/mo recovery visibility cap",
    ],
  },
  starter: {
    id: "starter",
    name: "Ward",
    price: 19,
    shops: 1,
    recoveryCap: 5000,
    performanceFee: 0.12,
    blurb: "For sellers who want the radar running. $19 buys the watchtower.",
    features: [
      "1 live shop connection",
      "Unlimited AI listing scans",
      "Unlimited appeal + dispute drafting",
      "Full fee & margin audit",
      "$5,000/mo recovery processing",
      "12% performance fee on recovered funds — you keep 88%",
    ],
    highlight: true,
  },
  scale: {
    id: "scale",
    name: "Court",
    price: 49,
    shops: 3,
    recoveryCap: 25000,
    performanceFee: 0.08,
    blurb: "For multi-SKU brands leaning on affiliates.",
    features: [
      "3 live shop connections",
      "Everything in Ward",
      "SFRR Guardian action plans",
      "Weekly auto-run fee audits",
      "Fraud-pattern buyer blacklist",
      "$25,000/mo recovery processing",
      "8% performance fee — you keep 92%",
    ],
  },
  pro: {
    id: "pro",
    name: "Crown",
    price: 149,
    shops: 99,
    recoveryCap: 999999,
    performanceFee: 0.05,
    blurb: "For agencies & high-volume operators.",
    features: [
      "5 live shops + read-only team seats",
      "Everything in Court",
      "Agency mode: white-label packets & exports",
      "API + webhook access",
      "Priority dispute queue",
      "5% performance fee — you keep 95%",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "scale", "pro"];

export function planOf(id: PlanId | null | undefined): Plan {
  return PLANS[(id ?? "free") as PlanId] ?? PLANS.free;
}

export function isPaidPlan(id: PlanId | null | undefined) {
  return id === "starter" || id === "scale" || id === "pro";
}

export function planLabel(id: PlanId | null | undefined) {
  return planOf(id).name;
}
