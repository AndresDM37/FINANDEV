// ──────────────────────────────────────────────
// Domain types for FinanDev
// ──────────────────────────────────────────────

/** Perfil del usuario (tabla profiles) */
export interface Profile {
  id: string;
  email: string;
  savings_percentage: number;
  savings_goal: number | null;
  savings_goal_name: string | null;
  created_at: string;
}

/** Ingreso registrado (tabla incomes) */
export interface Income {
  id: string;
  user_id: string;
  amount: number;
  received_at: string; // date ISO
  source: string;
  created_at: string;
}

/** Tipo de gasto */
export type ExpenseType = "fixed" | "variable";

/** Categoría de gasto (variables/hormiga; los fijos van sin categoría) */
export type ExpenseCategory =
  | "food"
  | "transport"
  | "shopping"
  | "fun"
  | "travel"
  | "other";

/** Gasto (tabla expenses) */
export interface Expense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  type: ExpenseType;
  category: ExpenseCategory | null;
  due_day: number | null;
  expense_date: string | null; // date ISO
  recurring: boolean;
  paid: boolean;
  created_at: string;
}

/** Tipo de movimiento de ahorro */
export type SavingsMovementType = "auto" | "manual" | "withdraw";

/** Movimiento de ahorro (tabla savings_movements) */
export interface SavingsMovement {
  id: string;
  user_id: string;
  amount: number; // positivo = ahorro, negativo = retiro
  type: SavingsMovementType;
  note: string;
  created_at: string;
}

// ──────────────────────────────────────────────
// DTOs para inserción (sin id ni created_at)
// ──────────────────────────────────────────────

export type NewIncome = Omit<Income, "id" | "created_at">;
export type NewExpense = Omit<Expense, "id" | "created_at">;
export type NewSavingsMovement = Omit<SavingsMovement, "id" | "created_at">;

// ──────────────────────────────────────────────
// Importación de correos bancarios (Gmail)
// ──────────────────────────────────────────────

/** Banco / origen del correo (siigo = comprobante de nómina) */
export type ImportedBank = "bancolombia" | "nu" | "nequi" | "siigo";

/** Estado de revisión de una transacción importada */
export type ImportedTxStatus = "pending" | "confirmed" | "ignored";

/** Transacción importada desde un correo bancario (tabla imported_transactions) */
export interface ImportedTransaction {
  id: string;
  user_id: string;
  gmail_message_id: string;
  bank: ImportedBank;
  direction: "expense" | "income";
  amount: number | null;
  merchant: string | null;
  transaction_date: string | null; // date ISO
  card_last4: string | null;
  raw_subject: string;
  raw_snippet: string;
  parser: "regex" | "llm" | "none";
  confidence: "high" | "medium" | "low";
  status: ImportedTxStatus;
  expense_id: string | null;
  income_id: string | null;
  created_at: string;
}

/** Estado de la conexión con Gmail (vista email_integration_status) */
export interface EmailIntegrationStatus {
  user_id: string;
  gmail_address: string;
  last_synced_at: string | null;
  status: "active" | "error" | "revoked";
  last_error: string | null;
}

// ──────────────────────────────────────────────
// Resumen financiero para Dashboard
// ──────────────────────────────────────────────

export interface FinancialSummary {
  totalIncome: number;
  fixedPending: number;
  variableSpent: number;
  savingsAccumulated: number;
  available: number;
}
