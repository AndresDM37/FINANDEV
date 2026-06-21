import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./useAuth";
import {
  getIncomes,
  addIncome as addIncomeService,
  updateIncome as updateIncomeService,
  deleteIncome as deleteIncomeService,
  getExpenses,
  addExpense as addExpenseService,
  updateExpense as updateExpenseService,
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
import { readFinanceCache, writeFinanceCache } from "../utils/financeCache";
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

interface RefreshOpts {
  /** No togglea `loading` (refresco en segundo plano tras mutaciones). */
  silent?: boolean;
}

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
  refresh: (opts?: RefreshOpts) => Promise<void>;
  addIncome: (data: Omit<NewIncome, "user_id">) => Promise<void>;
  editIncome: (id: string, data: Partial<Omit<NewIncome, "user_id">>) => Promise<void>;
  removeIncome: (id: string) => Promise<void>;
  addExpense: (data: Omit<NewExpense, "user_id">) => Promise<void>;
  editExpense: (
    id: string,
    data: Partial<Omit<NewExpense, "user_id">>,
  ) => Promise<void>;
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
  confirmManyImported: (
    items: { tx: ImportedTransaction; name: string; amount: number }[],
  ) => Promise<void>;
  ignoreImported: (id: string) => Promise<void>;
  ignoreManyImported: (ids: string[]) => Promise<void>;
  syncGmail: () => Promise<void>;
}

const emptySummary: FinancialSummary = {
  totalIncome: 0,
  fixedPending: 0,
  variableSpent: 0,
  savingsAccumulated: 0,
  available: 0,
};

const FinanceContext = createContext<UseFinanceReturn | undefined>(undefined);

/**
 * Provee los datos financieros una sola vez para toda la zona autenticada.
 * - Hidrata desde caché local para que al entrar/recargar los datos aparezcan
 *   al instante, y revalida en segundo plano (stale-while-revalidate).
 * - `loading` solo es true en la primera carga sin caché; los refrescos tras
 *   mutaciones son silenciosos para no desmontar las páginas (evita parpadeos).
 */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

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
  const refresh = useCallback(
    async (opts?: RefreshOpts) => {
      if (!user) return;
      if (!opts?.silent) setLoading(true);
      try {
        const [inc, exp, sav, imported] = await Promise.all([
          getIncomes(user.id),
          getExpenses(user.id),
          getSavingsMovements(user.id),
          getImportedTransactions(user.id),
        ]);
        setIncomes(inc);
        setExpenses(exp);
        setSavingsMovements(sav);
        setImportedTransactions(imported);
        setSummary(computeFinancialSummary(inc, exp, sav));
        writeFinanceCache(user.id, {
          incomes: inc,
          expenses: exp,
          savingsMovements: sav,
          importedTransactions: imported,
        });
      } catch (err) {
        console.error("Error en refresh de useFinance:", err);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [user],
  );

  // Al montar / cambiar de usuario: hidratar de caché y revalidar en 2º plano.
  useEffect(() => {
    if (!user) {
      setIncomes([]);
      setExpenses([]);
      setSavingsMovements([]);
      setImportedTransactions([]);
      setSummary(emptySummary);
      setLoading(false);
      return;
    }

    const cached = readFinanceCache(user.id);
    if (cached) {
      setIncomes(cached.incomes);
      setExpenses(cached.expenses);
      setSavingsMovements(cached.savingsMovements);
      setImportedTransactions(cached.importedTransactions);
      setSummary(
        computeFinancialSummary(
          cached.incomes,
          cached.expenses,
          cached.savingsMovements,
        ),
      );
      setLoading(false);
      void refresh({ silent: true }); // revalidar sin loader
    } else {
      void refresh(); // primera carga real, con loader una sola vez
    }
  }, [user, refresh]);

  // ── Income actions ──────────────────────────
  const addIncome = useCallback(
    async (data: Omit<NewIncome, "user_id">) => {
      if (!user) return;
      await addIncomeService({ ...data, user_id: user.id });
      await refresh({ silent: true });
    },
    [user, refresh],
  );

  const editIncome = useCallback(
    async (id: string, data: Partial<Omit<NewIncome, "user_id">>) => {
      await updateIncomeService(id, data);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const removeIncome = useCallback(
    async (id: string) => {
      await deleteIncomeService(id);
      await refresh({ silent: true });
    },
    [refresh],
  );

  // ── Expense actions ─────────────────────────
  const addExpense = useCallback(
    async (data: Omit<NewExpense, "user_id">) => {
      if (!user) return;
      await addExpenseService({ ...data, user_id: user.id });
      await refresh({ silent: true });
    },
    [user, refresh],
  );

  const editExpense = useCallback(
    async (id: string, data: Partial<Omit<NewExpense, "user_id">>) => {
      await updateExpenseService(id, data);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const togglePaid = useCallback(
    async (id: string, paid: boolean) => {
      await toggleExpensePaidService(id, paid);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const removeExpense = useCallback(
    async (id: string) => {
      await deleteExpenseService(id);
      await refresh({ silent: true });
    },
    [refresh],
  );

  // ── Savings actions ─────────────────────────
  const addSavingsMovement = useCallback(
    async (data: Omit<NewSavingsMovement, "user_id">) => {
      if (!user) return;
      await addSavingsMovementService({ ...data, user_id: user.id });
      await refresh({ silent: true });
    },
    [user, refresh],
  );

  const removeSavingsMovement = useCallback(
    async (id: string) => {
      await deleteSavingsMovementService(id);
      await refresh({ silent: true });
    },
    [refresh],
  );

  // ── Imported transactions (Gmail) ───────────
  const confirmImported = useCallback(
    async (
      tx: ImportedTransaction,
      overrides: { name: string; amount: number },
    ) => {
      await confirmImportedService(tx, overrides);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const confirmManyImported = useCallback(
    async (
      items: { tx: ImportedTransaction; name: string; amount: number }[],
    ) => {
      if (items.length === 0) return;
      await Promise.all(
        items.map((it) =>
          confirmImportedService(it.tx, { name: it.name, amount: it.amount }),
        ),
      );
      await refresh({ silent: true }); // un solo refresco para todo el lote
    },
    [refresh],
  );

  const ignoreImported = useCallback(
    async (id: string) => {
      await ignoreImportedService(id);
      await refresh({ silent: true });
    },
    [refresh],
  );

  const ignoreManyImported = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => ignoreImportedService(id)));
      await refresh({ silent: true }); // un solo refresco para todo el lote
    },
    [refresh],
  );

  const syncGmail = useCallback(async () => {
    await triggerGmailSync();
    await refresh({ silent: true });
  }, [refresh]);

  const pendingImportCount = importedTransactions.filter(
    (t) => t.status === "pending",
  ).length;

  const value: UseFinanceReturn = {
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
    editExpense,
    togglePaid,
    removeExpense,
    addSavingsMovement,
    removeSavingsMovement,
    confirmImported,
    confirmManyImported,
    ignoreImported,
    ignoreManyImported,
    syncGmail,
  };

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance(): UseFinanceReturn {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error("useFinance debe usarse dentro de <FinanceProvider>");
  }
  return ctx;
}
