import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";
import { denyReason, DENIAL_MESSAGES } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
import { APPEAL_SYSTEM, generate } from "@/lib/ai";
import { appealTemplate } from "@/lib/templates";

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

  const { alertId } = (await req.json()) as { alertId?: string };
  if (!alertId) {
    return NextResponse.json({ ok: false, error: "alertId required" }, { status: 400 });
  }

  if (!rateLimit(`packet:${session.userId}`, 10, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const denial = await denyReason(session.userId, "packet");
  if (denial) {
    return NextResponse.json({ ok: false, error: DENIAL_MESSAGES[denial] }, { status: 402 });
  }

  const supa = supabaseServer();
  const { data: alert } = await supa
    .from("alerts")
    .select("*")
    .eq("id", alertId)
    .eq("owner", session.userId)
    .single();

  if (!alert) {
    return NextResponse.json({ ok: false, error: "Alert not found" }, { status: 404 });
  }

  const fb = () =>
    appealTemplate({
      shop: shop.name,
      title: alert.title,
      body: alert.body,
      ref: alert.platform_ref,
      ahr: alert.ahr_points,
    });

  const { data: packet, source } = await generate<string>({
    system: APPEAL_SYSTEM,
    temperature: 0.5,
    maxTokens: 800,
    user: JSON.stringify({
      shop: shop.name,
      region: shop.region,
      kind: alert.kind,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      reference: alert.platform_ref,
      ahr_points: alert.ahr_points,
    }),
    fallback: fb,
  });

  const finalPacket = source === "openai" && typeof packet === "string" ? packet : fb();
  const status = alert.status === "resolved" ? "resolved" : "appealing";

  const { error } = await supa
    .from("alerts")
    .update({ appeal_packet: finalPacket, status })
    .eq("id", alert.id)
    .eq("owner", session.userId);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not save packet" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { packet: finalPacket, engine: source, status } });
}
