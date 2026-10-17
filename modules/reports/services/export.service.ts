import "server-only";

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Sanitizes an individual CSV cell value against spreadsheet formula injection (CSV Injection).
 * Any cell value starting with '=', '+', '-', '@', '\t', or '\r' has an apostrophe prepended.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Formula injection mitigation
  if (FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // Escape double quotes and enclose in quotes if comma, newline, or quotes present
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts a structured dataset into an RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const sanitizedHeaders = headers.map(sanitizeCsvCell).join(",");
  const sanitizedRows = rows.map((row) => row.map(sanitizeCsvCell).join(",")).join("\r\n");

  // \uFEFF is UTF-8 Byte Order Mark for seamless rendering in Excel/Windows
  return `\uFEFF${sanitizedHeaders}\r\n${sanitizedRows}`;
}
