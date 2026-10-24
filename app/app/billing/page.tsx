import { getSession } from "@/lib/session";
import { Badge, statusTone, PageHeader, StatCard } from "@/components/ui";
import PlanButtons from "@/components/plan-buttons";
import { PLANS, ANNUAL_DISCOUNT_LABEL } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session) return null;

  const ent = session.entitlement;
  const plan = PLANS[ent.plan] ?? PLANS.free;
  const active = ent.subscription_status === "active";

  return (
    <div className="space-y-8">
      <PageHeader
        crumb="billing"
        title="Billing — powered by Dodo Payments"
        sub="Flat subscription (monthly or annual). No success fee in v1: every dollar recovered is yours. Manage cards, invoices and cancellation in the Dodo customer portal."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current plan"
          value={plan.name}
          sub={
            active
              ? `Subscription active (${ent.period})`
              : ent.subscription_status === "past_due"
                ? "Payment failed — update your card in the portal"
                : ent.subscription_status === "cancelled"
                  ? "Cancelled — resubscribe below"
                  : "Free tier"
          }
          tone={active ? "ok" : ent.subscription_status === "past_due" ? "critical" : "low"}
        />
        <StatCard
          label="Plan limits"
          value={`${plan.auditsMonth === 9999 ? "Unlimited" : plan.auditsMonth} audits · ${plan.scansMonth} scans`}
          sub={`${plan.shops} shop${plan.shops === 1 ? "" : "s"}`}
          tone="volt"
        />
        <StatCard
          label="Success fee"
          value="0%"
          sub="You keep every recovered dollar in v1"
          tone="ok"
        />
      </div>

      <div className="flex items-center gap-2">
        <Badge tone={statusTone(ent.subscription_status)}>
          subscription: {ent.subscription_status}
        </Badge>
        {ent.dodo_subscription_id && (
          <span className="font-mono text-[11px] text-zinc-600">
            sub {ent.dodo_subscription_id.slice(0, 14)}…
          </span>
        )}
        <span className="font-mono text-[11px] text-zinc-600">
          lifetime recovered: ${ent.recovered_lifetime.toFixed(2)}
        </span>
      </div>

      <PlanButtons currentPlan={ent.plan} status={ent.subscription_status} />

      <div className="panel p-6 text-sm text-zinc-400">
        <h3 className="font-bold text-zinc-200">Dodo setup checklist (one time)</h3>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed">
          <li>Create a Dodo Payments account, use <b>Test Mode</b> keys first.</li>
          <li>Create {ANNUAL_DISCOUNT_LABEL.toUpperCase()} products: Starter $29/mo + $290/yr, Growth $59/mo + $590/yr.</li>
          <li>Put the product IDs into <code>.env.local</code> as DODO_PRODUCT_STARTER / DODO_PRODUCT_GROWTH / DODO_PRODUCT_STARTER_ANNUAL / DODO_PRODUCT_GROWTH_ANNUAL, plus your DODO_API_KEY.</li>
          <li>Add a webhook endpoint to <code>/api/dodo/webhook</code> for subscription.active / subscription.updated / subscription.cancelled / subscription.expired / subscription.payment_failed / payment.succeeded, and set DODO_WEBHOOK_KEY (required in production — the handler fails closed).</li>
          <li>Dunning: enable retry emails in Dodo ’s subscription settings; the webhook flips the account to past_due on payment.failed and Growth layouts keep working until period end.</li>
          <li>Portal: the “Manage subscription” button opens Dodo’s hosted customer session.</li>
        </ol>
      </div>
    </div>
  );
}
