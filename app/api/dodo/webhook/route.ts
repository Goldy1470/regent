import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { createHash } from "node:crypto";
import { processEvent, type DodoEvent } from "@/lib/dodo-sync";

/**
 * Dodo Payments webhook. Fail-closed: without DODO_WEBHOOK_KEY this endpoint
 * refuses events in production; in dev (no key) unsigned payloads are applied
 * for local DX only. Idempotent via the webhook-id header (webhook_events).
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = process.env.DODO_WEBHOOK_KEY;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ ok: false, error: "Webhook key not configured" }, { status: 500 });
    }
    const early = (await req.json()) as DodoEvent;
    const result = await processEvent("", early, null);
    return NextResponse.json({ ok: true, ...result });
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, h) => {
    headers[h] = v;
  });
  const raw = await req.text();
  const webhookId =
    headers["webhook-id"] ?? createHash("sha256").update(raw).digest("base64").slice(0, 32);

  try {
    const wh = new Webhook(key);
    wh.verify(raw, {
      "webhook-id": headers["webhook-id"] ?? "",
      "webhook-timestamp": headers["webhook-timestamp"] ?? "",
      "webhook-signature": headers["webhook-signature"] ?? "",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad signature" }, { status: 401 });
  }

  const result = await processEvent(
    webhookId,
    JSON.parse(raw) as DodoEvent,
    raw
  );
  return NextResponse.json({ ok: true, ...result });
}
