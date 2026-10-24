import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/session";
import { createDodoCheckout } from "@/lib/dodo";
import { PLANS } from "@/lib/plans";
import { track } from "@/lib/metrics";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: string; period?: string };
  const plan = body.plan ?? "";
  const period = body.period === "annual" ? "annual" : "monthly";
  if (!plan || !(plan in PLANS) || plan === "free") {
    return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin;

  const result = await createDodoCheckout({
    plan,
    period,
    email: session.email ?? "seller@example.com",
    name: session.profile.full_name ?? "Seller",
    userId: session.userId,
    origin,
  });

  void track(session.userId, "checkout_started", { plan, period });

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: { url: result.url } });
}
