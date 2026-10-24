/**
 * Webhook event → entitlement patch mapping + execution. Kept pure where it
 * can be (nextPatch is unit-tested); processEvent owns Supabase writes.
 * Idempotency: webhook-id header acts as event id in the webhook_events table.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createHash } from "node:crypto";
import type { PlanId } from "@/lib/types";

export type ProfilePatch = {
  plan?: PlanId;
  subscription_status?: "free" | "active" | "past_due" | "cancelled";
  period?: "monthly" | "annual";
  dodo_customer_id?: string | null;
  dodo_subscription_id?: string | null;
};

export type DodoEvent = {
  type: string;
  data: {
    subscription_id?: string;
    product_id?: string;
    customer_id?: string;
    customer?: { customer_id?: string };
    status?: string;
    metadata?: { user_id?: string };
  };
};

/** Pure: event → entitlement patch (unit-tested; DB concerns live in caller). */
export function nextPatch(
  eventType: string,
  opts: { plan: PlanId | null; period?: "monthly" | "annual" }
): ProfilePatch | null {
  switch (eventType) {
    case "subscription.active":
    case "subscription.renewed":
    case "payment.succeeded":
    case "subscription.updated": {
      const patch: ProfilePatch = { subscription_status: "active" };
      if (opts.plan) patch.plan = opts.plan;
      if (opts.period) patch.period = opts.period;
      return patch;
    }
    case "subscription.expired":
    case "subscription.cancelled":
    case "subscription.on_hold": {
      return { subscription_status: "cancelled" };
    }
    case "subscription.payment_failed":
    case "payment.failed": {
      return { subscription_status: "past_due" };
    }
    default:
      return null;
  }
}

export async function processEvent(
  webhookId: string,
  event: DodoEvent,
  raw: string | null
): Promise<{ deduped?: boolean; ignored?: boolean; resolved: boolean }> {
  const supa = supabaseAdmin();

  // ---- idempotency gate ----
  if (webhookId) {
    const { error: dedupeError } = await supa
      .from("webhook_events")
      .insert({ id: webhookId, event_type: event.type, payload_hash: raw ? hash(raw) : null });
    if (dedupeError) {
      // primary key conflict = replay delivery
      return { deduped: true, resolved: false };
    }
  }

  const metaUser = event.data?.metadata?.user_id;
  const productId = event.data?.product_id;
  const plan = planFromProductId(productId);
  const subscriptionId = event.data?.subscription_id ?? null;
  const customerId =
    event.data?.customer_id ?? event.data?.customer?.customer_id ?? null;

  const patch = nextPatch(event.type, {
    plan,
    period: isAnnualProduct(productId) ? "annual" : plan ? "monthly" : undefined,
  });
  if (!patch) return { ignored: true, resolved: false };

  const patchable: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  if (subscriptionId) {
    patchable.dodo_subscription_id = subscriptionId;
    patchable.dodo_customer_id = customerId ?? null;
  }

  const resolveProfile = async (): Promise<string | null> => {
    if (metaUser) return metaUser;
    if (subscriptionId) {
      const { data } = await supa
        .from("entitlements")
        .select("id")
        .eq("dodo_subscription_id", subscriptionId)
        .single();
      if (data?.id) return data.id;
    }
    if (customerId) {
      const { data } = await supa
        .from("entitlements")
        .select("id")
        .eq("dodo_customer_id", customerId)
        .single();
      if (data?.id) return data.id;
    }
    return null;
  };

  const userId = await resolveProfile();
  if (userId) {
    await supa.from("entitlements").update(patchable).eq("id", userId);
    return { resolved: true };
  }

  // Could not resolve a user: free the event id so Dodo's retry can resolve later.
  if (webhookId) {
    await supa.from("webhook_events").delete().eq("id", webhookId);
  }
  return { resolved: false };
}

function planFromProductId(productId: string | undefined | null): PlanId | null {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_GROWTH) return "growth";
  if (productId === process.env.DODO_PRODUCT_STARTER) return "starter";
  if (productId === process.env.DODO_PRODUCT_GROWTH_ANNUAL) return "growth";
  if (productId === process.env.DODO_PRODUCT_STARTER_ANNUAL) return "starter";
  return null;
}

function isAnnualProduct(productId: string | undefined | null): boolean {
  if (!productId) return false;
  return (
    productId === process.env.DODO_PRODUCT_STARTER_ANNUAL ||
    productId === process.env.DODO_PRODUCT_GROWTH_ANNUAL
  );
}

function hash(s: string) {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}
