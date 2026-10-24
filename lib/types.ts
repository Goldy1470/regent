export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  onboarding_done: boolean;
  created_at: string;
};

/** Server-controlled entitlement state (mirrors entitlements table; read-only on the client). */
export type Entitlement = {
  plan: PlanId;
  subscription_status: "free" | "active" | "past_due" | "cancelled";
  period: "monthly" | "annual";
  dodo_customer_id: string | null;
  dodo_subscription_id: string | null;
  recovered_lifetime: number;
};

export type Shop = {
  id: string;
  owner: string;
  name: string;
  tiktok_shop_id: string;
  region: string;
  mode: "demo" | "live";
  monthly_gmv: number;
  return_rate: number;
  suspension_risk: number;
  created_at: string;
};

export type Finding = {
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  fix: string;
};

export type ListingScan = {
  id: string;
  shop_id: string;
  owner: string;
  title: string;
  category: string;
  input: Record<string, unknown>;
  risk_score: number;
  verdict: string;
  findings: Finding[];
  created_at: string;
};

export type Alert = {
  id: string;
  shop_id: string;
  owner: string;
  kind: "policy_strike" | "ahr_points" | "account_risk" | "listing_removal" | "compliance";
  severity: "critical" | "high" | "medium";
  title: string;
  body: string;
  platform_ref: string | null;
  ahr_points: number;
  at_risk_gmv: number;
  status: "open" | "appealing" | "resolved" | "lost";
  appeal_packet: string | null;
  created_at: string;
};

export type ReturnCase = {
  id: string;
  shop_id: string;
  owner: string;
  order_id: string;
  customer: string;
  customer_history: Record<string, unknown>;
  product: string;
  reason: string;
  refund_amount: number;
  fraud_score: number;
  flags: string[];
  status: "new" | "disputed" | "recovered" | "lost";
  dispute_packet: string | null;
  recovered_amount: number;
  created_at: string;
};

export type FeeAnomaly = {
  id: string;
  shop_id: string;
  owner: string;
  order_id: string;
  fee_type: string;
  expected: number;
  charged: number;
  delta: number;
  status: "open" | "filed" | "recovered" | "rejected";
  explanation: string | null;
  recovered_amount: number;
  created_at: string;
};

export type SfrrProduct = {
  id: string;
  shop_id: string;
  owner: string;
  product_id: string;
  product_name: string;
  sfrr: number;
  threshold: number;
  monthly_orders: number;
  affiliate_gmv: number;
  affiliate_eligible: boolean;
  trend: number[];
  primary_fix: string | null;
  updated_at: string;
};

export type RecoveryEvent = {
  id: string;
  shop_id: string;
  owner: string;
  source: "fee_audit" | "fraud_dispute" | "appeal_reinstatement" | "shipping_credit";
  amount: number;
  status: "pending" | "recovered" | "lost";
  description: string;
  created_at: string;
};

export type PlanId = "free" | "starter" | "growth";

export type ActionResponse = {
  ok: boolean;
  error?: string;
  data?: unknown;
};
