import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!rateLimit(`recover:${session.userId}`, 20, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json()) as {
    type?: "alert" | "case" | "fee";
    id?: string;
    note?: string;
  };

  if (!body.type || !body.id) {
    return NextResponse.json(
      { ok: false, error: "type and id required" },
      { status: 400 }
    );
  }

  // SECURITY: amounts are computed server-side from stored rows via SECURITY
  // DEFINER SQL functions. The client can never assert how much money moved.
  const functionName =
    body.type === "fee" ? "recover_fee" : body.type === "case" ? "recover_return" : null;

  if (body.type === "fee") {
    const { data, error } = await supabaseServer()
      .rpc("recover_fee", { p_fee_id: body.id, p_note: body.note ?? null });
    if (error) {
      return NextResponse.json({ ok: false, error: "Recovery not permitted on this row" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, data: { amount: data } });
  }

  if (body.type === "case") {
    const { data, error } = await supabaseServer()
      .rpc("recover_return", { p_case_id: body.id, p_note: body.note ?? null });
    if (error) {
      return NextResponse.json({ ok: false, error: "Recovery not permitted on this row" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, data: { amount: data } });
  }

  if (functionName === null) {
    // alerts: reinstatement events are logged by support tooling, not the user
    const { error } = await supabaseServer()
      .from("alerts")
      .update({ status: "resolved" })
      .eq("id", body.id)
      .eq("owner", session.userId);
    if (error) {
      return NextResponse.json({ ok: false, error: "Could not update alert" }, { status: 500 });
    }
    // lifetime stays an entitlements concern; no client-provided money values.
    return NextResponse.json({ ok: true, data: { amount: 0 } });
  }

  return NextResponse.json({ ok: false }, { status: 400 });
}
