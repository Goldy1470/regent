import { supabaseServer } from "./supabase/server";
import type { Profile, Shop } from "./types";

type SessionData = {
  userId: string;
  email: string | null;
  profile: Profile;
  shop: Shop | null;
};

export async function getSession(): Promise<SessionData | null> {
  const supa = supabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supa
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const fallbackProfile = (profile ?? {
    id: user.id,
    email: user.email ?? null,
    full_name: "Founder",
    plan: "free",
    dodo_customer_id: null,
    dodo_subscription_id: null,
    subscription_status: "free",
    recovered_lifetime: 0,
    onboarding_done: false,
    created_at: new Date().toISOString(),
  }) as Profile;

  const { data: shop } = await supa
    .from("shops")
    .select("*")
    .eq("owner", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: fallbackProfile,
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
