"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, FileSpreadsheet, ArrowRight, TriangleAlert } from "lucide-react";

type ProbeResult = {
  headers: string[];
  rows: string[][];
  mapping: Record<string, string> | null;
  confidence: number;
  policy_version: string;
};

export default function AuditUploader({ mode }: { mode: "demo" | "live" }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    leaked_total: number;
    anomalies_found: number;
    months: string[];
  } | null>(null);

  async function onProbe() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ingest", {
        method: "PUT",
        body: fd,
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: ProbeResult };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Probe failed");
      setProbe(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Probe failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRun(mappingOverride?: Record<string, string> | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mappingOverride || (probe?.mapping && probe.mapping !== null)) {
        fd.append(
          "mapping",
          JSON.stringify(mappingOverride ?? (probe && probe.mapping ? probe.mapping : undefined))
        );
      }
      const res = await fetch("/api/ingest", { method: "POST", body: fd });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { leaked_total: number; anomalies_found: number; months: string[] };
      };
      if (!json.ok || !json.data) throw new Error(json.error ?? "Audit failed");
      setResult(json.data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <UploadCloud className="h-4 w-4 text-volt-400" /> Upload a settlement export
            </h2>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-zinc-500">
              Seller Center → Finance → Settlements → export CSV/XLSX. The engine recomputes what
              you <em>should</em> have been charged from the versioned rate card and shows the delta.
              {mode === "demo" && " In DEMO mode this file still runs fully labeled as demo evidence."}
            </p>
          </div>
          <input
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setProbe(null);
              setResult(null);
              setError(null);
            }}
            className="block text-xs text-zinc-400 file:mr-3 file:rounded-full file:border-0 file:bg-volt-500 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-ink-950"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 text-xs text-amber-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={!file || busy} onClick={onProbe} className="btn-ghost !text-xs">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            1 · Detect columns
          </button>
          <button
            disabled={!file || busy}
            onClick={() => onRun(null)}
            className="btn-primary !text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            2 · Run leak audit
          </button>
        </div>
      </div>

      {probe && (
        <div className="panel p-6">
          <h3 className="text-sm font-bold">Detected mapping</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Confidence {(probe.confidence * 100).toFixed(0)}% · {probe.rows.length} sample rows · policy {probe.policy_version}
          </p>
          <div className="mt-3 grid gap-1.5 text-[11px] font-mono text-zinc-400 sm:grid-cols-2">
            {[
              ["order_id", probe.mapping?.order_id],
              ["settlement_id", probe.mapping?.settlement_id],
              ["settle_date", probe.mapping?.settle_date],
              ["type", probe.mapping?.type],
              ["amount", probe.mapping?.amount],
              ["sku", probe.mapping?.sku],
            ].map(([field, col]) => (
              <div key={field} className="flex items-center gap-2">
                <span className="text-zinc-500">{field}</span>
                <span className={col ? "text-volt-400" : "text-rose-400"}>→ {col ?? "not present"}</span>
              </div>
            ))}
          </div>
          {!probe.mapping && (
            <p className="mt-2 text-[11px] text-rose-300">
              Failed to mandatory-detect order_id / type / amount. Confirm this is a Settlement export.
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-volt-500/30 bg-gradient-to-b from-volt-500/[0.09] to-transparent p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-volt-400">
            Your likely leak · {result.months.join(", ")}
          </p>
          <p className="mt-2 font-mono text-5xl font-extrabold text-white">
            ${result.leaked_total.toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            {result.anomalies_found} line item{result.anomalies_found === 1 ? "" : "s"} where the
            charged amount beat the rate card. Evidence saved to Fee Auditor — dispute by hand or per
            evidence note.
          </p>
          <a href="/app/fees" className="btn-primary mt-4 inline-flex !text-xs">
            Open evidence →
          </a>
        </div>
      )}
    </div>
  );
}
