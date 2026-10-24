import { supabaseServer } from "@/lib/supabase/server";
import { getSession, money } from "@/lib/session";
import { Badge, MeterBar, PageHeader, StatCard, statusTone } from "@/components/ui";
import { AIActionButton, CopyButton, RecoverButton } from "@/components/actions";
import { ReceiptText, EyeOff, FileWarning } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();
  const owner = session.userId;

  const { data: cases } = await supa
    .from("return_cases")
    .select("*")
    .eq("owner", owner)
    .order("fraud_score", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = cases ?? [];
  const pool = rows
    .filter((c) => c.status === "new" && c.fraud_score >= 60)
    .reduce((s, c) => s + c.refund_amount, 0);
  const disputed = rows.filter((c) => c.status === "disputed").reduce((s, c) => s + c.refund_amount, 0);
  const won = rows.filter((c) => c.status === "recovered").reduce((s, c) => s + c.recovered_amount, 0);
  const abusers = rows.filter((c) => c.fraud_score >= 80).length;

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="return fraud fighter"
        title="Return Fraud Fighter"
        sub="Every claim scored against the buyer's history, carrier evidence and your listing proof. Score ≥ 60 = dispute packet ready to hand to TikTok in one click."
        live
        pulseLabel="claim monitor active"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Disputable pool (open, score ≥ 60)" value={money(pool)} sub="Refunds you can still contest" tone="high" icon={<FileWarning className="h-4 w-4" />} />
        <StatCard label="In dispute right now" value={money(disputed)} sub="Packets filed — evidence windows ticking" tone="volt" icon={<ReceiptText className="h-4 w-4" />} />
        <StatCard label="Recovered to date" value={money(won)} sub="Refund reversals credited in settlement" tone="ok" />
        <StatCard label="Repeat abusers flagged" value={`${abusers}`} sub="Pattern-matched across claims in 90d" tone="critical" icon={<EyeOff className="h-4 w-4" />} />
      </div>

      <div className="space-y-4">
        {rows.map((c) => (
          <div key={c.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(c.status)}>{c.status.toUpperCase()}</Badge>
                  <Badge tone={c.fraud_score >= 85 ? "critical" : c.fraud_score >= 60 ? "high" : c.fraud_score >= 35 ? "medium" : "low"}>
                    fraud score {c.fraud_score}
                  </Badge>
                  <Badge tone={c.refund_amount >= 25 ? "volt" : "low"}>{money(c.refund_amount)} refund claim</Badge>
                </div>
                <h3 className="mt-3 font-mono text-sm font-bold">{c.order_id}</h3>
                <p className="text-xs text-zinc-500">
                  {c.customer} · {c.product} · claim: “{c.reason}”
                </p>
              </div>
              <span className="font-mono text-[11px] text-zinc-600">
                {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>

            <div className="mt-4">
              <MeterBar value={c.fraud_score} max={100} color={c.fraud_score >= 85 ? "bg-rose-500" : c.fraud_score >= 60 ? "bg-amber-500" : "bg-sky-500"} />
            </div>

            <ul className="mt-4 space-y-1.5">
              {c.flags.map((flag: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-400">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-500" />
                  {flag}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!c.dispute_packet && c.status === "new" && (
                <AIActionButton
                  endpoint="/api/ai/dispute"
                  payload={{ caseId: c.id }}
                  label="Build dispute packet"
                  doneLabel="Packet ready"
                  variant={c.fraud_score >= 60 ? "primary" : "ghost"}
                />
              )}
              {c.fraud_score < 60 && c.status === "new" && (
                <span className="text-[11px] text-zinc-600">Low score — goodwill refund is usually cheaper than a fight.</span>
              )}
              {c.status !== "recovered" && c.dispute_packet && (
                <RecoverButton
                  body={{
                    type: "case",
                    id: c.id,
                    amount: c.refund_amount,
                    description: `Dispute won: ${c.order_id} (${c.reason}) — refund reversed to payout`,
                  }}
                  label="Mark won → log recovery"
                />
              )}
            </div>

            {c.dispute_packet && (
              <details className="mt-4 rounded-xl border border-white/[0.07] bg-ink-900 p-4" open>
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Dispute packet — review, then copy into Seller Center
                </summary>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-300">
                  {c.dispute_packet}
                </pre>
                <div className="mt-3 flex gap-2">
                  <CopyButton text={c.dispute_packet} />
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
