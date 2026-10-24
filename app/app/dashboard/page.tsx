import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { getSession, money, shortMoney } from "@/lib/session";
import { Badge, statusTone, StatCard, Sparkline, MeterBar, PageHeader, RiskGauge } from "@/components/ui";
import { planLabel } from "@/lib/plans";
import {
  ScanSearch,
  Gavel,
  ShieldAlert,
  ReceiptText,
  ArrowRight,
  Sparkles,
  Radar,
  MapPin,
  Flame,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();
  const shop = session.shop;
  if (!shop) return null;
  const owner = session.userId;

  const [alerts, cases, fees, sfrr, events] = await Promise.all([
    supa.from("alerts").select("*").eq("owner", owner).order("created_at", { ascending: false }),
    supa.from("return_cases").select("*").eq("owner", owner).order("fraud_score", { ascending: false }),
    supa.from("fee_anomalies").select("*").eq("owner", owner).order("created_at", { ascending: false }),
    supa.from("sfrr_products").select("*").eq("owner", owner).order("sfrr", { ascending: false }),
    supa.from("recovery_events").select("*").eq("owner", owner).order("created_at", { ascending: false }),
  ]);

  const alertRows = alerts.data ?? [];
  const caseRows = cases.data ?? [];
  const feeRows = fees.data ?? [];
  const sfrrRows = sfrr.data ?? [];
  const eventRows = events.data ?? [];

  const hardRecovered = eventRows.filter((e) => e.status === "recovered").reduce((a, e) => a + e.amount, 0);
  const pendingRecovery = eventRows.filter((e) => e.status === "pending").reduce((a, e) => a + e.amount, 0);
  const openCritical = alertRows.filter((a) => a.status === "open" && a.severity === "critical").length;
  const atRiskGmv = alertRows.filter((a) => a.status === "open").reduce((a, r) => a + r.at_risk_gmv, 0);
  const fraudPool = caseRows
    .filter((c) => c.status === "new" && c.fraud_score >= 60)
    .reduce((a, c) => a + c.refund_amount, 0);
  const feeLeak = feeRows.filter((f) => f.status === "open" || f.status === "filed").reduce((a, f) => a + f.delta, 0);
  const blockedSfrr = sfrrRows.filter((p) => !p.affiliate_eligible);
  const blockedAffiliateGmv = blockedSfrr.reduce((a, p) => a + p.affiliate_gmv, 0);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const byDay = days.map((d, i) => {
    const next = i < 13 ? days[i + 1] : new Date(d.getTime() + 86400000);
    return eventRows
      .filter((e) => e.status === "recovered" && new Date(e.created_at) >= d && new Date(e.created_at) < next)
      .reduce((a, e) => a + e.amount, 0);
  });

  const worstSfrr = blockedSfrr[0];
  const briefing: { href: string; title: string; why: string; icon: typeof Flame; tone: string }[] = [];
  const topOpen = alertRows.find((a) => a.status === "open" && a.severity === "critical");
  const topCase = caseRows.find((c) => c.status === "new" && c.fraud_score >= 80);
  const topFee = feeRows.filter((f) => f.status === "open").sort((a, b) => b.delta - a.delta)[0];

  if (topOpen) {
    briefing.push({
      href: "/app/violations",
      title: `File the ${topOpen.title.toLowerCase()} appeal first`,
      why: `${topOpen.platform_ref ?? "Critical"} — every hour costs appeal leverage. Packet drafts in one click.`,
      icon: Gavel,
      tone: "critical",
    });
  }
  if (topCase) {
    briefing.push({
      href: "/app/returns",
      title: `Dispute ${topCase.order_id} — fraud score ${topCase.fraud_score}`,
      why: topCase.flags[0] ?? "Repeat-abuser pattern detected — evidence packet ready to build.",
      icon: ReceiptText,
      tone: "high",
    });
  }
  if (worstSfrr) {
    briefing.push({
      href: "/app/sfrr",
      title: `${worstSfrr.product_name} lost affiliate access (SFRR ${worstSfrr.sfrr}% vs ${worstSfrr.threshold}%)`,
      why: `${shortMoney(worstSfrr.affiliate_gmv)}/mo of affiliate GMV is paused on this SKU alone. Guardian has the fix.`,
      icon: Radar,
      tone: "critical",
    });
  }
  if (topFee && briefing.length < 3) {
    briefing.push({
      href: "/app/fees",
      title: `File the ${topFee.fee_type.toLowerCase()} correction (${topFee.order_id})`,
      why: `${money(topFee.delta)} overcharge — 30-day window rule applies.`,
      icon: ShieldAlert,
      tone: "volt",
    });
  }

  const moduleStatus = [
    { href: "/app/violations", title: "Violation Shield", value: openCritical > 0 ? `${openCritical} critical open` : `${alertRows.filter((a) => a.status !== "resolved").length} active`, tone: openCritical > 0 ? "critical" : "ok" },
    { href: "/app/returns", title: "Return Fraud Fighter", value: money(fraudPool), sub: "refundable pool, score ≥ 60", tone: fraudPool > 60 ? "high" : "ok" },
    { href: "/app/fees", title: "Fee Auditor", value: money(feeLeak), sub: "overcharges spotted to date", tone: feeLeak > 0 ? "high" : "ok" },
    { href: "/app/sfrr", title: "SFRR Guardian", value: `${blockedSfrr.length} SKU${blockedSfrr.length === 1 ? "" : "s"} blocked`, sub: shortMoney(blockedAffiliateGmv) + " affiliate GMV at stake", tone: blockedSfrr.length > 0 ? "critical" : "ok" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="command center"
        title={`Good shift, ${session.profile.full_name.split(" ")[0]}`}
        sub={`${shop.name} · ${shop.region} · ${shop.mode === "demo" ? "synthetic feed" : "live feed"} — ${alertRows.filter((a) => a.status === "open").length} open events, ${money(fraudPool + feeLeak)} of instant fixes ready.`}
        live
        right={
          <Link href="/app/scan" className="btn-primary !px-4 !py-2 !text-xs">
            <ScanSearch className="h-3.5 w-3.5" /> Scan a draft listing
          </Link>
        }
      />

      <div className="panel-glass animate-fade-up delay-1 relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-volt-600/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-volt-500/15">
                <Sparkles className="h-4 w-4 text-volt-400" />
              </span>
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-300">
                Today&apos;s briefing
              </p>
            </div>
            <p className="mt-2 max-w-xl text-sm font-medium text-zinc-400">
              Three highest-leverage moves, ranked by dollars at stake × urgency. The Shield already
              pre-staged the paperwork for each.
            </p>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {briefing.slice(0, 3).map((b, i) => (
                <Link
                  key={b.href}
                  href={b.href}
                  className="panel panel-hover p-4"
                >
                  <div className="flex items-center justify-between">
                    <b.icon className={`h-4 w-4 ${b.tone === "critical" ? "text-rose-400" : b.tone === "high" ? "text-amber-400" : "text-volt-400"}`} />
                    <span className="font-mono text-[10px] text-zinc-600">#{i + 1}</span>
                  </div>
                  <p className="mt-2.5 text-[13px] font-semibold leading-snug text-zinc-100">{b.title}</p>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{b.why}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-volt-400">
                    Open module <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden xl:block">
            <RiskGauge score={shop.suspension_risk} size={170} />
            <p className="mt-2 text-center text-xs text-zinc-600">
              {shop.suspension_risk >= 60 ? "Above 60 = review magnet" : "Keep under 60"}
            </p>
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recovered — hard cash" value={money(hardRecovered)} sub={`${shortMoney(pendingRecovery)} more in pending appeals`} tone="ok" accent />
        <StatCard label="GMV under open threat" value={shortMoney(atRiskGmv)} sub={`${alertRows.filter((a) => a.status === "open").length} alerts waiting on you`} tone="high" icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="One-click leak fixes" value={money(fraudPool + feeLeak)} sub="disputes + fee credits ready to file" tone="volt" icon={<ReceiptText className="h-4 w-4" />} />
        <StatCard label="Return rate vs category" value="15.7% vs 9%" sub="Fraud-adjusted; disputes cut effective rate" tone="critical" icon={<MapPin className="h-4 w-4" />} />
      </div>

      <div className="animate-fade-up delay-3 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Recovered cash — last 14 days</h2>
              <p className="text-xs text-zinc-500">Dispute wins, fee credits and carrier refunds landed in settlements.</p>
            </div>
            <Sparkline data={byDay} width={180} height={44} />
          </div>
          <div className="mt-5 flex h-28 items-end gap-1.5">
            {byDay.map((v, i) => {
              const max = Math.max(...byDay, 1);
              return (
                <div key={i} className="flex-1">
                  <div
                    className="rounded-t-md bg-gradient-to-t from-volt-600/70 to-volt-400 transition-all duration-500"
                    style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
                    title={`Day ${13 - i}: $${v.toFixed(2)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-600">
            <span>14d ago</span>
            <span>today</span>
          </div>
        </div>

        <div className="panel p-6">
          <h2 className="font-bold">Affiliate dependency</h2>
          <p className="mt-1 text-xs text-zinc-500">
            71% of GMV rides on affiliate creators — the Oct-2025 rules tie that channel to your operational health.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Shop health gate (AHR + SFRR)</span>
                <span className="font-mono text-zinc-500">{shop.suspension_risk}%</span>
              </div>
              <MeterBar value={shop.suspension_risk} max={100} color={shop.suspension_risk >= 60 ? "bg-rose-500" : "bg-mint-500"} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Return rate vs category norm</span>
                <span className="font-mono text-zinc-500">15.7% vs 9%</span>
              </div>
              <MeterBar value={15.7} max={25} color="bg-amber-500" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Fee leakage vs settlement</span>
                <span className="font-mono text-zinc-500">{((feeLeak / (shop.monthly_gmv || 1)) * 100).toFixed(2)}%</span>
              </div>
              <MeterBar value={feeLeak} max={Math.max(shop.monthly_gmv * 0.02, 1)} color="bg-volt-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-up delay-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your four shields</h2>
          <Link href="/app/settings" className="text-xs font-medium text-zinc-500 hover:text-zinc-300">
            Tune shop settings →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {moduleStatus.map((m) => (
            <Link key={m.href} href={m.href} className="panel panel-hover p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-200">{m.title}</p>
                <Badge tone={m.tone}>radar</Badge>
              </div>
              <p className="mt-3 text-xl font-extrabold tracking-tight">{m.value}</p>
              {"sub" in m && m.sub ? <p className="mt-1 text-xs text-zinc-500">{m.sub}</p> : null}
            </Link>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="flex items-center gap-2 font-bold">
            <Flame className="h-4 w-4 text-rose-400" />
            Needs a reply in 48 hours
          </h2>
          <Link href="/app/violations" className="text-xs font-medium text-volt-400 hover:text-volt-500">
            Open Violation Shield →
          </Link>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {alertRows
            .filter((a) => a.status === "open")
            .slice(0, 4)
            .map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{a.platform_ref}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.at_risk_gmv > 0 && <Badge tone="high">{shortMoney(a.at_risk_gmv)} at risk</Badge>}
                  <Badge tone={a.severity}>{a.severity}</Badge>
                  <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                </div>
              </div>
            ))}
          {alertRows.filter((a) => a.status === "open").length === 0 && (
            <p className="px-6 py-6 text-sm text-zinc-500">Nothing urgent — the radar is quiet.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        Plan: {planLabel(session.profile.plan)} · AI engine: {process.env.OPENAI_API_KEY ? "OpenAI gpt-4o-mini" : "built-in offline engine (add OPENAI_API_KEY for LLM-drafted packets)"} · Payment rail: {process.env.DODO_API_KEY ? "Dodo Payments" : "Dodo setup pending (see Billing)"}
      </p>
    </div>
  );
}
