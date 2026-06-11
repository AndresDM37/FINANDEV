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

/** Si el disponible cae por debajo de este % de los ingresos, se alerta. */
export const LOW_BALANCE_RATIO = 0.1;

/** Estado de un gasto fijo respecto a su día de vencimiento. */
export type PaymentStatus = "paid" | "overdue" | "due-soon" | "scheduled";

export function getPaymentStatus(
  expense: Expense,
  today: Date = new Date(),
  soonDays = 5,
): PaymentStatus {
  if (expense.paid) return "paid";
  if (expense.due_day == null) return "scheduled";
  const day = today.getDate();
  if (expense.due_day < day) return "overdue";
  if (expense.due_day - day <= soonDays) return "due-soon";
  return "scheduled";
}

/**
 * Promedio mensual de gasto variable de los últimos `monthsBack` meses
 * completos (excluye el mes actual). Devuelve null si no hay datos previos.
 */
export function computeMonthlyVariableAverage(
  expenses: Expense[],
  monthsBack = 3,
): number | null {
  const now = new Date();
  const variables = expenses.filter((e) => e.type === "variable");
  const monthTotals: number[] = [];

  for (let i = 1; i <= monthsBack; i++) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const total = filterCurrentMonth(
      variables,
      ref.getFullYear(),
      ref.getMonth(),
    ).reduce((sum, e) => sum + e.amount, 0);
    if (total > 0) monthTotals.push(total);
  }

  if (monthTotals.length === 0) return null;
  return monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length;
}

/**
 * % real de ahorro de un mes: ahorro neto (los retiros ya son negativos)
 * sobre los ingresos del mes. Devuelve null si no hubo ingresos.
 */
export function computeMonthlySavingsRate(
  incomes: Income[],
  movements: SavingsMovement[],
  year: number,
  month: number,
): number | null {
  const monthIncome = incomes
    .filter((i) => {
      const d = new Date(i.received_at);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, i) => sum + i.amount, 0);
  if (monthIncome <= 0) return null;

  const monthNetSavings = movements
    .filter((m) => {
      const d = new Date(m.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, m) => sum + m.amount, 0);

  return (monthNetSavings / monthIncome) * 100;
}

/**
 * Mes con mayor gasto variable del año indicado. Solo considera gastos
 * variables: los fijos son filas recurrentes únicas sin fecha por mes y
 * agruparlos por created_at daría totales falsos. Null si no hay gastos.
 */
export function computeMostExpensiveMonth(
  expenses: Expense[],
  year: number,
): { month: number; total: number } | null {
  const totals = new Array<number>(12).fill(0);
  for (const e of expenses) {
    if (e.type !== "variable") continue;
    const d = new Date(e.expense_date ?? e.created_at);
    if (d.getFullYear() !== year) continue;
    totals[d.getMonth()] += e.amount;
  }
  const max = Math.max(...totals);
  if (max <= 0) return null;
  return { month: totals.indexOf(max), total: max };
}

/** Punto de la serie de evolución del ahorro (saldo al cierre del mes). */
export interface SavingsEvolutionPoint {
  label: string; // "ene", "feb", ...
  year: number;
  month: number;
  cumulative: number;
}

/**
 * Serie mensual del saldo acumulado de ahorro para los últimos `monthsBack`
 * meses (incluye el actual). Los meses anteriores a la ventana entran como
 * saldo base, así el acumulado histórico no se pierde.
 */
export function computeSavingsEvolution(
  movements: SavingsMovement[],
  monthsBack = 6,
): SavingsEvolutionPoint[] {
  const now = new Date();
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth() - (monthsBack - 1),
    1,
  );

  let cumulative = movements
    .filter((m) => new Date(m.created_at) < windowStart)
    .reduce((sum, m) => sum + m.amount, 0);

  const points: SavingsEvolutionPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthNet = movements
      .filter((m) => {
        const d = new Date(m.created_at);
        return (
          d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
        );
      })
      .reduce((sum, m) => sum + m.amount, 0);
    cumulative += monthNet;
    points.push({
      label: ref.toLocaleDateString("es-CO", { month: "short" }),
      year: ref.getFullYear(),
      month: ref.getMonth(),
      cumulative,
    });
  }
  return points;
}

/**
 * Formatea un número como moneda (COP / USD / EUR / etc.).
 */
export function formatCurrency(
  value: number,
  locale = "es-CO",
  currency = "COP",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}
