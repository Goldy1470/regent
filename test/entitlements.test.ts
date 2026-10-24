import { describe, expect, it } from "vitest";
import { nextPatch } from "@/lib/dodo-sync";
import { PLANS } from "@/lib/plans";
import { MappingSchema, detectMapping } from "@/lib/ingest/mapping";

describe("dodo webhook → entitlement patch (pure)", () => {
  it("activates plan on subscription.active with product mapping", () => {
    const p = nextPatch("subscription.active", { plan: "starter", period: "monthly" });
    expect(p).toEqual({
      subscription_status: "active",
      plan: "starter",
      period: "monthly",
    });
  });
  it("activates WITHOUT a plan when product_id is not mapped", () => {
    const p = nextPatch("payment.succeeded", { plan: null });
    expect(p).toEqual({ subscription_status: "active" });
  });
  it("payment failure → past_due", () => {
    expect(nextPatch("subscription.payment_failed", { plan: "growth" })).toMatchObject({
      subscription_status: "past_due",
    });
  });
  it("expiry does NOT collapse plan (renewal may fix it)", () => {
    expect(nextPatch("subscription.expired", { plan: "growth" })).toEqual({
      subscription_status: "cancelled",
    });
  });
  it("ignore unmapped events", () => {
    expect(nextPatch("simulation.started", { plan: null })).toBeNull();
  });
});

describe("entitlement plan caps", () => {
  it("free gets exactly 1 audit and 5 scans", () => {
    expect(PLANS.free.auditsMonth).toBe(1);
    expect(PLANS.free.scansMonth).toBe(5);
    expect(PLANS.free.price).toBe(0);
  });
  it("paid plans include packet drafting", () => {
    expect(PLANS.starter.packetsMonth).toBeGreaterThan(100);
    expect(PLANS.growth.shops).toBeGreaterThan(1);
    expect(PLANS.growth.weeklyAudit).toBe(true);
  });
  it("annual is 2 months free (12×monthly minus 2)", () => {
    expect(PLANS.starter.annualPrice).toBe(PLANS.starter.price * 10);
    expect(PLANS.growth.annualPrice).toBe(PLANS.growth.price * 10);
  });
});

describe("mapping schema strictness", () => {
  it("rejects unknown keys (no header injection)", () => {
    expect(
      MappingSchema.safeParse({ order_id: "A", type: "T", amount: "X", evil: "1" }).success
    ).toBe(false);
  });
  it("requires the three mandatory fields", () => {
    expect(MappingSchema.safeParse({ order_id: "A" }).success).toBe(false);
    expect(MappingSchema.safeParse({ order_id: "A", type: "T", amount: "X" }).success).toBe(true);
  });
  it("detectMapping fails closed on garbage headers", () => {
    expect(detectMapping(["foo", "bar"], [["a", "b"]]).mapping).toBeNull();
  });
});
