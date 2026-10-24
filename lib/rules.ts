import type { Finding } from "./types";

type Rule = {
  pattern: RegExp;
  rule: string;
  severity: Finding["severity"];
  detail: string;
  fix: string;
};

const RULES: Rule[] = [
  {
    pattern: /fda\s+approved|fda\s+certified/i,
    rule: "Regulatory overreach (FDA)",
    severity: "critical",
    detail: "FDA approval is not granted to cosmetics; this phrase triggers automatic removal and stacks AHR points.",
    fix: "Replace with 'Made in an FDA-registered facility' only if you hold the registration letter, or remove entirely.",
  },
  {
    pattern: /cure|treats?|cures?\s+(acne|eczema|psoriasis)|clinically\s+proven|medical\s+grade/i,
    rule: "Drug-level medical claim",
    severity: "critical",
    detail: "Anything that 'cures', 'treats', or 'clinically proves' reclassifies a cosmetic as a drug claim under platform policy.",
    fix: "Swap to cosmetic language: 'supports the look of clearer skin', 'helps smooth the appearance of texture'.",
  },
  {
    pattern: /guarantee|guaranteed|100%\s+(effective|results)/i,
    rule: "Results guarantee",
    severity: "high",
    detail: "Guaranteed outcomes are impossible to substantiate and reviewers pattern-match them to misleading claims.",
    fix: "Remove guarantee language; if you offer a satisfaction policy, state it as store policy instead.",
  },
  {
    pattern: /weight\s+loss|slimming|burns?\s+fat|detox/i,
    rule: "Restricted category claim",
    severity: "critical",
    detail: "Weight loss / fat-burn / detox claims sit in restricted categories that require documentation TikTok rarely accepts from cosmetics.",
    fix: "Drop the claim entirely or list under the approved wellness category with required certificates.",
  },
  {
    pattern: /miracle|next\s+level\s+holy\s+grail|life\s*-\s*changing/i,
    rule: "Puffery stacking",
    severity: "medium",
    detail: "'Miracle' reads as deceptive exaggeration; repeated use weakens your shop's compliance profile.",
    fix: "Replace with concrete product features: ingredient %, performance test, or finish description.",
  },
  {
    pattern: /organic|natural\s+formulation|chemical[\s-]*free/i,
    rule: "Unverified materials claim",
    severity: "medium",
    detail: "'Organic' and 'chemical-free' require certification or are flatly inaccurate (everything is chemistry).",
    fix: "Use 'plant-derived' with the ingredient INCI list attached, or state the certifying body and certificate number.",
  },
  {
    pattern: /replica|dupe|inspired\s+by\s+(dior|louis|gucci|chanel|ysl)/i,
    rule: "IP risk",
    severity: "critical",
    detail: "Replica/dupe framing invites IP takedown, which counts toward permanent removal thresholds.",
    fix: "Reposition as an original product line: name your own brand, describe the scent profile without brand references.",
  },
  {
    pattern: /(cheapest|lowest\s+price|best\s+price\s+online)/i,
    rule: "Price claim inconsistency",
    severity: "high",
    detail: "Price-superlative claims are flagged because they can't be verified across listings and windows.",
    fix: "Delete, or schedule a real, dated discount in Seller Center and reference that window in video briefs.",
  },
  {
    pattern: /tonight\s+only|today\s+only|expires?\s+soon|limited\s+(stock|offer)/i,
    rule: "Promo-window inconsistency",
    severity: "high",
    detail: "Urgency claims must match an active, dated discount in Seller Center; mismatches are a top violation source.",
    fix: "Only run promo copy while the discount is live, and show the end date.",
  },
  {
    pattern: /free\s+gift|buy\s+get\s+free/i,
    rule: "Unclear promotional mechanics",
    severity: "medium",
    detail: "Promo mechanics need explicit terms (what, when, conditions) or they're flagged as misleading promotions.",
    fix: "State terms plainly: 'free travel-size sample with orders over $30 while supplies last, through Nov 30'.",
  },
  {
    pattern: /world'?s?\s+best|best\s+ever|number\s+one\s+(in|on)\s+tiktok/i,
    rule: "Unsupported superlative",
    severity: "medium",
    detail: "Superlatives that can't be sourced weaken listing trust scoring and invite review.",
    fix: "Convert to verifiable benefit language or cite the actual metric ('rated 4.8/5 by 2,400 buyers').",
  },
  {
    pattern: /halal|kosher\s+certified|islamically/i,
    rule: "Certification claim",
    severity: "high",
    detail: "Religious/dietary certification claims require the actual certificate on file; random use is a strike magnet.",
    fix: "Only keep if a valid certificate exists; attach it to the listing's compliance documents.",
  },
  {
    pattern: /hypoallergenic|safe\s+for\s+all\s+skin\s+types/i,
    rule: "Skin-safety claim",
    severity: "medium",
    detail: "'Hypoallergenic' / 'safe for all skin' implies dermatological testing most listings cannot document.",
    fix: "State the actual test ('dermatologist-tested on 52 subjects') or reframe: 'formulated without added fragrance'.",
  },
  {
    pattern: /surgery|botox|filler\s+alternative|liposuction/i,
    rule: "Procedure-adjacent claim",
    severity: "critical",
    detail: "Comparisons to medical procedures trigger cosmetics-as-drug classification.",
    fix: "Remove entirely; describe the visible effect ('adds temporary plumping shine') instead.",
  },
];

const SPAM = /(!{2,}|\s{3,}|[😤🤯🔥]{2,})/;

export function offlineScan(input: {
  title: string;
  description?: string;
  keywords?: string;
  category?: string;
}) {
  const haystack = [
    input.title ?? "",
    input.description ?? "",
    input.keywords ?? "",
  ].join(" · ");

  const findings: Finding[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    if (rule.pattern.test(haystack) && !seen.has(rule.rule)) {
      seen.add(rule.rule);
      findings.push({
        rule: rule.rule,
        severity: rule.severity,
        detail: rule.detail,
        fix: rule.fix,
      });
    }
  }

  const words = (input.title ?? "").split(/\s+/);
  const shouty = words.filter((w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]{3,}/.test(w));
  if (shouty.length >= 2) {
    findings.push({
      rule: "Title shouting (ALL CAPS)",
      severity: "low",
      detail: `${shouty.slice(0, 3).join(", ")} appear in full caps — TikTok de-weights shouty titles and reviewers associate them with spam listings.`,
      fix: "Keep only the product name in caps; use sentence case elsewhere.",
    });
  }

  if (!/\d/.test(`${haystack}`) && input.category !== "Digital") {
    findings.push({
      rule: "Missing specs (size/count)",
      severity: "medium",
      detail: "No quantities or sizes detected — a leading cause of 'item not as described' returns in your category.",
      fix: "Add explicit dimensions (ml / gram / count) to the title or first description line.",
    });
  }

  if (SPAM.test(haystack)) {
    findings.push({
      rule: "Spam punctuation",
      severity: "low",
      detail: "Emoji storms and '!!!' runs read as low-trust content to the listing reviewer.",
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
    risk_score >= 75
      ? "Publish-ready"
      : risk_score >= 50
        ? "Fix before publish"
        : "Do not publish";

  return { findings, risk_score, verdict };
}
