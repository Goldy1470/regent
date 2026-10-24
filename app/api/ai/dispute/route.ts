import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";
import { denyReason, DENIAL_MESSAGES } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
import { DISPUTE_SYSTEM, generate } from "@/lib/ai";
import { disputeTemplate } from "@/lib/templates";

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

  const { caseId } = (await req.json()) as { caseId?: string };
  if (!caseId) {
    return NextResponse.json({ ok: false, error: "caseId required" }, { status: 400 });
  }

  if (!rateLimit(`packet:${session.userId}`, 10, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const denial = await denyReason(session.userId, "packet");
  if (denial) {
    return NextResponse.json({ ok: false, error: DENIAL_MESSAGES[denial] }, { status: 402 });
  }

  const supa = supabaseServer();
  const { data: rc } = await supa
    .from("return_cases")
    .select("*")
    .eq("id", caseId)
    .eq("owner", session.userId)
    .single();

  if (!rc) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  const fb = () =>
    disputeTemplate({
      order: rc.order_id,
      product: rc.product,
      reason: rc.reason,
      amount: rc.refund_amount,
      flags: rc.flags,
      customer: rc.customer,
      buyerHistory: rc.customer_history,
    });

  const { data: packet, source } = await generate<string>({
    system: DISPUTE_SYSTEM,
    temperature: 0.4,
    maxTokens: 760,
    user: JSON.stringify({
      order: rc.order_id,
      customer: rc.customer,
      product: rc.product,
      reason: rc.reason,
      refund_amount: rc.refund_amount,
      fraud_score: rc.fraud_score,
      flags: rc.flags,
      buyer_history: rc.customer_history,
      shop: shop.name,
    }),
    fallback: fb,
  });

  const finalPacket =
    source === "openai" && typeof packet === "string" && packet.length > 120
      ? packet
      : fb();

  const nextStatus = rc.status === "recovered" ? "recovered" : "disputed";

  const { error } = await supa
    .from("return_cases")
    .update({ dispute_packet: finalPacket, status: nextStatus })
    .eq("id", rc.id)
    .eq("owner", session.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not save packet" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { packet: finalPacket, engine: source, status: nextStatus },
  });
}
