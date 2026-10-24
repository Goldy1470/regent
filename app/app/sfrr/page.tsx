import { supabaseServer } from "@/lib/supabase/server";
import { getSession, shortMoney } from "@/lib/session";
import { Badge, PageHeader, StatCard, Sparkline, MeterBar } from "@/components/ui";
import { Radar, Users, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SfrrPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();
  const owner = session.userId;

  const { data: rows } = await supa
    .from("sfrr_products")
    .select("*")
    .eq("owner", owner)
    .order("sfrr", { ascending: false });

  const products = rows ?? [];
  const blocked = products.filter((p) => !p.affiliate_eligible);
  const blockedGmv = blocked.reduce((s, p) => s + p.affiliate_gmv, 0);
  const nearGate = products.filter((p) => p.affiliate_eligible && p.sfrr >= p.threshold * 0.8);

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="sfrr guardian"
        title="SFRR Guardian"
        sub="Since Oct 2025, TikTok gates affiliate access on the Seller-Fault Return Rate per product. This radar tells you exactly which SKUs lose the affiliate program first — and the fix that pulls them back."
        live
        pulseLabel="eligibility gate watch"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="SKUs above the gate" value={`${blocked.length}`} sub="Lost affiliate eligibility — fix plan below each" tone="critical" icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="Affiliate GMV at stake" value={shortMoney(blockedGmv)} sub="Sales riding on blocked SKUs right now" tone="volt" icon={<Users className="h-4 w-4" />} />
        <StatCard label="SKUs approaching the gate" value={`${nearGate.length}`} sub="Within 80% of threshold — pre-warning zone" tone="high" icon={<Radar className="h-4 w-4" />} />
      </div>

      <div className="space-y-4">
        {products.map((p) => {
          const unsafe = !p.affiliate_eligible;
          const near = p.affiliate_eligible && p.sfrr >= p.threshold * 0.8;
          return (
            <div key={p.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={unsafe ? "critical" : near ? "high" : "ok"}>
                      {unsafe ? "BLOCKED — affiliate access lost" : near ? "Pre-warning zone" : "Eligible"}
                    </Badge>
                    <Badge tone="low">{p.monthly_orders.toLocaleString()} orders/mo</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-bold">{p.product_name}</h3>
                  <p className="font-mono text-xs text-zinc-600">{p.product_id}</p>
                </div>
                <Sparkline data={p.trend} width={140} height={40} danger={unsafe} />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[1.6fr_1fr] sm:items-center">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">SFRR trend vs {p.threshold.toFixed(1)}% gate</span>
                    <span className="font-mono">
                      <span className={unsafe ? "text-rose-400" : "text-mint-400"}>{p.sfrr.toFixed(1)}%</span>
                      <span className="text-zinc-600"> / {p.threshold.toFixed(1)}%</span>
                    </span>
                  </div>
                  <MeterBar value={p.sfrr} max={Math.max(p.threshold * 1.4, p.sfrr * 1.15)} color={unsafe ? "bg-rose-500" : near ? "bg-amber-500" : "bg-mint-500"} />
                </div>
                <p className="text-right font-mono text-[11px] text-zinc-500">
                  affiliate GMV: {shortMoney(p.affiliate_gmv)}/mo
                </p>
              </div>

              {p.primary_fix && (
                <p className="mt-4 rounded-xl border border-mint-400/15 bg-mint-500/[0.05] p-4 text-sm leading-relaxed text-zinc-300">
                  <span className="font-semibold text-mint-400">Guardian fix: </span>
                  {p.primary_fix}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
