import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as {
    fullName?: string;
    shopName?: string;
    region?: string;
  };

  const supa = supabaseServer();
  const patchProfile: Record<string, unknown> = {};
  if (body.fullName?.trim()) patchProfile.full_name = body.fullName.trim();
  const patchShop: Record<string, unknown> = {};
  if (body.shopName?.trim()) patchShop.name = body.shopName.trim();
  if (body.region?.trim()) patchShop.region = body.region.trim();

  if (Object.keys(patchProfile).length) {
    const { error } = await supa
      .from("profiles")
      .update(patchProfile)
      .eq("id", session.userId);
    if (error) {
      return NextResponse.json({ ok: false, error: "Could not update profile" }, { status: 500 });
    }
  }

  if (session.shop && Object.keys(patchShop).length) {
    const { error } = await supa
      .from("shops")
      .update(patchShop)
      .eq("id", session.shop.id)
      .eq("owner", session.userId);
    if (error) {
      return NextResponse.json({ ok: false, error: "Could not update shop" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
