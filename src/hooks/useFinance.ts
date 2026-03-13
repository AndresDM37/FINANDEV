import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  getIncomes,
  addIncome as addIncomeService,
  updateIncome as updateIncomeService,
  deleteIncome as deleteIncomeService,
  getExpenses,
  addExpense as addExpenseService,
  toggleExpensePaid as toggleExpensePaidService,
  deleteExpense as deleteExpenseService,
  getSavingsMovements,
  addSavingsMovement as addSavingsMovementService,
  deleteSavingsMovement as deleteSavingsMovementService,
} from "../services/financeService";
import { computeFinancialSummary } from "../utils/calculations";
import type {
  Income,
  Expense,
  SavingsMovement,
  NewIncome,
  NewExpense,
  NewSavingsMovement,
  FinancialSummary,
} from "../types/finance.types";

interface UseFinanceReturn {
  // Data
  incomes: Income[];
  expenses: Expense[];
  savingsMovements: SavingsMovement[];
  summary: FinancialSummary;
  loading: boolean;

  // Actions
  refresh: () => Promise<void>;
  addIncome: (data: Omit<NewIncome, "user_id">) => Promise<void>;
  editIncome: (id: string, data: Partial<Omit<NewIncome, "user_id">>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addExpense: (data: Omit<NewExpense, "user_id">) => Promise<void>;
  togglePaid: (id: string, paid: boolean) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  addSavingsMovement: (
    data: Omit<NewSavingsMovement, "user_id">,
  ) => Promise<void>;
  removeSavingsMovement: (id: string) => Promise<void>;
}

const emptySummary: FinancialSummary = {
  totalIncome: 0,
  fixedPending: 0,
  variableSpent: 0,
  savingsAccumulated: 0,
  available: 0,
};

export function useFinance(): UseFinanceReturn {
  const { user, profile } = useAuth();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [savingsMovements, setSavingsMovements] = useState<SavingsMovement[]>(
    [],
  );
  const [summary, setSummary] = useState<FinancialSummary>(emptySummary);
  const [loading, setLoading] = useState(true);

  // ── Fetch all data ──────────────────────────
  const refresh = useCallback(async () => {
    if (!user) {
      console.log("refresh omitido: no hay usuario");
      return;
    }
    console.log("refresh iniciado para usuario:", user.id);
    setLoading(true);
    try {
      console.log("Obteniendo datos de Supabase...");
      const [inc, exp, sav] = await Promise.all([
        getIncomes(user.id),
        getExpenses(user.id),
        getSavingsMovements(user.id),
      ]);
      console.log("Datos obtenidos con éxito", {
        incCount: inc.length,
        expCount: exp.length,
        savCount: sav.length,
      });
      setIncomes(inc);
      setExpenses(exp);
      setSavingsMovements(sav);
      setSummary(computeFinancialSummary(inc, exp, sav));
    } catch (err) {
      console.error("Error en refresh de useFinance:", err);
    } finally {
      console.log("refresh finalizado");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Income actions ──────────────────────────
  const addIncome = useCallback(
    async (data: Omit<NewIncome, "user_id">) => {
      if (!user || !profile) return;
      await addIncomeService(
        { ...data, user_id: user.id },
        profile.savings_percentage,
      );
      await refresh();
    },
    [user, profile, refresh],
  );

  const editIncome = useCallback(
    async (id: string, data: Partial<Omit<NewIncome, "user_id">>) => {
      await updateIncomeService(id, data);
      await refresh();
    },
    [refresh],
  );

  const removeIncome = useCallback(
    async (id: string) => {
      await deleteIncomeService(id);
      await refresh();
    },
    [refresh],
  );

  // ── Expense actions ─────────────────────────
  const addExpense = useCallback(
    async (data: Omit<NewExpense, "user_id">) => {
      if (!user) return;
      await addExpenseService({ ...data, user_id: user.id });
      await refresh();
    },
    [user, refresh],
  );

  const togglePaid = useCallback(
    async (id: string, paid: boolean) => {
      await toggleExpensePaidService(id, paid);
      await refresh();
    },
    [refresh],
  );

  const removeExpense = useCallback(
    async (id: string) => {
      await deleteExpenseService(id);
      await refresh();
    },
    [refresh],
  );

  // ── Savings actions ─────────────────────────
  const addSavingsMovement = useCallback(
    async (data: Omit<NewSavingsMovement, "user_id">) => {
      if (!user) return;
      await addSavingsMovementService({ ...data, user_id: user.id });
      await refresh();
    },
    [user, refresh],
  );

  const removeSavingsMovement = useCallback(
    async (id: string) => {
      await deleteSavingsMovementService(id);
      await refresh();
    },
    [refresh],
  );

  return {
    incomes,
    expenses,
    savingsMovements,
    summary,
    loading,
    refresh,
    addIncome,
    editIncome,
    removeIncome,
    addExpense,
    togglePaid,
    removeExpense,
    addSavingsMovement,
    removeSavingsMovement,
  };
}
