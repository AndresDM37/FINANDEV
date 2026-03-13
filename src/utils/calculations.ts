import type {
  FinancialSummary,
  Income,
  Expense,
  SavingsMovement,
} from "../types/finance.types";

/**
 * Calcula el monto de ahorro automático a partir de un ingreso.
 */
export function calculateAutoSavings(
  incomeAmount: number,
  savingsPercentage: number,
): number {
  return Math.round(incomeAmount * (savingsPercentage / 100) * 100) / 100;
}

/**
 * Filtra gastos del mes/año indicado.
 */
export function filterCurrentMonth<
  T extends { created_at: string; expense_date?: string | null },
>(items: T[], year: number, month: number): T[] {
  return items.filter((item) => {
    const dateStr = item.expense_date ?? item.created_at;
    const d = new Date(dateStr);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/**
 * Calcula el resumen financiero completo del mes en curso.
 */
export function computeFinancialSummary(
  incomes: Income[],
  expenses: Expense[],
  savingsMovements: SavingsMovement[],
): FinancialSummary {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Ingresos del mes
  const monthIncomes = incomes.filter((i) => {
    const d = new Date(i.received_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const totalIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);

  // Gastos fijos pendientes (no pagados)
  const fixedPending = expenses
    .filter((e) => e.type === "fixed" && !e.paid)
    .reduce((sum, e) => sum + e.amount, 0);

  // Gastos variables del mes
  const monthVariables = filterCurrentMonth(
    expenses.filter((e) => e.type === "variable"),
    year,
    month,
  );
  const variableSpent = monthVariables.reduce((sum, e) => sum + e.amount, 0);

  // Ahorro acumulado total (histórico)
  const savingsAccumulated = savingsMovements.reduce(
    (sum, m) => sum + m.amount,
    0,
  );

  // Ahorro del mes actual (para calcular disponible)
  const monthSavings = savingsMovements.filter((m) => {
    const d = new Date(m.created_at);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      m.type !== "withdraw"
    );
  });
  const savingsCurrent = monthSavings.reduce((sum, m) => sum + m.amount, 0);

  const available = totalIncome - fixedPending - variableSpent - savingsCurrent;

  return {
    totalIncome,
    fixedPending,
    variableSpent,
    savingsAccumulated,
    available,
  };
}

/**
 * Formatea un número como moneda (CLP / USD / etc.).
 */
export function formatCurrency(
  value: number,
  locale = "es-CL",
  currency = "CLP",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}
