"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Clock3, FileText, Wrench, Zap } from "lucide-react";
import RegentMark from "./regent-mark";

type Row =
  | { kind: "user"; text: string }
  | { kind: "tool"; label: string }
  | { kind: "agent"; title: string; text: string }
  | { kind: "tooldelta"; label: string; note: string };

const SCRIPTS: Record<string, { rows: Row[]; ledger: { label: string; value: string } }> = {
  Violations: {
    rows: [
      { kind: "user", text: "Regent - my Rose Glow listing just got removed. No reason given." },
      { kind: "tool", label: "policy-corpus match: CG-2411 claims rules" },
      { kind: "tooldelta", label: "19 policy layers", note: "cosmetic claims · promos · IP · certifications" },
      {
        kind: "agent",
        title: "Root cause found.",
        text: "'Fades acne scars in 7 days' reads as a drug-level claim (CG-2411). This is a first-offense, appealable within the evidence window.",
      },
      {
        kind: "agent",
        title: "Appeal packet drafted.",
        text: "Corrected cosmetic-legal copy + ingredient certificate references + 48h response commitment. Ready for your approval.",
      },
      { kind: "user", text: "Approved. File it and re-list." },
      {
        kind: "agent",
        title: "Submitted via Seller Center.",
        text: "I will monitor the review queue and the AHR point ledger. $22.8k/mo of affiliate GMV is riding on this SKU.",
      },
    ],
    ledger: { label: "GMV protected by this appeal", value: "$22,800/mo" },
  },
  Fraud: {
    rows: [
      { kind: "user", text: "TT-88210 is an empty-parcel refund. It has to be fake." },
      { kind: "tool", label: "buyer-fingerprint sweep: claims 90d" },
      { kind: "tooldelta", label: "fraud score 92", note: "11 prior claims · same pattern across 3 shops · depot scan mismatch (412g -> 305g)" },
      {
        kind: "agent",
        title: "Dispute packet built.",
        text: "Three exhibits: carrier scan report, buyer claim-history card, depot weight ledger. Filed under the abuse provisions.",
      },
      { kind: "user", text: "Send it before the evidence window closes." },
      {
        kind: "agent",
        title: "Filed.",
        text: "Tracking the case. If reversed, $24.99 returns to your next settlement and this fingerprint joins the blacklist.",
      },
    ],
    ledger: { label: "Expected recovery", value: "$24.99 -> payout" },
  },
  Fees: {
    rows: [
      { kind: "user", text: "Margin on the Lipstick SKU feels wrong this week." },
      { kind: "tool", label: "settlement diff vs published rate card" },
      { kind: "tooldelta", label: "9 anomalies in 30d", note: "doubled admin fees · wrong referral tier · phantom surcharge" },
      {
        kind: "agent",
        title: "Fee audit complete.",
        text: "Return-admin charged $9.99 against the $5.00 cap, repeated across 31 orders. Total overcharge: $154.69 this batch.",
      },
      { kind: "user", text: "Claim the whole batch." },
      {
        kind: "agent",
        title: "Correction request drafted.",
        text: "Batch-level reconciliation with settlement CSV attached. Credits land in the next settlement cycle, tracked in your recovery ledger.",
      },
    ],
    ledger: { label: "Crediting back to you", value: "$154.69" },
  },
};

const TABS = ["Violations", "Fraud", "Fees"] as const;

export default function HeroDemo() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Violations");
  const [step, setStep] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);

  const script = useMemo(() => SCRIPTS[tab].rows, [tab]);
  const ledger = SCRIPTS[tab].ledger;

  useEffect(() => {
    setStep(0);
    setDone(false);
  }, [tab]);

  useEffect(() => {
    if (step >= script.length) {
      setDone(true);
      const hold = setTimeout(() => {
        setRound((r) => r + 1);
        setStep(0);
        setDone(false);
      }, 3400);
      return () => clearTimeout(hold);
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 700 : 1050);
    return () => clearTimeout(t);
  }, [step, script.length, round]);

  const visible = script.slice(0, Math.min(step, script.length));

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-100 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-indigo-100 blur-3xl" />

      <div className="relative rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(10,10,10,0.04),0_16px_48px_-16px_rgba(10,10,10,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-900">
              <RegentMark className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="font-mono text-xs text-neutral-400">
              Aurea Beauty Lab - Regent console
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                  tab === t ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[380px] space-y-2.5 px-5 py-5 sm:min-h-[360px]">
          {visible.length === 0 && (
            <div className="flex h-72 items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="l-dot h-1.5 w-1.5 rounded-full bg-neutral-300"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}

          {visible.map((row, i) => {
            if (row.kind === "user") {
              return (
                <div key={`${round}-${i}`} className="l-ease flex justify-end">
                  <p className="max-w-md rounded-2xl rounded-br-sm bg-neutral-900 px-4 py-2.5 text-left text-[13px] leading-snug text-white">
                    {row.text}
                  </p>
                </div>
              );
            }
            if (row.kind === "tool") {
              return (
                <div key={`${round}-${i}`} className="l-ease pl-1">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-[11px] text-neutral-600">
                    <Wrench className="h-3 w-3 text-neutral-400" />
                    {row.label}
                    <span className="flex items-center gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-emerald-600">done</span>
                    </span>
                  </span>
                </div>
              );
            }
            if (row.kind === "tooldelta") {
              return (
                <div key={`${round}-${i}`} className="l-ease pl-4">
                  <div className="rounded-lg border border-neutral-200 bg-white px-3.5 py-2">
                    <p className="text-xs font-semibold text-neutral-900">{row.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">{row.note}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={`${round}-${i}`} className="l-ease flex items-start gap-2.5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-volt-600">
                  <RegentMark className="h-3.5 w-3.5 text-white" />
                </span>
                <div className="max-w-xl">
                  <p className="text-[13px] font-semibold text-neutral-900">{row.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-600">{row.text}</p>
                </div>
              </div>
            );
          })}

          {!done && step > 0 && step <= script.length && script[step - 1]?.kind === "agent" && (
            <div className="flex items-center gap-1.5 pl-9">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="l-dot h-1 w-1 rounded-full bg-neutral-300"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
          )}
        </div>

        <div
          key={`${tab}-${done}`}
          className={`flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3.5 transition-colors ${
            done ? "border-emerald-100 bg-emerald-50/60" : "border-neutral-100 bg-neutral-50/60"
          }`}
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            recovery ledger
          </span>
          <span
            className={`flex items-center gap-2 text-[13px] font-semibold ${
              done ? "l-tick text-emerald-700" : "text-neutral-400"
            }`}
          >
            {done ? <Check className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
            {ledger.label}: {ledger.value}
          </span>
        </div>
      </div>

      <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 text-center text-[11px] text-neutral-400">
        <Zap className="h-3 w-3 shrink-0" />
        Every packet lands paused for your approval. Nothing files itself.
        <FileText className="hidden h-3 w-3 sm:inline" />
        <ChevronRight className="hidden h-3 w-3 sm:inline" />
      </div>
    </div>
  );
}
