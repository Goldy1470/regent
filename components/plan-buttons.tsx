"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PLANS, ANNUAL_DISCOUNT_LABEL } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export default function PlanButtons({
  currentPlan,
  status,
}: {
  currentPlan: PlanId;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  async function checkout(plan: PlanId) {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: { url: string } };
      if (!json.ok || !json.data?.url) {
        throw new Error(
          json.error ??
            "Checkout failed. Dodo Payments needs a test API key + product IDs in .env.local (DODO_MODE=test, DODO_API_KEY, DODO_PRODUCT_*)."
        );
      }
      window.location.href = json.data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1 text-xs">
        {(["monthly", "annual"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              period === p ? "bg-volt-500 text-ink-950" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {p === "annual" ? `Annual — ${ANNUAL_DISCOUNT_LABEL}` : "Monthly"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["starter", "growth"] as PlanId[]).map((id) => {
          const p = PLANS[id];
          const price = period === "annual" ? p.annualPrice : p.price;
          return (
            <div
              key={id}
              className={`panel flex flex-col p-6 ${
                p.highlight ? "border-volt-500/50 bg-volt-500/[0.05]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{p.name}</h3>
                {p.highlight && (
                  <span className="chip border-volt-500/30 bg-volt-500/10 text-volt-400">
                    popular
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">${price}</span>
                <span className="text-xs text-zinc-500">{period === "annual" ? "/yr" : "/mo"}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-volt-400">
                0% success fee — you keep every recovered dollar
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-zinc-400">
                {p.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <button
                onClick={() => checkout(id)}
                disabled={busy !== null || (currentPlan === id && status === "active")}
                className={`mt-5 ${p.highlight ? "btn-primary" : "btn-ghost"} w-full !text-xs`}
              >
                {busy === id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {currentPlan === id && status === "active"
                  ? "Current plan"
                  : currentPlan === "free"
                    ? `Subscribe to ${p.name}`
                    : `Switch to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => router.refresh()}
        className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
      >
        Subscribed already? The Dodo webhook activates your plan automatically — click to refresh status.
      </button>
    </div>
  );
}
