import { generateText, generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { z } from "zod";

export const AI_AVAILABLE = () => Boolean(process.env.OPENAI_API_KEY);

const aiModel = () => {
  const key = process.env.OPENAI_API_KEY ?? "";
  const provider = createOpenAI({ apiKey: key });
  return provider(process.env.AI_MODEL ?? "gpt-4o-mini");
};

type GenOptions<T> = {
  system: string;
  user: string;
  fallback: () => T;
  temperature?: number;
  maxTokens?: number;
};

export type GenResult<T> = { data: T; source: "openai" | "engine" };

export async function generate<T>(opts: GenOptions<T>): Promise<GenResult<T>> {
  if (!AI_AVAILABLE()) return { data: opts.fallback(), source: "engine" };

  try {
    const res = await generateText({
      model: aiModel(),
      system: opts.system,
      prompt: opts.user,
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxTokens ?? 900,
    });
    const text = res.text?.trim();
    if (!text) throw new Error("empty");
    return { data: text as unknown as T, source: "openai" };
  } catch {
    return { data: opts.fallback(), source: "engine" };
  }
}

type StructuredOptions<S extends z.ZodType> = {
  schema: S;
  system: string;
  user: string;
  fallback: () => z.infer<S>;
  temperature?: number;
  maxTokens?: number;
};

export async function generateStructured<S extends z.ZodType>(
  opts: StructuredOptions<S>
): Promise<GenResult<z.infer<S>>> {
  if (!AI_AVAILABLE()) return { data: opts.fallback(), source: "engine" };

  try {
    const res = await generateObject({
      model: aiModel(),
      schema: opts.schema,
      system: opts.system,
      prompt: opts.user,
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxTokens ?? 1100,
    });
    return { data: res.object, source: "openai" } as GenResult<z.infer<S>>;
  } catch {
    return { data: opts.fallback(), source: "engine" };
  }
}

export const SCAN_SYSTEM = `You are the compliance engine of Regent, an AI copilot for TikTok Shop sellers.
Given a draft product listing (title, description, keywords, category), return:
{
  "risk_score": integer 0-100 (100 = perfectly compliant, <40 must not be published),
  "verdict": "Publish-ready" | "Fix before publish" | "Do not publish",
  "findings": [{"rule": short name, "severity": "critical"|"high"|"medium"|"low", "detail": why it violates TikTok Shop policy, "fix": concrete rewritten suggestion}]
}
Calibrate to real TikTok Shop policy: cosmetic drug claims, guarantees, IP risk, promo/price inconsistency, misleading promos, certification claims, superlatives, missing size specs. Max 6 findings, ordered worst-first.`;

export const APPEAL_SYSTEM = `You write TikTok Shop violation appeal packets for Regent.
Given an alert (title/body/severity) and shop context, return a plain-text appeal: structured sections
(1) Issue summary, 2) What has already been corrected, 3) Corrected content ready to republish, 4) Explicit request to reinstate listing and reverse AHR points.
Tone: precise, factual, no fluff, no legal threats. Max 450 words.`;

export const DISPUTE_SYSTEM = `You write TikTok Shop return-abuse dispute packets for Regent.
Given a return case (order, customer, claim reason, refund amount, fraud flags, buyer history), return a plain-text dispute packet:
sections (1) Summary of dispute, 2) Evidence index numbered from the flags, 3) Buyer pattern context, 4) Request for refund reversal and payout restoration.
Tone: factual, evidence-first, professional. Max 420 words.`;

export const FEE_SYSTEM = `You explain fee anomalies found by Regent's TikTok Shop fee auditor.
Given fee type, expected vs charged amount, return a plain-text explanation: what most likely went wrong (per official TikTok Shop fee schedule), the exact evidence to attach (settlement line, rate card page, category assignment), and the requested credit. Max 220 words.`;
