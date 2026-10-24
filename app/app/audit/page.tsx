import { supabaseServer } from "@/lib/supabase/server";
import { getSession, money } from "@/lib/session";
import { Badge, PageHeader } from "@/components/ui";
import AuditUploader from "@/components/audit-uploader";
import { CURRENT_POLICY } from "@/lib/policy/rate-card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) return null;

  const supa = supabaseServer();
  const { data: runs } = await supa
    .from("audit_imports")
    .select("*")
    .eq("owner", session.userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const history = runs ?? [];
  const last = history[0];

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="leak audit"
        title="Leak Audit"
        sub="Upload Seller Center settlement exports. Regent recomputes every fee against the versioned rate card and shows exactly where TikTok charged more than policy says it should."
        live
        pulseLabel={`policy ${CURRENT_POLICY.id}`}
        right={
          session.shop?.mode === "demo" ? <Badge tone="low">demo data mode</Badge> : <Badge tone="ok">live data</Badge>
        }
      />

      <AuditUploader mode={session.shop?.mode === "demo" ? "demo" : "live"} />

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-bold">Audit history</h2>
          <span className="text-xs text-zinc-500">newest first</span>
        </div>
        {history.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-zinc-500">
            No audits yet — your first upload lands the money-first number.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {history.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-200">{r.filename}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">
                    {(Array.isArray(r.months) ? r.months : []).join(", ")} · policy {r.policy_version} ·{" "}
                    {r.anomalies_found} anomalies · {r.rows_checked} rows checked
                    {r.rows_skipped > 0 ? ` · ${r.rows_skipped} skipped (no item lines)` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-rose-300">{money(r.leaked_total)}</p>
                  <p className="text-[11px] text-zinc-500">leaked evidence</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {last && (
        <div className="panel p-6 text-xs leading-relaxed text-zinc-500">
          <b className="text-zinc-300">Read the evidence, then dispute by line.</b> Never promise a
          recovery — Seller Center ticket decisions vary. Your audit cites the exact policy version
          and rate-card line behind every expected amount, which is what support asks for.
        </div>
      )}
    </div>
  );
}
