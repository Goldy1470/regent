import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";
import { FEE_SYSTEM, generate } from "@/lib/ai";
import { feeTemplate } from "@/lib/templates";
import { money } from "@/lib/session";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const shop = session.shop;
  if (!shop) {
    return NextResponse.json({ ok: false, error: "No shop connected" }, { status: 400 });
  }

  const { feeId } = (await req.json()) as { feeId?: string };
  if (!feeId) {
    return NextResponse.json({ ok: false, error: "feeId required" }, { status: 400 });
  }

  const supa = supabaseServer();
  const { data: fee } = await supa
    .from("fee_anomalies")
    .select("*")
    .eq("id", feeId)
    .eq("owner", session.userId)
    .single();

  if (!fee) {
    return NextResponse.json({ ok: false, error: "Anomaly not found" }, { status: 404 });
  }

  const fb = () =>
    feeTemplate({
      order: fee.order_id,
      feeType: fee.fee_type,
      expected: fee.expected,
      charged: fee.charged,
      delta: fee.delta,
    });

  const { data: explanation, source } = await generate<string>({
    system: FEE_SYSTEM,
    temperature: 0.3,
    maxTokens: 500,
    user: JSON.stringify({
      order: fee.order_id,
      fee_type: fee.fee_type,
      expected: fee.expected,
      charged: fee.charged,
      overcharge: fee.delta,
      shop: shop.name,
    }),
    fallback: fb,
  });

  const finalExplanation =
    source === "openai" && typeof explanation === "string" && explanation.length > 60
      ? explanation
      : fb();

  const nextStatus = fee.status === "recovered" ? "recovered" : "filed";

  const { error } = await supa
    .from("fee_anomalies")
    .update({ explanation: finalExplanation, status: nextStatus })
    .eq("id", fee.id)
    .eq("owner", session.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not save explanation" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { explanation: finalExplanation, engine: source, credit: money(fee.delta) },
  });
}
