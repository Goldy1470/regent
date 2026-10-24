import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireApiSession } from "@/lib/session";
import { SCAN_SYSTEM, generateStructured } from "@/lib/ai";
import { offlineScan } from "@/lib/rules";
import type { Finding } from "@/lib/types";

export const maxDuration = 60;

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

  const body = (await req.json()) as {
    title?: string;
    description?: string;
    keywords?: string;
    category?: string;
  };

  const title = (body.title ?? "").trim();
  if (title.length < 4) {
    return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
  }

  if (session.profile.plan === "free") {
    const supa = supabaseServer();
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const { count } = await supa
      .from("listing_scans")
      .select("id", { count: "exact", head: true })
      .gte("created_at", start.toISOString());
    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { ok: false, error: "Free plan limit: 10 scans/month. Upgrade in Billing." },
        { status: 402 }
      );
    }
  }

  const shop = session.shop;
  if (!shop) {
    return NextResponse.json(
      { ok: false, error: "No shop connected yet" },
      { status: 400 }
    );
  }

  const fb = offlineScan({
    title,
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
      title,
      description: body.description ?? "",
      keywords: body.keywords ?? "",
      category: body.category ?? "General",
      shop_region: shop.region,
    }),
    fallback: () => fb,
  });

  const result = source === "openai" ? merge(data, fb) : fb;

  const supa = supabaseServer();
  const { data: inserted, error } = await supa
    .from("listing_scans")
    .insert({
      shop_id: shop.id,
      owner: session.userId,
      title,
      category: body.category ?? "General",
      input: {
        description: body.description ?? "",
        keywords: body.keywords ?? "",
      },
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
