"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ScanSearch, TriangleAlert, CheckCircle2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui";

type Finding = {
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
  fix: string;
};

type ScanResult = {
  risk_score: number;
  verdict: string;
  findings: Finding[];
};

const SEV_TONE: Record<Finding["severity"], string> = {
  critical: "border-rose-500/25 bg-rose-500/[0.08] text-rose-300",
  high: "border-amber-500/25 bg-amber-500/[0.08] text-amber-300",
  medium: "border-sky-500/25 bg-sky-500/[0.08] text-sky-300",
  low: "border-white/10 bg-white/[0.04] text-zinc-400",
};

function Gauge({ score }: { score: number }) {
  const tint =
    score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-24 w-24 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${tint} ${score}%, rgba(255,255,255,0.06) 0deg)`,
        }}
      >
        <div className="grid h-[70px] w-[70px] place-items-center rounded-full bg-ink-950">
          <span className="text-2xl font-extrabold" style={{ color: tint }}>
            {score}
          </span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-200">Listing health score</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {score >= 75
            ? "Publish-ready. Keep evidence copies of any claims you leave in."
            : score >= 50
              ? "Fixable. Apply the rewrites below before submission, then re-scan."
              : "Do not publish. This draft will strike your shop if submitted as-is."}
        </p>
      </div>
    </div>
  );
}

export default function ScanForm() {
  const router = useRouter();
  const [title, setTitle] = useState("Rose Glow Serum 30ml — Acne Treatment + Glass Skin, 30% OFF Tonight");
  const [category, setCategory] = useState("Beauty & Personal Care");
  const [description, setDescription] = useState(
    "Fades acne scars in 7 days with medical-grade niacinamide. Guaranteed results or free gift. Cheapest serum deal on TikTok."
  );
  const [keywords, setKeywords] = useState("acne cure, miracle serum, world's best glow");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [engine, setEngine] = useState<string>("");

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, keywords, category }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: { scan: ScanResult; engine: string } };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Scan failed");
      setResult(json.data.scan);
      setEngine(json.data.engine);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={run} className="panel h-fit space-y-5 p-6">
        <div>
          <label className="label">Listing title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="label">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "Beauty & Personal Care",
              "Fashion & Accessories",
              "Home & Kitchen",
              "Electronics",
              "Health & Wellness",
              "Toys & Baby",
            ].map((c) => (
              <option key={c} value={c} className="bg-ink-900">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[110px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Keywords / variant titles</label>
          <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          Scan listing before publish
        </button>
        <p className="text-center text-[11px] text-zinc-600">
          Compiles against TikTok Shop claims policy, price/promo consistency and IP risk.
        </p>
      </form>

      <div className="panel p-6">
        {result ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <Gauge score={result.risk_score} />
              <Badge tone={result.risk_score >= 75 ? "ok" : result.risk_score >= 50 ? "high" : "critical"}>
                {result.verdict}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-600">engine: {engine === "openai" ? "GPT-4o-mini" : "offline rule engine (add OPENAI_API_KEY for LLM rewrites)"}</p>

            {result.findings.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-mint-400/20 bg-mint-500/[0.06] p-4 text-sm text-mint-400">
                <CheckCircle2 className="h-4 w-4" /> No policy findings — clean draft.
              </div>
            ) : (
              <div className="space-y-3">
                {result.findings.map((f, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                        {f.severity === "critical" ? (
                          <TriangleAlert className="h-4 w-4 text-rose-400" />
                        ) : (
                          <Wrench className="h-4 w-4 text-amber-400" />
                        )}
                        {f.rule}
                      </span>
                      <span className={`chip ${SEV_TONE[f.severity]}`}>{f.severity}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{f.detail}</p>
                    <p className="mt-2 text-xs leading-relaxed text-mint-400">
                      Rewrite: {f.fix}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : busy ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin text-volt-500" />
            <p className="text-sm">Compiling against policy corpus…</p>
          </div>
        ) : (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-center text-zinc-500">
            <ScanSearch className="h-8 w-8 text-zinc-600" />
            <p className="max-w-xs text-sm">
              Paste a draft listing. The Shield predicts exactly which phrases turn into violations — before TikTok does it for you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
