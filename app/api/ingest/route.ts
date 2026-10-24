import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireApiSession } from "@/lib/session";
import { denyReason, DENIAL_MESSAGES } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/metrics";
import { parseUpload, applyMapping } from "@/lib/ingest/csv";
import { normalizeType, auditSettlement } from "@/lib/ingest/fee-recompute";
import { detectMapping, MappingSchema } from "@/lib/ingest/mapping";
import { CURRENT_POLICY, policyForDate } from "@/lib/policy/rate-card";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  if (!rateLimit(`ingest:${session.userId}`, 6, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  const denial = await denyReason(session.userId, "audit");
  if (denial) {
    return NextResponse.json({ ok: false, error: DENIAL_MESSAGES[denial] }, { status: 402 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Expected multipart form" }, { status: 400 });
  }
  const file = form.get("file");
  const shop = session.shop;
  if (!shop) {
    return NextResponse.json({ ok: false, error: "No shop connected yet" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Attach a CSV or XLSX export" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "File over 12MB — split into monthly exports" }, { status: 413 });
  }

  void track(session.userId, "upload_started", { size: file.size, name_len: file.name.length });

  let mapping;
  const mappingRaw = form.get("mapping");
  if (typeof mappingRaw === "string" && mappingRaw.length > 2) {
    const candidate = JSON.parse(mappingRaw);
    const check = MappingSchema.safeParse(candidate);
    if (!check.success) {
      return NextResponse.json({ ok: false, error: "Bad column mapping" }, { status: 400 });
    }
    mapping = check.data;
  }

  const table = await parseUpload(file);
  if (!table.rows.length) {
    return NextResponse.json({ ok: false, error: "No data rows found in the file" }, { status: 422 });
  }

  const detected = mapping ?? detectMapping(table.headers, table.rows).mapping;
  if (!detected || !("order_id" in detected) || !("type" in detected) || !("amount" in detected)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Could not detect columns named "Order ID", "Type" and "Amount". Supply a mapping JSON with {order_id, type, amount} header names.',
        headers: table.headers.slice(0, 24),
      },
      { status: 422 }
    );
  }

  void track(session.userId, "upload_mapped", { cols: table.headers.length });

  const typed = applyMapping(table, detected as unknown as Record<string, string>).map((r) => ({
    ...r,
    type: normalizeType(r.type),
  }));

  const result = auditSettlement(typed, shop.mode === "demo" ? undefined : undefined);

  // Store ONLY server-computed numbers (no client amounts anywhere).
  const admin = supabaseAdmin();
  const { data: run, error: runError } = await admin
    .from("audit_imports")
    .insert({
      owner: session.userId,
      shop_id: shop.id,
      filename: file.name.slice(0, 160),
      file_kind: table.kind,
      policy_version: policyForDate(new Date().toISOString()).id,
      source_kind: "settlement",
      mapping: detected as unknown as Record<string, string>,
      months: result.months,
      gross_settled: typed.filter((r) => r.type === "item").reduce((a, r) => a + r.amount, 0),
      leaked_total: result.leaked_total,
      anomalies_found: result.anomalies.length,
      rows_checked: result.checked_rows,
      rows_skipped: result.skipped_rows,
      sample_rows: table.rows.slice(0, 5),
    })
    .select("id")
    .single();

  if (runError || !run) {
    return NextResponse.json({ ok: false, error: "Could not store audit run" }, { status: 500 });
  }

  if (result.anomalies.length) {
    await admin.from("fee_anomalies").insert(
      result.anomalies.map((a) => ({
        audit_id: run.id,
        shop_id: shop.id,
        owner: session.userId,
        order_id: a.order_id,
        settlement_id: a.settlement_id,
        fee_type: a.fee_type,
        expected: a.expected,
        charged: a.charged,
        delta: a.delta,
        citation: a.citation,
        settle_date: a.settle_date ? a.settle_date.slice(0, 10) : null,
        status: "open",
      }))
    );
  }

  void track(session.userId, "audit_viewed", { leaked: result.leaked_total });

  return NextResponse.json({
    ok: true,
    data: {
      audit_id: run.id,
      policy_version: result.policy_version,
      months: result.months,
      leaked_total: result.leaked_total,
      anomalies_found: result.anomalies.length,
      rows_checked: result.checked_rows,
      rows_skipped: result.skipped_rows,
      top: result.anomalies.slice(0, 6),
      detected_mapping: detected,
      headers: table.headers,
    },
  });
}

/** Mapping probe endpoint reuses the same handler: POST /api/ingest?probe=1 returns detection only */
export async function PUT(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Attach a file" }, { status: 400 });
  }
  const table = await parseUpload(file);
  const { mapping, confidence } = detectMapping(table.headers, table.rows);
  return NextResponse.json({
    ok: true,
    data: { headers: table.headers, rows: table.rows.slice(0, 5), mapping, confidence, policy_version: CURRENT_POLICY.id },
  });
}
