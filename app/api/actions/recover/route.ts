import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const shop = session.shop;
  if (!shop) {
    return NextResponse.json({ ok: false, error: "No shop connected" }, { status: 400 });
  }

  const body = (await req.json()) as {
    type?: "alert" | "case" | "fee";
    id?: string;
    amount?: number;
    description?: string;
  };

  if (!body.type || !body.id || !body.amount || body.amount <= 0) {
    return NextResponse.json(
      { ok: false, error: "type, id and positive amount required" },
      { status: 400 }
    );
  }

  const supa = supabaseServer();

  const sourceMap = {
    alert: "appeal_reinstatement",
    case: "fraud_dispute",
    fee: "fee_audit",
  } as const;

  const description =
    body.description ??
    (body.type === "alert"
      ? "Appeal reinstated at-risk GMV back into monthly settlement"
      : `${sourceMap[body.type] === "fee_audit" ? "Fee credit" : "Dispute win"}: ${body.id.slice(0, 8)}`);

  const { error: eventError } = await supa.from("recovery_events").insert({
    shop_id: shop.id,
    owner: session.userId,
    source: sourceMap[body.type],
    amount: body.amount,
    status: "recovered",
    description,
  });
  if (eventError) {
    return NextResponse.json({ ok: false, error: "Could not log recovery" }, { status: 500 });
  }

  if (body.type === "alert") {
    await supa
      .from("alerts")
      .update({ status: "resolved" })
      .eq("id", body.id)
      .eq("owner", session.userId);
  } else if (body.type === "case") {
    await supa
      .from("return_cases")
      .update({ status: "recovered", recovered_amount: body.amount })
      .eq("id", body.id)
      .eq("owner", session.userId);
  } else {
    await supa
      .from("fee_anomalies")
      .update({ status: "recovered", recovered_amount: body.amount })
      .eq("id", body.id)
      .eq("owner", session.userId);
  }

  const lifetime = Number(session.profile.recovered_lifetime ?? 0) + body.amount;
  await supa
    .from("profiles")
    .update({ recovered_lifetime: lifetime })
    .eq("id", session.userId);

  return NextResponse.json({ ok: true, data: { amount: body.amount, lifetime } });
}
