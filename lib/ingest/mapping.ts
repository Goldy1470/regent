/**
 * Column mapping for Seller Center exports (finance/settlement exports,
 * order exports, return exports). Header names differ per export type and
 * month; detection is data-driven so new aliases land in one place.
 */
import { z } from "zod";

export const FIELDS = [
  "order_id",
  "settlement_id",
  "settle_date",
  "type",
  "description",
  "amount",
  "sku",
  "quantity",
] as const;

export type Field = (typeof FIELDS)[number];

const OptionalField = z.string().min(1);

export const MappingSchema = z
  .object({
    order_id: OptionalField,
    settlement_id: OptionalField.optional(),
    settle_date: OptionalField.optional(),
    type: OptionalField,
    description: OptionalField.optional(),
    amount: OptionalField,
    sku: OptionalField.optional(),
    quantity: OptionalField.optional(),
  })
  .strict();
export type Mapping = z.infer<typeof MappingSchema>;

const NORM = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIASES: Record<Field, string[]> = {
  order_id: [
    "orderid", "orderno", "order", "ordernumber", "orderuuid", "orderidsku", "orderlineid",
    "ordersku", "shoporderid",
  ],
  settlement_id: ["settlementid", "settlementno", "settlementuuid", "statementsid", "statementid", "statement"],
  settle_date: [
    "settledate", "settledtime", "settledatetime", "settlementdate", "createdtime", "createdat",
    "date", "datetime", "transfertime", "ordertime", "refundtime",
  ],
  type: ["type", "transactiontype", "feetype", "adjustmenttype", "settledtype", "item"],
  description: ["description", "detail", "adjustmentdescription", "feename", "itemname", "productname", "reason"],
  amount: [
    "amount", "feeamount", "settlementamount", "adjustedamount", "totalamount", "value", "amt",
    "usd", "amountusd", "subtotal", "settlement", "money",
  ],
  sku: ["sku", "skuid", "skuidsku", "product", "productsku", "sellersku", "productidsku"],
  quantity: ["quantity", "qty", "quantitysku", "number", "count"],
};

export function detectMapping(headers: string[], sample: string[][]): { mapping: Mapping | null; confidence: number } {
  const norm = headers.map(NORM);
  const mapping: Record<string, string> = {};
  (Object.keys(ALIASES) as Field[]).forEach((f) => {
    for (const alias of ALIASES[f]) {
      const idx = norm.findIndex((h) => h === alias);
      if (idx >= 0) {
        mapping[f] = headers[idx];
        return;
      }
    }
  });
  // fuzzy: amount-ish last resort
  if (!mapping.amount) {
    const idx = norm.findIndex((h) => h.includes("amount") || h.includes("fee") || h.includes("settle"));
    if (idx >= 0) mapping.amount = headers[idx];
  }
  // type column often doubles as description ("Type: Referral Fee"); find loose type header
  if (!mapping.type) {
    const idx = headers.findIndex((h) => NORM(h).includes("type") || NORM(h).includes("adjustment"));
    if (idx >= 0) mapping.type = headers[idx];
  }

  let rowsScanned = 0;
  let moneyLikes = 0;
  for (const row of sample.slice(0, 30)) {
    const amountIdx = mapping.amount ? headers.indexOf(mapping.amount) : -1;
    if (amountIdx >= 0 && row.length > amountIdx) {
      const v = row[amountIdx];
      if (/[0-9]/.test(String(v)) && /[\-+$.,]/.test(String(v))) moneyLikes++;
    }
    rowsScanned++;
  }

  const confidence = Math.min(
    1,
    (Object.keys(mapping).length / FIELDS.length) * 0.6 + (rowsScanned && moneyLikes / rowsScanned) * 0.4
  );
  const ok = "order_id" in mapping && "amount" in mapping && "type" in mapping;
  return { mapping: (ok ? (mapping as Mapping) : null), confidence };
}
