import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";
import { SCAN_SYSTEM, generateStructured } from "@/lib/ai";
import { offlineScan } from "@/lib/rules";
import { denyReason, DENIAL_MESSAGES } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";
import type { Finding } from "@/lib/types";

export const maxDuration = 60;
export const runtime = "nodejs";

const Severity = z.enum(["critical", "high", "medium", "low"]);

const ScanSchema = z.object({
  risk_score: z.number().int().min(0).max(100).default(60),
  verdict: z
    .enum(["Publish-ready", "Fix before publish", "Do not publish"])
    .default("Fix before publish"),
  findings: z
    .array(
      z.object({
        rule: z.string().default("Listing risk"),
        severity: Severity.default("medium"),
        detail: z.string(),
        fix: z.string().default(""),
      })
    )
    .max(6)
    .default([]),
});

type AiScan = z.infer<typeof ScanSchema>;

function merge(ai: AiScan, fb: ReturnType<typeof offlineScan>) {
  const findings: Finding[] = ai.findings.filter((f) => f.detail);
  const risk_score = ai.risk_score;
  return {
    risk_score,
    verdict: ai.verdict,
    findings: findings.length ? findings : fb.findings,
  };
}

export async function POST(req: NextRequest) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = z
    .object({
      title: z.string().trim().min(4).max(220),
      description: z.string().max(8000).optional(),
      keywords: z.string().max(600).optional(),
      category: z.string().max(80).optional(),
    })
    .safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (!rateLimit(`scan:${session.userId}`, 12, 60_000).ok) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const denial = await denyReason(session.userId, "scan");
  if (denial) {
    return NextResponse.json({ ok: false, error: DENIAL_MESSAGES[denial] }, { status: 402 });
  }

  const shop = session.shop;
  if (!shop) {
    return NextResponse.json(
      { ok: false, error: "No shop connected yet" },
      { status: 400 }
    );
  }

  const fb = offlineScan({
    title: body.title,
    description: body.description ?? "",
    keywords: body.keywords ?? "",
    category: body.category,
  });

  const { data, source } = await generateStructured({
    schema: ScanSchema,
    system: SCAN_SYSTEM,
    temperature: 0.2,
    maxTokens: 1100,
    user: JSON.stringify({
      title: body.title,
      description: body.description ?? "",
      keywords: body.keywords ?? "",
      category: body.category ?? "General",
      shop_region: shop.region,
    }),
    fallback: () => fb,
  });

  const result = source === "openai" ? merge(data, fb) : fb;

  const { data: inserted, error } = await supabaseServer()
    .from("listing_scans")
    .insert({
      shop_id: shop.id,
      owner: session.userId,
      title: body.title,
      category: body.category ?? "General",
      input: {
        description: body.description ?? "",
        keywords: body.keywords ?? "",
      },
      ruleset_version: fb.ruleset_version,
      risk_score: result.risk_score,
      verdict: result.verdict,
      findings: result.findings,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { ok: false, error: "Could not save scan" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: { scan: inserted, engine: source },
  });
}
