import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { supabaseServer } from "@/lib/supabase/server";
import { planFromProductId } from "@/lib/dodo";

type DodoEvent = {
  type: string;
  data: {
    subscription_id?: string;
    product_id?: string;
    customer_id?: string;
    customer?: { customer_id?: string };
    metadata?: { user_id?: string };
  };
};

export async function POST(req: Request) {
  const key = process.env.DODO_WEBHOOK_KEY;

  let event: DodoEvent;
  if (key) {
    const headers: Record<string, string> = {};
    req.headers.forEach((v, h) => {
      headers[h] = v;
    });
    const raw = await req.text();
    try {
      const wh = new Webhook(key);
      wh.verify(raw, {
        "webhook-id": headers["webhook-id"] ?? "",
        "webhook-timestamp": headers["webhook-timestamp"] ?? "",
        "webhook-signature": headers["webhook-signature"] ?? "",
      });
      event = JSON.parse(raw) as DodoEvent;
    } catch {
      return NextResponse.json({ ok: false, error: "Bad signature" }, { status: 401 });
    }
  } else {
    event = (await req.json()) as DodoEvent;
  }

  const supa = supabaseServer();

  const metaUser = event.data?.metadata?.user_id;
  const productId = event.data?.product_id;
  const plan = planFromProductId(productId);
  const subscriptionId = event.data?.subscription_id ?? null;
  const customerId =
    event.data?.customer_id ?? event.data?.customer?.customer_id ?? null;

  const resolveProfile = async () => {
    if (metaUser) return metaUser;
    if (subscriptionId) {
      const { data } = await supa
        .from("profiles")
        .select("id")
        .eq("dodo_subscription_id", subscriptionId)
        .single();
      return data?.id ?? null;
    }
    return null;
  };

  const userId = await resolveProfile();

  switch (event.type) {
    case "subscription.active":
    case "subscription.updated":
    case "payment.succeeded": {
      if (userId) {
        const patch: Record<string, unknown> = {
          subscription_status: "active",
        };
        if (plan) patch.plan = plan;
        if (subscriptionId) patch.dodo_subscription_id = subscriptionId;
        if (customerId) patch.dodo_customer_id = customerId;
        await supa.from("profiles").update(patch).eq("id", userId);
      }
      break;
    }
    case "subscription.expired":
    case "subscription.cancelled": {
      if (userId) {
        await supa
          .from("profiles")
          .update({ subscription_status: "cancelled", plan: "free" })
          .eq("id", userId);
      }
      break;
    }
    case "subscription.payment_failed": {
      if (userId) {
        await supa
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", userId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
