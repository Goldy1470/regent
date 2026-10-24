import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supa = supabaseServer();
    const { error } = await supa.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const proto = request.headers.get("x-forwarded-proto");
      const dest = forwardedHost
        ? `${proto ?? "https"}://${forwardedHost}/app/dashboard`
        : `${origin}/app/dashboard`;
      return NextResponse.redirect(dest);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
