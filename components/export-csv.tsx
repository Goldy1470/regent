"use client";

import { Download } from "lucide-react";

export default function ExportCsvButton({ filename }: { filename: string }) {
  function exportCsv() {
    const table = document.getElementById("recovery-table");
    if (!table) return;
    const rows: string[] = [];
    table.querySelectorAll("tr").forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll("th,td")).map(
        (c) => `"${(c.textContent ?? "").replace(/"/g, '""').trim()}"`
      );
      rows.push(cells.join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={exportCsv} className="btn-ghost !px-4 !py-2 !text-xs">
      <Download className="h-3.5 w-3.5" /> Export ledger CSV
    </button>
  );
}
