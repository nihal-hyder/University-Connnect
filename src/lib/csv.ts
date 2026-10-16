/**
 * CSV encoding for organiser exports. Cells that a spreadsheet would treat as
 * a formula (=, +, -, @, tab, carriage return) are prefixed with a quote to
 * prevent CSV/formula injection from user-submitted answers.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 (Urdu names, etc.) correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvFilename(...parts: string[]) {
  return (
    parts
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) + ".csv"
  );
}
