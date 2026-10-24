import { supabaseServer } from "./supabase/server";
import { supabaseAdmin } from "./supabase/admin";
import type { Profile, Shop, Entitlement } from "./types";

type SessionData = {
  userId: string;
  email: string | null;
  profile: Profile;
  entitlement: Entitlement;
  shop: Shop | null;
};

const FALLBACK_ENTITLEMENT: Entitlement = {
  plan: "free",
  subscription_status: "free",
  period: "monthly",
  dodo_customer_id: null,
  dodo_subscription_id: null,
  recovered_lifetime: 0,
};

export async function getSession(): Promise<SessionData | null> {
  const supa = supabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: ent }, { data: shop }, { data: entAdmin }] = await Promise.all([
    supa.from("profiles").select("*").eq("id", user.id).single(),
    supa.from("entitlements").select("*").eq("id", user.id).single(),
    supa
      .from("shops")
      .select("*")
      .eq("owner", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single(),
    Promise.resolve({ data: null as Entitlement | null }),
  ]);

  const fallbackProfile = (profile ?? {
    id: user.id,
    email: user.email ?? null,
    full_name: "Founder",
    onboarding_done: false,
    created_at: new Date().toISOString(),
  }) as Profile;

  let entitlement = (ent ?? entAdmin) as Entitlement | null;
  if (!entitlement) {
    // Entitlements row may not exist yet for legacy users; create server-side.
    try {
      const admin = supabaseAdmin();
      await admin.from("entitlements").upsert({ id: user.id }, { onConflict: "id" });
      entitlement = FALLBACK_ENTITLEMENT;
    } catch {
      entitlement = FALLBACK_ENTITLEMENT;
    }
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: fallbackProfile,
    entitlement: entitlement ?? FALLBACK_ENTITLEMENT,
    shop: (shop as Shop) ?? null,
  };
}

export async function requireApiSession(): Promise<SessionData | null> {
  return getSession();
}

export const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const shortMoney = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
