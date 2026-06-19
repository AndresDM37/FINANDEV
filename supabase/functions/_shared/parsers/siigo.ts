import type { BankParser, ParsedTransaction } from "../types.ts";
import { parseAmount, parseDate, toISODate } from "./common.ts";

// Correos de comprobantes de nómina enviados vía Siigo.
// El monto NO está en el cuerpo del correo: vive dentro del PDF adjunto.
// Por eso `parse` (que solo ve subject/body) siempre devuelve null y el
// manejo real ocurre en gmail-sync, que descarga el PDF y llama a
// `parseNominaText` con el texto extraído.
export const SIIGO_SENDERS = [
  "siigo.com",
  "siigonube.com",
  "transacciones.siigo.com",
];

// "NETO A PAGAR $ 1,524,548.00" / "Neto a pagar: $1.524.548,00"
const NETO = /neto\s+a\s+pagar\s*:?\s*\$?\s*([\d.,]+)/i;
// Respaldo: "Total a pagar"
const TOTAL = /total\s+a\s+pagar\s*:?\s*\$?\s*([\d.,]+)/i;
// "Periodo de Pago: 2026/06/01 - 2026/06/15" → tomamos el fin del periodo
const PERIODO =
  /\d{4}[/-]\d{1,2}[/-]\d{1,2}\s*[-–a]+\s*(\d{4})[/-](\d{1,2})[/-](\d{1,2})/i;

/**
 * Extrae el neto de un comprobante de nómina a partir del texto del PDF.
 * Devuelve un ingreso, o null si no encuentra un monto válido.
 */
export function parseNominaText(
  text: string,
  receivedAt: Date,
): ParsedTransaction | null {
  const m = text.match(NETO) ?? text.match(TOTAL);
  if (!m) return null;
  const amount = parseAmount(m[1]);
  if (!amount) return null;

  // Fecha: fin del periodo de pago si aparece; si no, la del correo.
  const p = text.match(PERIODO);
  const date = p
    ? parseDate(`${p[3]}/${p[2]}/${p[1]}`, receivedAt)
    : toISODate(receivedAt);

  return {
    direction: "income",
    amount,
    merchant: "Nómina",
    date,
    cardLast4: null,
  };
}

function parse(): ParsedTransaction | "not-transaction" | null {
  // El monto está en el PDF; el manejo ocurre en gmail-sync.
  return null;
}

export const siigoParser: BankParser = {
  bank: "siigo",
  senders: SIIGO_SENDERS,
  parse,
};
