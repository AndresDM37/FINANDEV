import type { Bank, BankParser, ParsedTransaction } from "../types.ts";
import { normalizeBody } from "./common.ts";
import { bancolombiaParser } from "./bancolombia.ts";
import { nequiParser } from "./nequi.ts";
import { nuParser } from "./nu.ts";
import { siigoParser } from "./siigo.ts";

export const PARSERS: BankParser[] = [
  bancolombiaParser,
  nequiParser,
  nuParser,
  siigoParser,
];

/** Lista de remitentes para construir el query `from:(...)` de Gmail */
export const ALL_SENDERS = PARSERS.flatMap((p) => p.senders);

/** Identifica el banco a partir del header From del correo */
export function detectBank(from: string): Bank | null {
  const lower = from.toLowerCase();
  for (const parser of PARSERS) {
    if (parser.senders.some((s) => lower.includes(s))) return parser.bank;
  }
  return null;
}

export interface ParseResult {
  bank: Bank;
  outcome: ParsedTransaction | "not-transaction" | null;
}

/**
 * Punto de entrada del parsing regex: detecta el banco por remitente y
 * delega en su parser. Devuelve null si el remitente no es de un banco
 * conocido (no debería pasar si el query de Gmail filtra por from:).
 */
export function parseEmail(
  from: string,
  subject: string,
  rawBody: string,
  receivedAt: Date,
): ParseResult | null {
  const bank = detectBank(from);
  if (!bank) return null;

  const parser = PARSERS.find((p) => p.bank === bank)!;
  const body = normalizeBody(rawBody);
  return { bank, outcome: parser.parse(subject, body, receivedAt) };
}
