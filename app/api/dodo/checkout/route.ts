import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/session";
import { createDodoCheckout } from "@/lib/dodo";

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const { plan } = (await req.json()) as { plan?: string };
  if (!plan || !["starter", "scale", "pro"].includes(plan)) {
    return NextResponse.json({ ok: false, error: "Invalid plan" }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.nextUrl.origin;

  const result = await createDodoCheckout({
    plan,
    email: session.email ?? "seller@example.com",
    name: session.profile.full_name ?? "Seller",
    userId: session.userId,
    origin,
  });

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: { url: result.url } });
}
