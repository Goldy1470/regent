import { redirect } from "next/navigation";
import Shell from "@/components/shell";
import { getSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.shop) {
    redirect("/onboarding");
  }

  const supa = supabaseServer();
  const { data: criticals } = await supa
    .from("alerts")
    .select("id, title, severity")
    .eq("owner", session.userId)
    .eq("status", "open")
    .in("severity", ["critical", "high"])
    .order("created_at", { ascending: false })
    .limit(9);

  return (
    <Shell
      profile={session.profile}
      entitlement={session.entitlement}
      shop={session.shop}
      criticalAlerts={criticals ?? []}
    >
      {children}
    </Shell>
  );
}
