import type { BankParser, ParsedTransaction } from "../types.ts";
import { cleanMerchant, parseAmount, parseDate } from "./common.ts";

// NOTA: patrones basados en el formato típico de alertas de Bancolombia.
// Validar contra correos reales (fixtures) antes de confiar en producción.

const NOT_TRANSACTION = [
  /rechazad[ao]/i,
  /no\s+aprobad[ao]/i,
  /declinad[ao]/i,
  /c[oó]digo\s+de\s+verificaci[oó]n/i,
  /clave\s+din[aá]mica/i,
  /extracto/i,
  /estado\s+de\s+cuenta/i,
  /actualiza\s+tus\s+datos/i,
];

// El comercio termina donde empieza la hora, la fecha, "T.Deb/T.Cred" o puntuación
const MERCHANT_END =
  /(?=\s+\d{1,2}:\d{2}|\s+\d{1,2}\/\d{1,2}|\s+T\.\w|\s+\*\d{4}|[.,]|$)/.source;

// "Compra por $123.456,00 en EXITO CALLE 80 18:24. 10/06/2026 T.Deb *5678"
const COMPRA = new RegExp(
  /(?:compra|pago)\s+por\s+\$?\s*([\d.,]+)\s+(?:en|a)\s+(.+?)/.source + MERCHANT_END,
  "i",
);

// "Compraste $7.800,00 en DLO*Didi con tu T.Deb *5194, el 16/06/2026 a las 17:46"
const COMPRASTE =
  /compraste\s+\$?\s*([\d.,]+)\s+en\s+(.+?)(?=\s+con\s+tu|\s+T\.\w|\s+\*\d{4}|\s+el\s+\d|,|\.|$)/i;

// "Retiro por $200.000 en CAJERO ... 10/06/2026 de cuenta *5678"
const RETIRO = new RegExp(
  /retiro\s+por\s+\$?\s*([\d.,]+)(?:\s+en\s+(.+?))?/.source + MERCHANT_END,
  "i",
);

const FECHA = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;

// "Transferencia por $X desde cta *1234" (gasto) — saliente
const TRANSFERENCIA_SALIENTE =
  /transferencia\s+por\s+\$?\s*([\d.,]+)\s+(?:desde|de su)\s+(?:cta|cuenta|producto)/i;

// "recepción de transferencia de NOMBRE por $X" / "te transfirió" / "recibiste
// una transferencia de NOMBRE por $X en tu cuenta *1799" — ingreso
const TRANSFERENCIA_ENTRANTE =
  /(?:recepci[oó]n\s+de\s+transferencia|consignaci[oó]n|te\s+transfiri[oó]|recibiste\s+una\s+transferencia)(?:\s+de\s+(.+?))?\s+por\s+\$?\s*([\d.,]+)/i;

const CARD = /\*\s?(\d{4})/;

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

  const entrante = text.match(TRANSFERENCIA_ENTRANTE);
  if (entrante) {
    const amount = parseAmount(entrante[2]);
    if (!amount) return null;
    return {
      direction: "income",
      amount,
      merchant: cleanMerchant(entrante[1] ?? "Transferencia recibida"),
      date,
      cardLast4,
    };
  }

  const compra = text.match(COMPRA);
  if (compra) {
    const amount = parseAmount(compra[1]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: cleanMerchant(compra[2]),
      date,
      cardLast4,
    };
  }

  const compraste = text.match(COMPRASTE);
  if (compraste) {
    const amount = parseAmount(compraste[1]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: cleanMerchant(compraste[2]),
      date,
      cardLast4,
    };
  }

  const retiro = text.match(RETIRO);
  if (retiro) {
    const amount = parseAmount(retiro[1]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: cleanMerchant(retiro[2] ? `Retiro ${retiro[2]}` : "Retiro cajero"),
      date,
      cardLast4,
    };
  }

  const saliente = text.match(TRANSFERENCIA_SALIENTE);
  if (saliente) {
    const amount = parseAmount(saliente[1]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: "Transferencia enviada",
      date,
      cardLast4,
    };
  }

  return null;
}

export const bancolombiaParser: BankParser = {
  bank: "bancolombia",
  senders: [
    "notificacionesbancolombia.com",
    "bancolombia.com.co",
    "bancolombia.com",
  ],
  parse,
};
