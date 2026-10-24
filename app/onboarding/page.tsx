import { redirect } from "next/navigation";
import OnboardingForm from "./form";
import { getSession } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const supa = supabaseServer();
  const { count } = await supa
    .from("shops")
    .select("id", { count: "exact", head: true })
    .eq("owner", session.userId);

  if ((count ?? 0) > 0) {
    redirect("/app/dashboard");
  }

  return <OnboardingForm />;
}
