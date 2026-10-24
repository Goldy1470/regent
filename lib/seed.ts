import { supabaseServer } from "./supabase/server";
import {
  DEMO_ALERTS,
  DEMO_FEES,
  DEMO_RECOVERY,
  DEMO_RETURNS,
  DEMO_SCANS,
  DEMO_SHOP,
  DEMO_SFRR,
} from "./mock";
import type { Shop } from "./types";

export async function ensureDemoShop(opts?: {
  name?: string;
  region?: string;
}): Promise<Shop | null> {
  const supa = supabaseServer();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supa
    .from("shops")
    .select("*")
    .eq("owner", user.id)
    .limit(1)
    .single();

  if (existing) return existing as Shop;

  const { data: inserted, error } = await supa
    .from("shops")
    .insert({
      owner: user.id,
      name: opts?.name ?? DEMO_SHOP.name,
      tiktok_shop_id: `demo-${user.id.slice(0, 8)}-${Date.now().toString(36)}`,
      region: opts?.region ?? DEMO_SHOP.region,
      mode: "demo",
      monthly_gmv: DEMO_SHOP.monthly_gmv,
      return_rate: DEMO_SHOP.return_rate,
      suspension_risk: DEMO_SHOP.suspension_risk,
    })
    .select("*")
    .single();

  if (error || !inserted) return null;
  const shop = inserted as Shop;

  const owner = user.id;

  await supa.from("sfrr_products").insert(
    DEMO_SFRR.map((p) => ({ ...p, shop_id: shop.id, owner }))
  );
  await supa.from("return_cases").insert(
    DEMO_RETURNS.map((c) => ({ ...c, shop_id: shop.id, owner }))
  );
  await supa.from("fee_anomalies").insert(
    DEMO_FEES.map((f) => ({ ...f, shop_id: shop.id, owner }))
  );
  await supa.from("alerts").insert(
    DEMO_ALERTS.map((a) => ({ ...a, shop_id: shop.id, owner }))
  );
  await supa.from("recovery_events").insert(
    DEMO_RECOVERY.map((e) => ({ ...e, shop_id: shop.id, owner }))
  );
  await supa.from("listing_scans").insert(
    DEMO_SCANS.map((s) => ({
      shop_id: shop.id,
      owner,
      title: s.title,
      category: s.category,
      input: s.input,
      risk_score: s.risk_score,
      verdict: s.verdict,
      findings: s.findings,
      created_at: s.created_at,
    }))
  );

  await supa
    .from("profiles")
    .update({ onboarding_done: true })
    .eq("id", user.id);

  return shop;
}
