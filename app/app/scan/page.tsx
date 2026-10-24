import { supabaseServer } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import ScanForm from "@/components/scan-form";
import { Badge, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const session = await getSession();
  if (!session) return null;
  const supa = supabaseServer();

  const { data: scans } = await supa
    .from("listing_scans")
    .select("*")
    .eq("owner", session.userId)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="listing scanner"
        title="Pre-listing Scanner"
        sub="Every strike starts as a draft listing. Score it here first — the AI flags policy traps and hands you the rewritten copy."
        live
        pulseLabel="policy corpus v26.3"
      />

      <ScanForm />

      {scans && scans.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-bold">Recent scans</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {scans.map((s) => (
              <div key={s.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {s.category} · {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <Badge tone={s.risk_score >= 75 ? "ok" : s.risk_score >= 50 ? "high" : "critical"}>
                    {s.risk_score} · {s.verdict}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(s.findings as { rule: string; severity: string }[]).slice(0, 3).map((f, i) => (
                    <li key={i} className="text-xs text-zinc-400">
                      <span className="text-zinc-500">•</span> {f.rule}
                      <span className="ml-1 text-zinc-600">({f.severity})</span>
                    </li>
                  ))}
                  {(s.findings as unknown[]).length > 3 && (
                    <li className="text-xs text-zinc-600">+{(s.findings as unknown[]).length - 3} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
