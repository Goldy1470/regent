/**
 * Entitlements: the ONE server-side place that decides what a user may do.
 * Sources of truth:
 *   - entitlements table (plan, subscription_status) — server-only writes
 *   - usage counters (scans this month, audits this month) — counted from
 *     listing_scans / audit_imports directly, never from request bodies.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export const ENTITLEMENTS_VERSION = "v1";

export async function getEntitlements(userId: string): Promise<{
  plan: PlanId;
  status: string;
  max_shops: number;
  max_scans_month: number;
  max_audits_month: number;
  max_packets_month: number;
  scans_used: number;
  audits_used: number;
  packets_used: number;
}> {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const admin = supabaseAdmin();

  const [
    { data: ent },
    { count: scansUsed },
    { count: auditsUsed },
    { count: packetsUsed },
  ] = await Promise.all([
    admin
      .from("entitlements")
      .select("plan, subscription_status")
      .eq("id", userId)
      .single(),
    admin
      .from("listing_scans")
      .select("id", { count: "exact", head: true })
      .eq("owner", userId)
      .gte("created_at", `${period}-01T00:00:00Z`),
    admin
      .from("audit_imports")
      .select("id", { count: "exact", head: true })
      .eq("owner", userId)
      .gte("created_at", `${period}-01T00:00:00Z`),
    admin
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("owner", userId)
      .not("appeal_packet", "is", null)
      .gte("created_at", `${period}-01T00:00:00Z`),
  ]);

  const plan = ((ent?.plan as PlanId) ?? "free") as PlanId;
  const cfg = PLANS[plan] ?? PLANS.free;
  return {
    plan,
    status: ent?.subscription_status ?? "free",
    max_shops: cfg.shops,
    max_scans_month: cfg.scansMonth,
    max_audits_month: cfg.auditsMonth,
    max_packets_month: cfg.packetsMonth,
    scans_used: scansUsed ?? 0,
    audits_used: auditsUsed ?? 0,
    packets_used: packetsUsed ?? 0,
  };
}

export type DenialReason =
  | "no_session"
  | "plan_inactive"
  | "scan_cap"
  | "audit_cap"
  | "packet_cap"
  | "shops_cap";

/** Single gate used by every metered route. Returns null when allowed. */
export async function denyReason(
  userId: string | null | undefined,
  want: "scan" | "audit" | "shop" | "packet"
): Promise<DenialReason | null> {
  if (!userId) return "no_session";
  const e = await getEntitlements(userId);
  if (e.status !== "active" && e.plan !== "free") return "plan_inactive";
  if (want === "scan" && e.scans_used >= e.max_scans_month) return "scan_cap";
  if (want === "audit" && e.audits_used >= e.max_audits_month) return "audit_cap";
  if (want === "packet" && e.packets_used >= e.max_packets_month) return "packet_cap";
  if (want === "shop" && e.max_shops <= 1) return "shops_cap";
  return null;
}

export const DENIAL_MESSAGES: Record<DenialReason, string> = {
  no_session: "Sign in first.",
  plan_inactive: "Your subscription is not active. Update billing to continue.",
  scan_cap: "Monthly listing scans cap reached. Upgrade for unlimited scans.",
  audit_cap: "Monthly audit cap reached. Upgrade for unlimited audits.",
  packet_cap: "Monthly AI packet cap reached. Upgrade for unlimited drafts.",
  shops_cap: "Your plan covers one shop. Upgrade for multi-shop.",
};
