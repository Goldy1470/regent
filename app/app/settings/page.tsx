import { getSession } from "@/lib/session";
import { PageHeader, Badge } from "@/components/ui";
import SettingsForm from "@/components/settings-form";
import { Plug, Cpu, CreditCard, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;
  const shop = session.shop;
  if (!shop) return null;

  const aiEngine = process.env.OPENAI_API_KEY ? "OpenAI gpt-4o-mini" : "Built-in offline rule engine";
  const dodoMode = process.env.DODO_API_KEY
    ? process.env.DODO_MODE === "live"
      ? "Dodo Payments — live keys"
      : "Dodo Payments — test keys"
    : "Dodo setup pending";

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="settings"
        title="Shop & system settings"
        sub="Console identity, feed mode and integration status. Live TikTok Shop connection arrives after platform developer approval — the tables below are already shaped for it."
      />

      <SettingsForm
        fullName={session.profile.full_name}
        shopName={shop.name}
        region={shop.region}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="panel p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Cpu className="h-4 w-4 text-volt-400" /> Integrations
          </h2>
          <div className="mt-4 space-y-3">
            {[
              { icon: Cpu, label: "AI engine", value: aiEngine, tone: process.env.OPENAI_API_KEY ? "ok" : "low" },
              { icon: CreditCard, label: "Payments", value: dodoMode, tone: process.env.DODO_API_KEY ? "ok" : "low" },
              { icon: Plug, label: "Commerce feed", value: shop.mode === "demo" ? "Demo mode (synthetic, realistic)" : "TikTok Shop Open API", tone: shop.mode === "demo" ? "low" : "ok" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <row.icon className="h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-[11px] text-zinc-500">{row.value}</p>
                  </div>
                </div>
                <Badge tone={row.tone}>{row.tone === "ok" ? "connected" : "standby"}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="panel relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full bg-volt-600/15 blur-3xl" />
          <h2 className="flex items-center gap-2 font-bold">
            <Plug className="h-4 w-4 text-mint-400" /> Going live (phase 2)
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Flip from synthetic feed to your real shop once the TikTok Shop Open API app is approved.
            The connector uses read-plus-representative scopes — listing, order, return and settlement
            endpoints — and the exact tables this console already runs on.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-zinc-500">
            <li>• Shop authorization & token refresh handled by the connector service</li>
            <li>• Hourly settlement diffs into the Fee Auditor</li>
            <li>• Webhook-driven alerts into Violation Shield within minutes of enforcement</li>
          </ul>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 text-xs text-zinc-400">
            <Lock className="h-4 w-4 shrink-0 text-mint-500" />
            Data boundary: first-party shop data only; no scraping, no third-party estimates enter your
            recovery ledger.
          </div>
        </div>
      </div>
    </div>
  );
}
