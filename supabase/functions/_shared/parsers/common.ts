// ──────────────────────────────────────────────
// Utilidades comunes de parsing (montos COP, fechas, limpieza)
// ──────────────────────────────────────────────

/**
 * Convierte un monto en texto a número. Maneja los dos formatos que usan
 * los bancos colombianos: "$123.456,78" (separador latino) y "$123,456.78".
 * Si solo hay un separador, se asume decimal cuando le siguen 1-2 dígitos
 * al final ("50,50") y miles cuando le siguen 3 ("50.000").
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");

  let normalized: string;
  if (lastDot !== -1 && lastComma !== -1) {
    // Ambos separadores: el último es el decimal
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = cleaned
      .split(thousandSep).join("")
      .replace(decimalSep, ".");
  } else if (lastDot !== -1 || lastComma !== -1) {
    const sep = lastDot !== -1 ? "." : ",";
    const after = cleaned.length - (lastDot !== -1 ? lastDot : lastComma) - 1;
    const onlyOnce = cleaned.indexOf(sep) === cleaned.lastIndexOf(sep);
    if (onlyOnce && after >= 1 && after <= 2) {
      // decimal: "50,5" / "50.50"
      normalized = cleaned.replace(sep, ".");
    } else {
      // miles: "50.000" / "1.234.567"
      normalized = cleaned.split(sep).join("");
    }
  } else {
    normalized = cleaned;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Convierte fechas tipo "15/06/2026", "15/06/26" o "15/06" a YYYY-MM-DD.
 * Si falta el año (o no se puede interpretar) usa receivedAt como referencia.
 */
export function parseDate(raw: string | null, receivedAt: Date): string {
  if (raw) {
    const m = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      let year = m[3] ? Number(m[3]) : receivedAt.getUTCFullYear();
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }
  return toISODate(receivedAt);
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Quita etiquetas HTML, entidades comunes y espacios redundantes. */
export function normalizeBody(body: string): string {
  return body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Limpia el nombre del comercio: recorta y normaliza espacios. */
export function cleanMerchant(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}
