import { supabaseServer } from "@/lib/supabase/server";
import { getSession, money, shortMoney } from "@/lib/session";
import { Badge, PageHeader, StatCard, statusTone } from "@/components/ui";
import ExportCsvButton from "@/components/export-csv";
import { Wallet, Receipt, FileSpreadsheet, BadgeDollarSign } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  fee_audit: "Fee audit",
  fraud_dispute: "Fraud dispute",
  appeal_reinstatement: "Appeal reinstatement",
  shipping_credit: "Carrier credit",
};

export default async function RecoveryPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();
  const owner = session.userId;
  const ent = session.entitlement;

  const { data: events } = await supa
    .from("recovery_events")
    .select("*")
    .eq("owner", owner)
    .order("created_at", { ascending: false });

  const rows = events ?? [];
  const recovered = rows.filter((e) => e.status === "recovered").reduce((s, e) => s + e.amount, 0);
  const pending = rows.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="recovery wallet"
        title="Recovery Wallet"
        sub="The auditable trail of every dollar this engine found, fought for, or forced back. In v1 there is no success fee — these are your dollars end to end."
        live
        pulseLabel="ledger synced"
        right={<ExportCsvButton filename="regent-recovery-ledger.csv" />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recovered — all time" value={money(recovered)} sub="Hard cash: disputes, credits, fee refunds" tone="ok" icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="In appeals / awaiting platform" value={shortMoney(pending)} sub="GMV or credits pending platform action" tone="volt" icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Success fee" value="0%" sub="No fee in v1 — flat subscription only" tone="ok" icon={<BadgeDollarSign className="h-4 w-4" />} />
        <StatCard label="Lifetime (entitlements)" value={money(ent.recovered_lifetime)} sub="Server-computed from this ledger" tone="low" icon={<FileSpreadsheet className="h-4 w-4" />} />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-bold">Ledger</h2>
          <span className="text-xs text-zinc-500">newest first</span>
        </div>
        <div className="overflow-x-auto">
          <table id="recovery-table" className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((e) => (
                <tr key={e.id} className="transition hover:bg-white/[0.015]">
                  <td className="px-6 py-3.5 font-mono text-xs text-zinc-500">
                    {new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone={e.source === "fraud_dispute" ? "high" : e.source === "appeal_reinstatement" ? "volt" : e.source === "fee_audit" ? "medium" : "low"}>
                      {SOURCE_LABEL[e.source] ?? e.source}
                    </Badge>
                  </td>
                  <td className="max-w-[380px] px-6 py-3.5 text-xs text-zinc-400">{e.description}</td>
                  <td className="px-6 py-3.5 text-right font-mono font-semibold">
                    {money(e.amount)}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {ent.subscription_status !== "active" && (
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h3 className="font-bold">Free tier reads the leaks. Paid plans help you close them.</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Starter unlocks unlimited scans, monthly full re-audits and appeal drafting. You already found {money(recovered + pending)} of leakage.
            </p>
          </div>
          <Link href="/app/billing" className="btn-primary">
            See plans
          </Link>
        </div>
      )}
    </div>
  );
}
