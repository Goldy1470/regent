"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check } from "lucide-react";

export default function SettingsForm({
  fullName,
  shopName,
  region,
}: {
  fullName: string;
  shopName: string;
  region: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [shop, setShop] = useState(shopName);
  const [reg, setReg] = useState(region);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name, shopName: shop, region: reg }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "Save failed");
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="panel space-y-5 p-6">
      <h2 className="font-bold">Shop & profile</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">Founder / operator name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Shop name</label>
          <input className="input" value={shop} onChange={(e) => setShop(e.target.value)} />
        </div>
        <div>
          <label className="label">Primary region</label>
          <select className="input" value={reg} onChange={(e) => setReg(e.target.value)}>
            {["US", "UK", "SEA (ID/TH/VN)", "PH", "MY", "SG", "CA", "EU (ES/DE/FR/IT)"].map((r) => (
              <option key={r} value={r} className="bg-ink-900">{r}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary !text-xs" disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save changes
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-mint-400">
            <Check className="h-3.5 w-3.5" /> Saved — console updated
          </span>
        )}
      </div>
    </form>
  );
}
