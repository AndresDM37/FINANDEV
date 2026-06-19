import type { BankParser, ParsedTransaction } from "../types.ts";
import { cleanMerchant, parseAmount, parseDate } from "./common.ts";

// NOTA: patrones basados en el formato típico de notificaciones de Nequi.
// Validar contra correos reales (fixtures) antes de confiar en producción.

const NOT_TRANSACTION = [
  /rechazad[ao]/i,
  /no\s+se\s+pudo/i,
  /c[oó]digo\s+(?:de\s+verificaci[oó]n|temporal)/i,
  /clave\s+din[aá]mica/i,
  /novedades|promoci[oó]n|descuento/i,
];

// "Compraste en EXITO $50.000" / "Pagaste $50.000 en EXITO"
const COMPRA_EN =
  /compraste\s+en\s+(.+?)\s+\$?\s*([\d.,]+)/i;
const PAGASTE =
  /pagaste\s+\$?\s*([\d.,]+)\s+en\s+(.+?)(?:\.|$|\s{2})/i;

// "Hiciste un pago en FONDO DE INVERSIÓN COLECTIVA ACCIVAL VISTA por $20.230"
const HICISTE_PAGO =
  /hiciste\s+un\s+pago\s+en\s+(.+?)\s+por\s+\$?\s*([\d.,]+)/i;

// "Pagaste con Nequi tu factura por $40.800" (pago de facturas/servicios)
const PAGO_FACTURA =
  /pagaste\s+con\s+nequi\s+tu\s+factura\s+por\s+\$?\s*([\d.,]+)/i;

// "Enviaste de manera exitosa 55.000 a la llave @..." (envíos Bre-B)
const ENVIO_EXITOSO =
  /enviaste\s+de\s+manera\s+exitosa\s+\$?\s*([\d.,]+)\s+a\s+(.+?)(?=\.|,|\s{2}|$)/i;

// "Enviaste plata a JUAN PEREZ $30.000" / "Le enviaste $30.000 a JUAN"
const ENVIO_A =
  /enviaste(?:\s+plata)?\s+a\s+(.+?)\s+\$?\s*([\d.,]+)/i;
const LE_ENVIASTE =
  /le\s+enviaste\s+\$?\s*([\d.,]+)\s+a\s+(.+?)(?:\.|$|\s{2})/i;

// "Sacaste plata $100.000" / "Retiraste $100.000"
const RETIRO =
  /(?:sacaste\s+plata|retiraste)[^$\d]*\$?\s*([\d.,]+)/i;

// "NOMBRE te envió $50.000" / "Te llegó plata ... $50.000"
const RECIBIDO =
  /(.+?)\s+te\s+envi[oó]\s+\$?\s*([\d.,]+)/i;
const TE_LLEGO =
  /te\s+lleg[oó]\s+plata[^$\d]*\$?\s*([\d.,]+)/i;

const FECHA = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;

function parse(
  subject: string,
  body: string,
  receivedAt: Date,
): ParsedTransaction | "not-transaction" | null {
  const text = `${subject} ${body}`;

  if (NOT_TRANSACTION.some((re) => re.test(text))) return "not-transaction";

  const fecha = text.match(FECHA)?.[1] ?? null;
  const date = parseDate(fecha, receivedAt);

  let m = text.match(COMPRA_EN);
  if (m) {
    const amount = parseAmount(m[2]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: cleanMerchant(m[1]), date, cardLast4: null };
  }

  m = text.match(PAGASTE);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: cleanMerchant(m[2]), date, cardLast4: null };
  }

  m = text.match(HICISTE_PAGO);
  if (m) {
    const amount = parseAmount(m[2]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: cleanMerchant(m[1]), date, cardLast4: null };
  }

  m = text.match(PAGO_FACTURA);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: "Pago de factura", date, cardLast4: null };
  }

  m = text.match(ENVIO_EXITOSO);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: cleanMerchant(`Envío a ${m[2]}`),
      date,
      cardLast4: null,
    };
  }

  m = text.match(ENVIO_A);
  if (m) {
    const amount = parseAmount(m[2]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: cleanMerchant(`Envío a ${m[1]}`),
      date,
      cardLast4: null,
    };
  }

  m = text.match(LE_ENVIASTE);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return {
      direction: "expense",
      amount,
      merchant: cleanMerchant(`Envío a ${m[2]}`),
      date,
      cardLast4: null,
    };
  }

  m = text.match(RETIRO);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return { direction: "expense", amount, merchant: "Retiro Nequi", date, cardLast4: null };
  }

  m = text.match(RECIBIDO);
  if (m) {
    const amount = parseAmount(m[2]);
    if (!amount) return null;
    return {
      direction: "income",
      amount,
      merchant: cleanMerchant(`Recibido de ${m[1]}`),
      date,
      cardLast4: null,
    };
  }

  m = text.match(TE_LLEGO);
  if (m) {
    const amount = parseAmount(m[1]);
    if (!amount) return null;
    return { direction: "income", amount, merchant: "Plata recibida", date, cardLast4: null };
  }

  return null;
}

export const nequiParser: BankParser = {
  bank: "nequi",
  senders: ["nequi.com.co", "nequi.com"],
  parse,
};
