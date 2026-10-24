"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ArrowRight, ArrowLeft, Store, Check, ScanSearch, ReceiptText, CreditCard, Radar, Sparkles } from "lucide-react";

const MODULES_PREVIEW = [
  { icon: ScanSearch, name: "Violation Shield", note: "6 enforcement events pre-staged" },
  { icon: ReceiptText, name: "Return Fraud Fighter", note: "10 scored claims, 4 abusers flagged" },
  { icon: CreditCard, name: "Fee Auditor", note: "$49 leak detected in settlements" },
  { icon: Radar, name: "SFRR Guardian", note: "3 SKUs above the affiliate gate" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("US");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, region }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Setup failed");
      router.push("/app/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
      setBusy(false);
    }
  }

  return (
    <main className="hero-grid flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-volt-500 to-volt-600 shadow-glow">
            <ShieldCheck className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">Revenue Shield</span>
          <span className="ml-auto font-mono text-xs text-zinc-600">step {Math.min(step, 2)}/2</span>
        </div>

        <div className="mb-4 flex gap-2">
          <div className={`h-1 flex-1 rounded-full transition ${step >= 1 ? "bg-volt-500" : "bg-white/10"}`} />
          <div className={`h-1 flex-1 rounded-full transition ${step >= 2 ? "bg-volt-500" : "bg-white/10"}`} />
        </div>

        <div className="panel-glass p-8">
          {step === 1 ? (
            <div className="animate-fade-up">
              <h1 className="text-2xl font-bold tracking-tight">Name your shop</h1>
              <p className="mt-1.5 text-sm text-zinc-400">
                This MVP runs in <b className="text-zinc-300">demo mode</b>: a realistic, synthetic
                TikTok Shop pre-loaded with live-grade data — so you can feel every module before the
                real API connector flips on.
              </p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label" htmlFor="shop">Shop name</label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      id="shop"
                      className="input pl-10"
                      placeholder="Aurea Beauty Lab"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="region">Primary region</label>
                  <select id="region" className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
                    {["US", "UK", "SEA (ID/TH/VN)", "PH", "MY", "SG", "CA", "EU (ES/DE/FR/IT)"].map((r) => (
                      <option key={r} value={r} className="bg-ink-900">{r}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={() => setStep(2)} className="btn-primary mt-7 w-full">
                Next: what the Shield pre-loads <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="animate-fade-up">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Everything loads in ~10s</h1>
                <Sparkles className="h-5 w-5 text-volt-400" />
              </div>
              <p className="mt-1.5 text-sm text-zinc-400">
                Your synthetic feed mirrors exactly what the live TikTok Shop Open API delivers.
              </p>
              <div className="mt-6 space-y-3">
                {MODULES_PREVIEW.map((m) => (
                  <div key={m.name} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-volt-500/25 bg-volt-500/10">
                        <m.icon className="h-4 w-4 text-volt-400" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{m.name}</p>
                        <p className="text-[11px] text-zinc-500">{m.note}</p>
                      </div>
                    </div>
                    <Check className="h-4 w-4 text-mint-500" />
                  </div>
                ))}
              </div>
              {error && <p className="mt-4 text-sm text-rose-400">{error}</p>}
              <div className="mt-7 flex gap-3">
                <button onClick={() => setStep(1)} className="btn-ghost !px-4" disabled={busy}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={submit} className="btn-primary flex-1" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Create the shop & open the console
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
