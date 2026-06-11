/**
 * Descarga un CSV compatible con Excel es-CO: BOM UTF-8 y separador ";".
 */
export function downloadCsv(
  filename: string,
  rows: (string | number)[][],
): void {
  const escape = (value: string | number): string => {
    const s = String(value);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv =
    "\uFEFF" + rows.map((r) => r.map(escape).join(";")).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Número plano para Excel es-CO: coma decimal, sin símbolo de moneda. */
export function csvNumber(n: number): string {
  return String(n).replace(".", ",");
}
