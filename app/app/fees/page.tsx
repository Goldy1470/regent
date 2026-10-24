import { supabaseServer } from "@/lib/supabase/server";
import { getSession, money } from "@/lib/session";
import { Badge, PageHeader, StatCard, statusTone, MeterBar } from "@/components/ui";
import { AIActionButton, CopyButton, RecoverButton } from "@/components/actions";
import { CreditCard, PiggyBank, SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FeesPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();
  const owner = session.userId;

  const { data: fees } = await supa
    .from("fee_anomalies")
    .select("*")
    .eq("owner", owner)
    .order("delta", { ascending: false });

  const rows = fees ?? [];
  const leakOpen = rows.filter((f) => f.status === "open" || f.status === "filed").reduce((s, f) => s + f.delta, 0);
  const recovered = rows.filter((f) => f.status === "recovered").reduce((s, f) => s + f.recovered_amount, 0);
  const byType = new Map<string, number>();
  rows.forEach((f) => byType.set(f.fee_type, (byType.get(f.fee_type) ?? 0) + f.delta));
  const typeRows = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
  const maxType = typeRows[0]?.[1] ?? 1;

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="fee auditor"
        title="Fee & Margin Auditor"
        sub="Every settlement line reconciled against the published rate card. Sellers report incorrect charges that are 'impossible to amend' — this is the systematic way to amend them."
        live
        pulseLabel="settlement diff hourly"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Overcharges detected" value={money(leakOpen)} sub="Not yet credited back" tone="high" icon={<SearchX className="h-4 w-4" />} />
        <StatCard label="Credited to date" value={money(recovered)} sub="Refunds landed in settlement — audit-grade trail" tone="ok" icon={<PiggyBank className="h-4 w-4" />} />
        <StatCard label="Annualized leakage projection" value={money(leakOpen * 12 + recovered * 3)} sub="If current batch volume keeps up" tone="volt" icon={<CreditCard className="h-4 w-4" />} />
      </div>

      {typeRows.length > 0 && (
        <div className="panel p-6">
          <h2 className="font-bold">Leakage by fee type</h2>
          <div className="mt-4 space-y-3.5">
            {typeRows.map(([type, amt]) => (
              <div key={type}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300">{type}</span>
                  <span className="font-mono text-zinc-500">{money(amt)}</span>
                </div>
                <MeterBar value={amt} max={maxType} color="bg-volt-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rows.map((f) => (
          <div key={f.id} className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(f.status)}>{f.status.toUpperCase()}</Badge>
                  <Badge tone="volt">{f.fee_type}</Badge>
                </div>
                <h3 className="mt-3 font-mono text-sm font-bold">{f.order_id}</h3>
              </div>
              <div className="text-right">
                <p className="font-mono text-xl font-extrabold text-rose-400">+{money(f.delta)}</p>
                <p className="font-mono text-[11px] text-zinc-500">expected {money(f.expected)} · charged {money(f.charged)}</p>
              </div>
            </div>

            {f.explanation && (
              <p className="mt-4 rounded-xl border border-white/[0.07] bg-ink-900 p-4 text-sm leading-relaxed text-zinc-300">
                {f.explanation}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {!f.explanation && (
                <AIActionButton
                  endpoint="/api/ai/fee"
                  payload={{ feeId: f.id }}
                  label="Explain + build correction request"
                  doneLabel="Correction packet ready"
                />
              )}
              {f.explanation && f.status !== "recovered" && (
                <>
                  <CopyButton text={f.explanation} small />
                  <RecoverButton
                    body={{
                      type: "fee",
                      id: f.id,
                      amount: f.delta,
                      description: `Fee credit: ${f.order_id} ${f.fee_type} overcharge ${money(f.delta)}`,
                    }}
                    label="Mark credited → log recovery"
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
