// ──────────────────────────────────────────────
// Domain types for FinanDev
// ──────────────────────────────────────────────

/** Perfil del usuario (tabla profiles) */
export interface Profile {
  id: string;
  email: string;
  savings_percentage: number;
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

/** Gasto (tabla expenses) */
export interface Expense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  type: ExpenseType;
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
// Resumen financiero para Dashboard
// ──────────────────────────────────────────────

export interface FinancialSummary {
  totalIncome: number;
  fixedPending: number;
  variableSpent: number;
  savingsAccumulated: number;
  available: number;
}
