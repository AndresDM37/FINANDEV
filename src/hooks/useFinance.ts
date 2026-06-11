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
  getImportedTransactions,
  confirmImportedTransaction as confirmImportedService,
  ignoreImportedTransaction as ignoreImportedService,
  triggerGmailSync,
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
  ImportedTransaction,
} from "../types/finance.types";

interface UseFinanceReturn {
  // Data
  incomes: Income[];
  expenses: Expense[];
  savingsMovements: SavingsMovement[];
  importedTransactions: ImportedTransaction[];
  pendingImportCount: number;
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
  confirmImported: (
    tx: ImportedTransaction,
    overrides: { name: string; amount: number },
  ) => Promise<void>;
  ignoreImported: (id: string) => Promise<void>;
  syncGmail: () => Promise<void>;
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
  const [importedTransactions, setImportedTransactions] = useState<
    ImportedTransaction[]
  >([]);
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
      const [inc, exp, sav, imported] = await Promise.all([
        getIncomes(user.id),
        getExpenses(user.id),
        getSavingsMovements(user.id),
        getImportedTransactions(user.id),
      ]);
      console.log("Datos obtenidos con éxito", {
        incCount: inc.length,
        expCount: exp.length,
        savCount: sav.length,
        importedCount: imported.length,
      });
      setIncomes(inc);
      setExpenses(exp);
      setSavingsMovements(sav);
      setImportedTransactions(imported);
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

  // ── Imported transactions (Gmail) ───────────
  const confirmImported = useCallback(
    async (
      tx: ImportedTransaction,
      overrides: { name: string; amount: number },
    ) => {
      if (!profile) return;
      await confirmImportedService(tx, overrides, profile.savings_percentage);
      await refresh();
    },
    [profile, refresh],
  );

  const ignoreImported = useCallback(
    async (id: string) => {
      await ignoreImportedService(id);
      await refresh();
    },
    [refresh],
  );

  const syncGmail = useCallback(async () => {
    await triggerGmailSync();
    await refresh();
  }, [refresh]);

  const pendingImportCount = importedTransactions.filter(
    (t) => t.status === "pending",
  ).length;

  return {
    incomes,
    expenses,
    savingsMovements,
    importedTransactions,
    pendingImportCount,
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
    confirmImported,
    ignoreImported,
    syncGmail,
  };
}
