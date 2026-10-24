import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditSettlement, parseMoney, normalizeType } from "@/lib/ingest/fee-recompute";
import { applyMapping, normalizeDate, parseUpload } from "@/lib/ingest/csv";
import { detectMapping } from "@/lib/ingest/mapping";
import { fromGrid } from "@/lib/ingest/csv";
import Papa from "papaparse";

const csv = readFileSync("test/fixtures/settlement-us.csv", "utf-8");
const table = Papa.parse<string[]>(csv, { skipEmptyLines: "greedy" }).data as string[][];

const HEADERS = table[0];
const ROWS = table.slice(1);
const mapped = applyMapping({ headers: HEADERS, rows: ROWS, kind: "csv", total_rows: ROWS.length }, {
  order_id: "Order ID",
  settlement_id: "Settlement ID",
  settle_date: "Settled Time",
  type: "Type",
  description: "Description",
  amount: "Amount",
  sku: "SKU",
  quantity: "Quantity",
});

describe("money normalization", () => {
  it("handles seller-export variants", () => {
    expect(parseMoney("-$12.30")).toBe(-12.3);
    expect(parseMoney("$12.30-")).toBe(-12.3);
    expect(parseMoney("(12.30)")).toBe(-12.3);
    expect(parseMoney("1,299.00 USD")).toBe(1299);
    expect(parseMoney("")).toBeNull();
  });
  it("normalizes type aliases to canonical buckets", () => {
    expect(normalizeType("Referral fee")).toBe("referral");
    expect(normalizeType("Refund administration fee")).toBe("refund_admin");
    expect(normalizeType("Return admin. fee")).toBe("refund_admin");
    expect(normalizeType("Return shipping")).toBe("return_label");
    expect(normalizeType("Item Settlement Amount")).toBe("item");
    expect(normalizeType("Mystery adjustment")).toBe("other");
  });
  it("normalizes dates: ISO, US slash, excel serials", () => {
    expect(normalizeDate("2026-07-03 10:00:00 UTC")).toBe("2026-07-03");
    expect(normalizeDate("07/03/2026")).toBe("2026-07-03");
    expect(normalizeDate("46000")).toBe("2025-12-09");
    expect(normalizeDate("")).toBe("");
  });
});

describe("mapping detection", () => {
  it("auto-detects Seller Center finance export columns", () => {
    const { mapping, confidence } = detectMapping(HEADERS, ROWS);
    expect(mapping).not.toBeNull();
    expect(mapping!.order_id).toBe("Order ID");
    expect(mapping!.amount).toBe("Amount");
    expect(mapping!.type).toBe("Type");
    expect(confidence).toBeGreaterThan(0.5);
  });
  it("fails closed when no order/amount/type columns exist", () => {
    const { mapping } = detectMapping(["Foo", "Bar"], [["x", "y"]]);
    expect(mapping).toBeNull();
  });
});

describe("fee recompute on real-shaped export (July + Aug 2026)", () => {
  const typed = mapped.map((r) => ({ ...r, type: normalizeType(r.type) }));
  const result = auditSettlement(typed);

  it("finds every seeded overcharge with citations", () => {
    // referral: A-1001 ok (8%); A-1003 ok; A-1004 ok; A-1006 charged 8% but 6% applies from Aug 1
    const referral = result.anomalies.filter((a) => a.fee_type === "referral");
    expect(referral).toHaveLength(1);
    expect(referral[0].order_id).toBe("A-1006");
    expect(referral[0].expected).toBeCloseTo(6.0, 2);
    expect(referral[0].charged).toBeCloseTo(8.0, 2);
    expect(referral[0].citation).toContain("US-2026-08");

    // refund admin: 10.00 charged vs max(20% of 9.60, cap 5) = 1.92
    const admin = result.anomalies.find((a) => a.fee_type === "refund_admin");
    expect(admin).toBeTruthy();
    expect(admin!.order_id).toBe("A-1003");
    expect(admin!.expected).toBeCloseTo(1.92, 2);
    expect(admin!.delta).toBeCloseTo(8.08, 2);
    expect(admin!.citation).toContain("capped");

    // duplicate shipping: two -$4.00 lines → delta 4.00
    const shipping = result.anomalies.find((a) => a.fee_type === "shipping");
    expect(shipping).toBeTruthy();
    expect(shipping!.delta).toBeCloseTo(4.0, 2);

    // buyer-remorse return label -$7.50
    const label = result.anomalies.find((a) => a.fee_type === "return_cost");
    expect(label).toBeTruthy();
    expect(label!.delta).toBeCloseTo(7.5, 2);
  });

  it("undercharges are not counted as leaks", () => {
    // A-1002: 6% charged on an 8% export window → undercharge must NOT appear
    expect(result.anomalies.some((a) => a.order_id === "A-1002")).toBe(false);
  });

  it("totals: $21.58 leaked, months covered, skip counts", () => {
    expect(result.leaked_total).toBeCloseTo(21.58, 2);
    expect(result.months).toEqual(["2026-07", "2026-08"]);
    expect(result.skipped_rows).toBe(1); // A-1005 shipping-only group
    expect(result.anomalies.every((a) => a.citation.length > 20)).toBe(true);
  });
});

describe("upload parser", () => {
  it("parses an uploaded File object (csv path used by /api/ingest)", async () => {
    const bytes = new Uint8Array(readFileSync("test/fixtures/settlement-us.csv"));
    const file = new File([bytes as BlobPart], "settlement-us.csv", { type: "text/csv" });
    const t = await parseUpload(file);
    expect(t.kind).toBe("csv");
    expect(t.headers[0]).toBe("Order ID");
    expect(t.rows.some((r) => r[0] === "A-1006")).toBe(true);
    const grid = fromGrid([["metadata"], [...HEADERS], ...ROWS], "csv");
    expect(grid.headers[0]).toBe("Order ID");
  });
  it("handles excel serial dates inside xlsx grids", () => {
    expect(normalizeDate("46000")).toMatch(/^20\d{2}-\d{2}-\d{2}$/);
  });
});
