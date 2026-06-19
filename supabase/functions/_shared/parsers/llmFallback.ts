// Fallback con Claude para correos que el regex no entendió.
// Solo se invoca cuando el parser del banco devuelve null.
import Anthropic from "npm:@anthropic-ai/sdk";
import type { ParsedTransaction } from "../types.ts";
import { parseDate, toISODate } from "./common.ts";

const MAX_BODY_CHARS = 4000;

const SCHEMA = {
  type: "object",
  properties: {
    is_transaction: {
      type: "boolean",
      description:
        "true solo si el correo notifica una transacción real ejecutada (compra, pago, retiro, transferencia). false para OTP, rechazadas, extractos, publicidad.",
    },
    direction: { type: "string", enum: ["expense", "income"] },
    amount: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description: "Monto en COP, sin separadores",
    },
    merchant: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Comercio o contraparte",
    },
    date: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Fecha de la transacción dd/mm/yyyy si aparece",
    },
    card_last4: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: ["is_transaction", "direction", "amount", "merchant", "date", "card_last4"],
  additionalProperties: false,
} as const;

interface LlmExtraction {
  is_transaction: boolean;
  direction: "expense" | "income";
  amount: number | null;
  merchant: string | null;
  date: string | null;
  card_last4: string | null;
}

/**
 * Extrae la transacción con claude-haiku-4-5 (structured output).
 * Devuelve "not-transaction" si el correo no es transaccional,
 * null si el LLM no pudo extraer un monto válido.
 */
export async function llmParse(
  bank: string,
  subject: string,
  body: string,
  receivedAt: Date,
): Promise<ParsedTransaction | "not-transaction" | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null; // sin API key el fallback queda deshabilitado

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "Eres un extractor de transacciones de correos de bancos colombianos " +
      `(en este caso: ${bank}). Los montos están en pesos colombianos (COP); ` +
      "en el formato local el punto es separador de miles y la coma es decimal " +
      "($85.400,00 = 85400 pesos). Extrae solo transacciones realmente ejecutadas.",
    messages: [
      {
        role: "user",
        content:
          `Asunto: ${subject}\n\nCuerpo:\n${body.slice(0, MAX_BODY_CHARS)}`,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
    },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text" || !block.text) return null;

  let extraction: LlmExtraction;
  try {
    extraction = JSON.parse(block.text);
  } catch {
    return null; // salida no-JSON: tratar como "no entendido"
  }

  if (!extraction.is_transaction) return "not-transaction";
  if (!extraction.amount || extraction.amount <= 0) return null;

  return {
    direction: extraction.direction,
    amount: extraction.amount,
    merchant: extraction.merchant?.slice(0, 80) ?? "Sin identificar",
    date: extraction.date ? parseDate(extraction.date, receivedAt) : toISODate(receivedAt),
    cardLast4: extraction.card_last4,
  };
}
