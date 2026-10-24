import { getSession } from "@/lib/session";
import { Badge, statusTone, PageHeader, StatCard } from "@/components/ui";
import PlanButtons from "@/components/plan-buttons";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) return null;

  const plan = PLANS[session.profile.plan] ?? PLANS.free;
  const active = session.profile.subscription_status === "active";

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="billing"
        title="Billing — powered by Dodo Payments"
        sub="Subscriptions bill monthly through Dodo. The recovered-funds fee is invoiced separately from your ledger — you can audit every dollar it's computed from in the Recovery Wallet."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current plan"
          value={plan.name}
          sub={
            active
              ? "Subscription active"
              : session.profile.subscription_status === "past_due"
                ? "Payment failed — update your Dodo card"
                : session.profile.subscription_status === "cancelled"
                  ? "Cancelled — resubscribe below"
                  : "Free tier"
          }
          tone={active ? "ok" : session.profile.subscription_status === "past_due" ? "critical" : "low"}
        />
        <StatCard
          label="Plan limits"
          value={`${plan.shops} shop${plan.shops === 1 ? "" : "s"} · $${plan.recoveryCap.toLocaleString()}`}
          sub="Recovery processing ceiling per month"
          tone="volt"
        />
        <StatCard
          label="Success fee"
          value={`${(plan.performanceFee * 100).toFixed(0)}%`}
          sub="On funds recovered through disputes, fee credits and reinstatements"
          tone="high"
        />
      </div>

      <div className="flex items-center gap-2">
        <Badge tone={statusTone(session.profile.subscription_status)}>
          subscription: {session.profile.subscription_status}
        </Badge>
        {session.profile.dodo_subscription_id && (
          <span className="font-mono text-[11px] text-zinc-600">
            sub {session.profile.dodo_subscription_id.slice(0, 14)}…
          </span>
        )}
      </div>

      <PlanButtons currentPlan={session.profile.plan} status={session.profile.subscription_status} />

      <div className="panel p-6 text-sm text-zinc-400">
        <h3 className="font-bold text-zinc-200">Dodo setup checklist (one time)</h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed">
          <li>Create a Dodo Payments account, use <b>Test Mode</b> keys first.</li>
          <li>Create three monthly products: Starter $49, Scale $149, Pro $399.</li>
          <li>Put their product IDs into <code>.env.local</code> as DODO_PRODUCT_STARTER / SCALE / PRO, plus your DODO_API_KEY.</li>
          <li>Add a webhook endpoint to <code>/api/dodo/webhook</code> for subscription.active / subscription.updated / subscription.cancelled / subscription.expired / subscription.payment_failed / payment.succeeded, and set DODO_WEBHOOK_KEY.</li>
          <li>Go live: flip DODO_MODE=live with live keys. Recovered-funds invoicing stays manual from the ledger until you connect invoicing.</li>
        </ol>
      </div>
    </div>
  );
}
