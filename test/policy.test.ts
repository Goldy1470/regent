import { describe, expect, it } from "vitest";
import { CURRENT_POLICY, policyForDate, refundAdminFee, referralPercent } from "@/lib/policy/rate-card";
import { offlineScan, RULESET_VERSION } from "@/lib/policy/rules";

describe("policy rate card (versioned)", () => {
  it("picks the right snapshot for a settle date", () => {
    expect(policyForDate("2026-07-15").id).toBe("US-2026-07");
    expect(policyForDate("2026-08-01").id).toBe("US-2026-08");
    expect(policyForDate("2026-10-20").id).toBe("US-2026-08");
  });

  it("referral percent changes 8% -> 6% across Aug 2026", () => {
    expect(referralPercent(policyForDate("2026-07-15"), "beauty")).toBe(8);
    expect(referralPercent(policyForDate("2026-08-05"), "beauty")).toBe(6);
    expect(referralPercent(CURRENT_POLICY, undefined)).toBe(6); // default tier
    expect(referralPercent(CURRENT_POLICY, "collectibles")).toBe(15);
  });

  it("refund admin fee = 20% of referral capped at $5/SKU", () => {
    // $120 refund, 8% referral (July snapshot): referral 9.60 -> 20% = 1.92
    expect(refundAdminFee(policyForDate("2026-07-11"), 120)).toBeCloseTo(1.92, 2);
    // huge refund at 6%: referral 600 -> 120 -> 20% = 24 -> capped at 5
    expect(refundAdminFee(CURRENT_POLICY, 10000)).toBe(5);
    // tiny refund: referral 1.20 -> 0.24
    expect(refundAdminFee(CURRENT_POLICY, 20)).toBeCloseTo(0.24, 2);
  });
});

describe("listing rules corpus (word-boundary)", () => {
  const scan = (t: string, d = "") => offlineScan({ title: t, description: d });

  it("does NOT false-positive on 'secure', 'manicure', pet 'treats', food-adjacent text", () => {
    const r = scan(
      "Secure closure makeup bag with 12 pcs brushes",
      "Freeze-dried liver treats for dogs. Great training treats."
    );
    const rules = r.findings.map((f) => f.rule);
    expect(rules).not.toContain("Drug-level medical claim");
    expect(rules).not.toContain("Disease / cure-all claim");
  });

  it("does NOT false-positive on 'organic' when a certificate is named", () => {
    const r = scan("Gentle rose toner", "Made with organic ingredients, USDA certified organic certificate #44231");
    expect(r.findings.map((f) => f.rule)).not.toContain("Unverified materials claim");
  });

  it("flags real medical claims with citations (matched phrase)", () => {
    const r = scan("Glow Serum", "Treats acne in 7 days and heals eczema fast");
    const medical = r.findings.find((f) => f.rule === "Drug-level medical claim");
    expect(medical).toBeTruthy();
    expect(medical!.matched?.toLowerCase()).toContain("acne");
    expect(r.verdict).not.toBe("Publish-ready");
  });

  it("flags cure-all disease language and FDA phrases", () => {
    expect(scan("Miracle balm", "Cure for skin infection").findings.some((f) => f.rule === "Disease / cure-all claim")).toBe(true);
    const fda = scan("Rose cream FDA approved");
    expect(fda.findings.some((f) => f.rule === "Regulatory overreach (FDA)")).toBe(true);
    expect(fda.risk_score).toBeLessThan(60);
  });

  it("stamps the ruleset version on every scan", () => {
    expect(RULESET_VERSION).toBe("US-2026-08");
    expect(scan("whatever").ruleset_version).toBe("US-2026-08");
  });
});
