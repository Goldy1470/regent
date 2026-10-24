import { NextResponse, type NextRequest } from "next/server";
import { ensureDemoShop } from "@/lib/seed";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string; region?: string };
  const shop = await ensureDemoShop({
    name: body.name?.trim() || undefined,
    region: body.region || undefined,
  });

  if (!shop) {
    return NextResponse.json(
      { ok: false, error: "Could not create shop. Check Supabase config." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: { shop_id: shop.id } });
}
