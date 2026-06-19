// ──────────────────────────────────────────────
// Tipos compartidos de las Edge Functions
// ──────────────────────────────────────────────

export type Bank = "bancolombia" | "nu" | "nequi" | "siigo";

export interface ParsedTransaction {
  direction: "expense" | "income";
  amount: number;
  merchant: string;
  /** YYYY-MM-DD */
  date: string;
  cardLast4: string | null;
}

export interface BankParser {
  bank: Bank;
  /** Remitentes (dominios o direcciones) que identifican a este banco */
  senders: string[];
  /**
   * Intenta extraer una transacción del correo.
   * - ParsedTransaction → transacción válida
   * - "not-transaction" → correo identificado como no-transaccional (OTP, rechazada, publicidad)
   * - null → no se entendió (candidato a fallback LLM)
   */
  parse(
    subject: string,
    body: string,
    receivedAt: Date,
  ): ParsedTransaction | "not-transaction" | null;
}

export interface EmailIntegration {
  user_id: string;
  gmail_address: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  last_synced_at: string | null;
  last_internal_date_ms: number;
  status: "active" | "error" | "revoked";
  last_error: string | null;
}
