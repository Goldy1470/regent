/** File parsing: CSV/XLSX → header + string grid. XLSX bytes are parsed by SheetJS. */
import Papa from "papaparse";

export type ParsedTable = { headers: string[]; rows: string[][]; kind: "csv" | "xlsx"; total_rows: number };

const EXCEL_MIME = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export async function parseUpload(file: File): Promise<ParsedTable> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const isXlsx =
    EXCEL_MIME.includes(file.type) ||
    (bytes[0] === 0x50 && bytes[1] === 0x4b) || // zip magic = xlsx
    /\.xlsx?$/i.test(file.name);

  if (isXlsx) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(bytes, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
    return fromGrid(grid.map((r) => r.map((c) => String(c ?? ""))), "xlsx");
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  let parsed = Papa.parse<string[]>(text, { delimiter: "", skipEmptyLines: "greedy" });
  // Some Seller Center exports use TSV-ish columns inside CSV; fall back on tab.
  if (parsed.data[0] && parsed.data[0].length === 1 && text.includes("\t")) {
    parsed = Papa.parse<string[]>(text, { delimiter: "\t", skipEmptyLines: "greedy" });
  }
  return fromGrid(parsed.data as string[][], "csv");
}

export function fromGrid(grid: string[][], kind: "csv" | "xlsx"): ParsedTable {
  // Strip BOM + upcoming metadata lines: find the header row that contains 'order' or 'amount'
  let headerIdx = 0;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const norm = grid[i].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (norm.some((h) => h.includes("order")) || norm.some((h) => h.includes("amount"))) {
      headerIdx = i;
      break;
    }
  }
  const headers = grid[headerIdx].map((h, i) => (h.trim() ? h.trim() : `col${i + 1}`));
  const rows = grid.slice(headerIdx + 1).filter((r) => r.some((c) => c && c.trim()));
  return { headers, rows, kind, total_rows: rows.length };
}

/** Map string grid → typed SettlementRow list using a mapping object. */
export function applyMapping(
  table: ParsedTable,
  mapping: Record<string, string | undefined>
) {
  const idx = (field: string | undefined) =>
    field ? table.headers.indexOf(field) : -1;

  const iOrderId = idx(mapping.order_id);
  const iSettle = idx(mapping.settlement_id);
  const iDate = idx(mapping.settle_date);
  const iType = idx(mapping.type);
  const iDesc = idx(mapping.description);
  const iAmount = idx(mapping.amount);
  const iSku = idx(mapping.sku);
  const iQty = idx(mapping.quantity);

  return table.rows.map((row) => {
    const amountStr = iAmount >= 0 ? row[iAmount] : "";
    return {
      order_id: iOrderId >= 0 ? String(row[iOrderId] ?? "").trim() : "",
      settlement_id: iSettle >= 0 ? String(row[iSettle] ?? "").trim() : "",
      settle_date: normalizeDate(iDate >= 0 ? row[iDate] : ""),
      type: String((iType >= 0 ? row[iType] : "") || "").trim(),
      description: String((iDesc >= 0 ? row[iDesc] : "") || "").trim(),
      amount: parseMoneyStr(amountStr) ?? 0,
      sku: iSku >= 0 ? String(row[iSku] ?? "").trim() : null,
      quantity: safeInt(iQty >= 0 ? row[iQty] : "1", 1),
    };
  });
}

import { parseMoney, normalizeType } from "./fee-recompute";

const parseMoneyStr = (raw: string) => {
  const n = parseMoney(raw);
  return n === null ? null : n;
};

function safeInt(raw: string, fallback: number): number {
  const n = parseInt(String(raw).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Handles "2026-07-14 12:31:00 UTC", "07/14/2026", "14/07/2026", Excel serials. */
export function normalizeDate(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  // ISO-ish
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (us) {
    // Seller Center US exports are MM/DD/YYYY
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 40000 && serial < 70000) {
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return "";
}

export { normalizeType };
