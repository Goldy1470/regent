import { supabaseServer } from "@/lib/supabase/server";
import { getSession, shortMoney } from "@/lib/session";
import { Badge, statusTone, StatCard, PageHeader } from "@/components/ui";
import { AIActionButton, CopyButton, RecoverButton } from "@/components/actions";
import { ScanSearch, Gavel, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  policy_strike: "Policy strike",
  ahr_points: "AHR deduction",
  account_risk: "Account risk",
  listing_removal: "Listing removal",
  compliance: "Compliance",
};

export default async function ViolationsPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();
  const owner = session.userId;

  const { data: alerts } = await supa
    .from("alerts")
    .select("*")
    .eq("owner", owner)
    .order("severity", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = alerts ?? [];
  const servedImmediately = rows.filter((a) => a.status !== "resolved");
  const atRisk = rows.filter((a) => a.status === "open").reduce((s, a) => s + a.at_risk_gmv, 0);
  const ahrPool = rows.filter((a) => a.status === "open" && a.ahr_points > 0).reduce((s, a) => s + a.ahr_points, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="violation shield"
        title="Violation Shield"
        sub="Strikes, AHR deductions and removal risks — each with an AI-drafted appeal packet ready to file. Points sit up to 180 days unless you fight each one."
        live
        pulseLabel="policy monitor active"
        right={
          <a href="/app/scan" className="btn-ghost !px-4 !py-2 !text-xs">
            <ScanSearch className="h-3.5 w-3.5" /> Scan a new listing
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Unresolved enforcement events" value={`${servedImmediately.length}`} sub="Oldest first — appeals decay with time" tone="high" icon={<Gavel className="h-4 w-4" />} />
        <StatCard label="GMV tied to open events" value={shortMoney(atRisk)} sub="Reinstated listings flow back as recovered GMV" tone="volt" icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="AHR points on record" value={`${ahrPool}`} sub="Dispute-able points; each needs its own appeal" tone="critical" />
      </div>

      <div className="space-y-4">
        {rows.map((a) => (
          <div key={a.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={a.severity}>{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                  <Badge tone={statusTone(a.status)}>{a.status.toUpperCase()}</Badge>
                  {a.ahr_points > 0 && <Badge tone="medium">{a.ahr_points} AHR pts</Badge>}
                  {a.at_risk_gmv > 0 && <Badge tone="high">{shortMoney(a.at_risk_gmv)} GMV at risk</Badge>}
                </div>
                <h3 className="mt-3 text-lg font-bold">{a.title}</h3>
              </div>
              <span className="font-mono text-[11px] text-zinc-600">
                {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a.body}</p>
            {a.platform_ref && <p className="mt-2 font-mono text-xs text-zinc-500">{a.platform_ref}</p>}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!a.appeal_packet && (
                <AIActionButton
                  endpoint="/api/ai/appeal"
                  payload={{ alertId: a.id }}
                  label="Draft appeal packet"
                  doneLabel="Packet ready"
                  disabled={a.status === "resolved"}
                />
              )}
              {a.status !== "resolved" && a.appeal_packet && (
                <RecoverButton
                  body={{
                    type: "alert",
                    id: a.id,
                    amount: Math.max(1, a.at_risk_gmv || 100),
                    description: `Listing reinstated / strike resolved: ${a.title}`,
                  }}
                  label="Mark resolved → log reinstated GMV"
                />
              )}
            </div>

            {a.appeal_packet && (
              <details className="mt-4 rounded-xl border border-white/[0.07] bg-ink-900 p-4" open>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Appeal packet — review, then copy into Seller Center
                </summary>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                  {a.appeal_packet}
                </pre>
                <div className="mt-3 flex gap-2">
                  <CopyButton text={a.appeal_packet} />
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
