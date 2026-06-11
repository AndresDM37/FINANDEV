import type { BankParser, ParsedTransaction } from "../types.ts";
import { cleanMerchant, parseAmount, parseDate } from "./common.ts";

// NOTA: patrones basados en el formato típico de notificaciones de Nu Colombia.
// Nu puede notificar principalmente por push de la app: validar qué llega
// realmente por correo antes de confiar en estos patrones.

const NOT_TRANSACTION = [
  /rechazad[ao]/i,
  /no\s+aprobad[ao]/i,
  /declinad[ao]/i,
  /c[oó]digo\s+de\s+verificaci[oó]n/i,
  /estado\s+de\s+cuenta/i,
  /tu\s+factura/i,
  /invita\s+a/i,
];

// "Hiciste una compra por $50.000 en EXITO con tu tarjeta terminada en 1234"
const COMPRA =
  /compra\s+por\s+\$?\s*([\d.,]+)\s+en\s+(.+?)(?:\s+con\s+tu\s+tarjeta|\s+el\s+\d|[.,]|$)/i;

// "Tu compra en EXITO por $50.000 fue aprobada"
const COMPRA_APROBADA =
  /compra\s+en\s+(.+?)\s+por\s+\$?\s*([\d.,]+)/i;

// "Recibiste $X" / "Te llegó un envío de NOMBRE por $X" (cuenta Nu)
const RECIBIDO =
  /(?:recibiste|te\s+lleg[oó].*?env[ií]o(?:\s+de\s+(.+?))?)\s+(?:por\s+)?\$?\s*([\d.,]+)/i;

const CARD = /terminada\s+en\s+(\d{4})/i;
const FECHA = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;

function parse(
  subject: string,
  body: string,
  receivedAt: Date,
): ParsedTransaction | "not-transaction" | null {
  const text = `${subject} ${body}`;

  if (NOT_TRANSACTION.some((re) => re.test(text))) return "not-transaction";

  const cardLast4 = text.match(CARD)?.[1] ?? null;
  const fecha = text.match(FECHA)?.[1] ?? null;
  const date = parseDate(fecha, receivedAt);

  let m = text.match(COMPRA);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: cleanMerchant(m[2]), date, cardLast4 };
  }

  m = text.match(COMPRA_APROBADA);
  if (m) {
    const amount = parseAmount(m[2]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: cleanMerchant(m[1]), date, cardLast4 };
  }

  m = text.match(RECIBIDO);
  if (m) {
    const amount = parseAmount(m[2]);
    if (!amount) return null;
    return {
      direction: "income",
      amount,
      merchant: cleanMerchant(m[1] ? `Recibido de ${m[1]}` : "Depósito Nu"),
      date,
      cardLast4,
    };
  }

  return null;
}

export const nuParser: BankParser = {
  bank: "nu",
  senders: ["nu.com.co", "nubank.com.co", "nu.com"],
  parse,
};
