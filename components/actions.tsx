"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Copy, Check, DollarSign } from "lucide-react";

export function AIActionButton({
  endpoint,
  payload,
  label,
  doneLabel,
  variant = "primary",
  disabled,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  doneLabel?: string;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={run}
        disabled={busy || disabled || done}
        className={variant === "primary" ? "btn-primary !px-4 !py-2 !text-xs" : "btn-ghost !px-4 !py-2 !text-xs"}
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {done ? (doneLabel ?? "Generated — refresh kept") : label}
      </button>
      {done && (
        <button onClick={() => { setDone(false); router.refresh(); }} className="!px-4 !py-2 text-[11px] text-zinc-500 transition hover:text-zinc-300">
          Generate again
        </button>
      )}
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </div>
  );
}

export function CopyButton({ text, small = false }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className={
        small
          ? "chip border-white/10 bg-white/[0.04] text-zinc-400 transition hover:text-white"
          : "btn-ghost"
      }
    >
      {copied ? <Check className={small ? "h-3 w-3" : "h-4 w-4"} /> : <Copy className={small ? "h-3 w-3" : "h-4 w-4"} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function RecoverButton({
  body,
  label,
}: {
  body: { type: "alert" | "case" | "fee"; id: string; amount: number; description?: string };
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/actions/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Request failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={run}
        disabled={busy || done}
        className="btn-ghost !px-3 !py-1.5 !text-xs"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5" />}
        {done ? "Logged to ledger" : label}
      </button>
      {error && <span className="text-[11px] text-rose-400">{error}</span>}
    </span>
  );
}
