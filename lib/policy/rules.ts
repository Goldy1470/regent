/**
 * VERSIONED listing-claims corpus. Each rule states which dataset it comes
 * from and what phrasing it triggers. Word boundaries are deliberate:
 * "cure" must not fire on "secure", "treat" must not fire on pet "treats".
 * Update via new entries + bumping POLICY_RULESET_VERSION. See /docs/policy-versions.md.
 */
import type { Finding } from "../types";

export const RULESET_VERSION = "US-2026-08";

type Rule = {
  pattern: RegExp;
  rule: string;
  severity: Finding["severity"];
  detail: string;
  fix: string;
  /** lowest number of occurrences before it fires (1 = single use) */
  minOccurrences?: number;
};

const RULES: Rule[] = [
  {
    pattern: /\bfda[\s-]*(approved|certified|cleared|registered)\b/i,
    rule: "Regulatory overreach (FDA)",
    severity: "critical",
    detail:
      "FDA approval/clearance claims are not granted to cosmetics; this phrase triggers automatic removal and stacks AHR points.",
    fix: "Replace with 'Made in an FDA-registered facility' only if you hold the registration letter, or remove entirely.",
  },
  {
    // \b stops 'cure' matching inside 'secure'/'manicure'. Pair the drug nouns.
    pattern:
      /\b(cured?|heals?|treats?|treats?\s+(?:and\s+)?\w*|repairs?)\s+(?:\w+\s+){0,2}(acne|eczema|psoriasis|rosacea|dandruff|infection|inflammation|eczematous)\b/i,
    rule: "Drug-level medical claim",
    severity: "critical",
    detail:
      "Verbs like 'cure/treat/heal' bound to a medical condition reclassify a cosmetic as a drug claim under platform policy.",
    fix: "Swap to cosmetic language: 'supports the look of clearer skin', 'helps smooth the appearance of texture'.",
  },
  {
    pattern: /\bcure\b[^.]{0,24}\b(disease|illness|infection)\b/i,
    rule: "Disease / cure-all claim",
    severity: "critical",
    detail: "Curing a disease or infection is a drug claim. Cosmetics cannot make it.",
    fix: "Remove the claim; keep the product benefit purely cosmetic and visible.",
  },
  {
    pattern: /\bclinically\s+(?:proven|tested\s+to\s+cure|demonstrated\s+to\s+treat)\b/i,
    rule: "Clinically proven (medical)",
    severity: "critical",
    detail: "'Clinically proven' needs the study on file; used loosely, it is a misleading-claims violation.",
    fix: "Use 'in a consumer study of N participants, X saw Y' with the survey you actually hold.",
  },
  {
    pattern: /\bguarantee(?:d|s)?\b|\b100%\s+(?:effective|results|satisfaction)\b|\bsatisfaction\s+guaranteed\b/i,
    rule: "Results guarantee",
    severity: "high",
    detail:
      "Outcome guarantees cannot be substantiated and reviewers pattern-match them to misleading claims.",
    fix: "Remove guarantee language; express your returns policy as store policy instead.",
  },
  {
    pattern: /\bweight\s+loss\b|\bslimming\b|\bburn(?:s)?\s+fat\b|\bfat\s+burning\b|\bdetox(?:es|ify(?:ing))?\b/i,
    rule: "Restricted category claim",
    severity: "critical",
    detail:
      "Weight loss / fat burn / detox claims sit in restricted categories requiring documentation cosmetics sellers rarely hold.",
    fix: "Drop the claim or list under the approved wellness category with the required certificates.",
  },
  {
    pattern: /\bmiracle\b|\bholy\s+grail\b|\blife[\s-]*changing\b/i,
    rule: "Puffery stacking",
    severity: "medium",
    detail: "'Miracle' reads as deceptive exaggeration; repeated use weakens your shop's compliance profile.",
    fix: "Replace with concrete product features: ingredient %, performance test, or finish description.",
  },
  {
    // 'organic formulation' ok-ish only with cert; 'organic skincare' / '100% organic' fires.
    pattern:
      /\b(?:100%|all[\s-]*|certified\s+)?organic\b(?![^.(]{0,30}\b(certificate|certified|USDA|COSMOS)\b)|\bchemical[\s-]*free\b/i,
    rule: "Unverified materials claim",
    severity: "medium",
    detail:
      "'Certified organic' and 'chemical-free' require certification or are inaccurate (everything is chemistry).",
    fix: "Use 'plant-derived' with the INCI list attached, or state the certifying body and certificate number.",
  },
  {
    pattern: /\breplica\b|\bdupe(?:s)?\b|\binspired\s+by\s+(?:dior|louis|gucci|chanel|ysl|nike|apple)\b/i,
    rule: "IP risk",
    severity: "critical",
    detail: "Replica/dupe framing invites IP takedowns, which count toward permanent-removal thresholds.",
    fix: "Reposition as an original product line; describe scent/style without brand references.",
  },
  {
    pattern: /\b(?:cheapest|lowest\s+price|best\s+price\s+online)\b/i,
    rule: "Price claim inconsistency",
    severity: "high",
    detail: "Price superlatives cannot be verified across listings and windows; they draw bogus-review and pricing-violation flags.",
    fix: "Delete, or schedule a real, dated discount in Seller Center and reference that window.",
  },
  {
    pattern: /\b(?:tonight\s+only|today\s+only|expires?\s+soon|limited\s+(?:time|stock|offer)|last\s+chance)\b/i,
    rule: "Promo-window inconsistency",
    severity: "high",
    detail: "Urgency claims must match an active, dated discount in Seller Center; mismatches are a top violation source.",
    fix: "Only run promo copy while the matching discount is live, and show the end date.",
  },
  {
    pattern: /\bfree\s+gift\b|\bbuy\s+(?:\d+\s+)?get\s+(?:\d+\s+)?free\b/i,
    rule: "Unclear promotional mechanics",
    severity: "medium",
    detail: "Promo mechanics need explicit terms or they are flagged as misleading promotions.",
    fix: "State terms plainly: 'free travel-size sample with orders over $30 while supplies last, through Nov 30'.",
  },
  {
    pattern: /\bworld'?s?\s+best\b|\bbest\s+ever\b|\bnumber\s+one\s+(?:in|on)\s+tiktok\b|\b#1\s+(?:sellers?)?\s*on\s+tiktok\b/i,
    rule: "Unsupported superlative",
    severity: "medium",
    detail: "Unsourced superlatives weaken listing trust scoring and invite review.",
    fix: "Convert to verifiable language or cite the actual metric ('rated 4.8/5 by 2,400 buyers').",
  },
  {
    pattern: /\bhalal\s+certified\b|\bkosher(?:\s+certified)?\b/i,
    rule: "Certification claim",
    severity: "high",
    detail: "Religious/dietary certification claims require the actual certificate on file; casual use is a strike magnet.",
    fix: "Keep only if a valid certificate exists; attach it to the listing's compliance documents.",
  },
  {
    pattern: /\bhypoallergenic\b|\bsafe\s+for\s+(?:all|every)\s+skin\s+types?\b/i,
    rule: "Skin-safety claim",
    severity: "medium",
    detail: "'Hypoallergenic' / 'safe for all skin' implies dermatological testing most listings cannot document.",
    fix: "State the actual test ('patch-tested on 52 subjects') or reframe: 'formulated without added fragrance'.",
  },
  {
    pattern: /\b(?:plastic\s+)?surgery\b|\bbotox\b|\b(?:in\s+a\s+)?bottle\s+of\s+botox\b|\bfiller\s+alternative\b|\bliposuction\b/i,
    rule: "Procedure-adjacent claim",
    severity: "critical",
    detail: "Comparisons to medical procedures trigger cosmetics-as-drug classification.",
    fix: "Remove entirely; describe the visible effect ('adds temporary plumping shine') instead.",
  },
];

const SPAM = /([!]{3,}|\s{4,})/;

export function offlineScan(input: {
  title: string;
  description?: string;
  keywords?: string;
  category?: string;
}) {
  const haystack = [input.title ?? "", input.description ?? "", input.keywords ?? ""].join(" · ");

  const findings: (Finding & { rule_version?: string; matched?: string })[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    const m = rule.pattern.exec(haystack);
    if (!seen.has(rule.rule)) {
      // exec per rule keeps the matched phrase for citation
      if (m) {
        findings.push({
          rule: rule.rule,
          severity: rule.severity,
          detail: rule.detail,
          fix: rule.fix,
          matched: m[0].slice(0, 60),
        });
        seen.add(rule.rule);
      }
    }
  }

  const words = (input.title ?? "").split(/\s+/);
  const shouty = words.filter(
    (w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]{3,}/.test(w)
  );
  if (shouty.length >= 2) {
    findings.push({
      rule: "Title shouting (ALL CAPS)",
      severity: "low",
      detail: `${shouty
        .slice(0, 3)
        .join(", ")} appear in full caps — TikTok de-weights shouty titles and reviewers associate them with spam listings.`,
      fix: "Keep only the product name in caps; use sentence case elsewhere.",
    });
  }

  if (!/\d/.test(haystack) && input.category !== "Digital") {
    findings.push({
      rule: "Missing specs (size/count)",
      severity: "medium",
      detail:
        "No quantities or sizes detected — a leading cause of 'item not as described' returns in your category.",
      fix: "Add explicit dimensions (ml / gram / count) to the title or first description line.",
    });
  }

  if (SPAM.test(haystack)) {
    findings.push({
      rule: "Spam punctuation",
      severity: "low",
      detail: "Long '!!!' runs read as low-trust content to the listing reviewer.",
      fix: "Cap emojis at 2 per title, drop repeated exclamation marks.",
    });
  }

  const weights: Record<Finding["severity"], number> = {
    critical: 33,
    high: 19,
    medium: 9,
    low: 4,
  };

  const penalty = findings.reduce((acc, f) => acc + weights[f.severity], 0);
  const risk_score = Math.max(12, Math.min(97, 96 - penalty));
  const verdict: "Publish-ready" | "Fix before publish" | "Do not publish" =
    risk_score >= 75 ? "Publish-ready" : risk_score >= 50 ? "Fix before publish" : "Do not publish";

  return {
    findings,
    risk_score,
    verdict,
    ruleset_version: RULESET_VERSION,
  };
}
