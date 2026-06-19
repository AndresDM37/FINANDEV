// Caché local de los datos financieros (stale-while-revalidate).
// Permite mostrar los datos al instante al entrar/recargar, revalidando
// en segundo plano. Es por usuario y se limpia al cerrar sesión.
import type {
  Income,
  Expense,
  SavingsMovement,
  ImportedTransaction,
} from "../types/finance.types";

export interface CachedFinanceData {
  incomes: Income[];
  expenses: Expense[];
  savingsMovements: SavingsMovement[];
  importedTransactions: ImportedTransaction[];
}

const PREFIX = "finandev:data:";
const keyFor = (userId: string) => `${PREFIX}${userId}`;

export function readFinanceCache(userId: string): CachedFinanceData | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedFinanceData;
  } catch {
    return null;
  }
}

export function writeFinanceCache(
  userId: string,
  data: CachedFinanceData,
): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(data));
  } catch {
    // Cuota llena u otro error: la caché es best-effort, ignorar.
  }
}

/** Borra la caché de todos los usuarios (al cerrar sesión). */
export function clearFinanceCache(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {
    // ignorar
  }
}
