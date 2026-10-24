/** No-PII funnel events: signup → upload → audit_viewed → checkout_started. */
import { supabaseAdmin } from "@/lib/supabase/admin";

export type FunnelEvent =
  | "signup"
  | "upload_started"
  | "upload_mapped"
  | "audit_viewed"
  | "checkout_started"
  | "portal_opened";

export async function track(userId: string | null, event: FunnelEvent, meta: Record<string, unknown> = {}) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
    await supabaseAdmin().from("product_events").insert({
      owner: userId,
      event,
      meta,
    });
  } catch {
    // analytics must never break the request path
  }
}
