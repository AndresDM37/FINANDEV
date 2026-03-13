import { supabase } from "./supabaseClient";
import { calculateAutoSavings } from "../utils/calculations";
import type {
  Profile,
  Income,
  Expense,
  SavingsMovement,
  NewIncome,
  NewExpense,
  NewSavingsMovement,
} from "../types/finance.types";

// ──────────────────────────────────────────────
// Profile
// ──────────────────────────────────────────────

export async function getProfile(userId: string, email?: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  
  if (error) throw error;
  
  if (!data) {
    if (!email) return null;
    // Fallback: Si no existe el perfil (probablemente falló el trigger), lo creamos manual.
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: userId, email: email, savings_percentage: 20 })
      .select()
      .single();
    if (insertError) throw insertError;
    return newProfile;
  }

  return data;
}

export async function updateSavingsPercentage(
  userId: string,
  percentage: number,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ savings_percentage: percentage })
    .eq("id", userId);
  if (error) throw error;
}

// ──────────────────────────────────────────────
// Incomes
// ──────────────────────────────────────────────

export async function getIncomes(userId: string): Promise<Income[]> {
  const { data, error } = await supabase
    .from("incomes")
    .select("*")
    .eq("user_id", userId)
    .order("received_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Registra un ingreso y genera automáticamente el ahorro correspondiente.
 */
export async function addIncome(
  income: NewIncome,
  savingsPercentage: number,
): Promise<Income> {
  // 1. Insertar ingreso
  const { data, error } = await supabase
    .from("incomes")
    .insert(income)
    .select()
    .single();
  if (error) throw error;

  // 2. Calcular y registrar ahorro automático
  const savingsAmount = calculateAutoSavings(income.amount, savingsPercentage);
  if (savingsAmount > 0) {
    await addSavingsMovement({
      user_id: income.user_id,
      amount: savingsAmount,
      type: "auto",
      note: `Ahorro automático (${savingsPercentage}%) del ingreso "${income.source}"`,
    });
  }

  return data;
}

export async function deleteIncome(incomeId: string): Promise<void> {
  const { error } = await supabase.from("incomes").delete().eq("id", incomeId);
  if (error) throw error;
}

export async function updateIncome(
  incomeId: string,
  updates: Partial<NewIncome>,
): Promise<void> {
  const { error } = await supabase
    .from("incomes")
    .update(updates)
    .eq("id", incomeId);
  if (error) throw error;
}


// ──────────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────────

export async function getExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addExpense(expense: NewExpense): Promise<Expense> {
  const { data, error } = await supabase
    .from("expenses")
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleExpensePaid(
  expenseId: string,
  paid: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update({ paid })
    .eq("id", expenseId);
  if (error) throw error;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);
  if (error) throw error;
}

// ──────────────────────────────────────────────
// Savings Movements
// ──────────────────────────────────────────────

export async function getSavingsMovements(
  userId: string,
): Promise<SavingsMovement[]> {
  const { data, error } = await supabase
    .from("savings_movements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addSavingsMovement(
  movement: NewSavingsMovement,
): Promise<SavingsMovement> {
  const { data, error } = await supabase
    .from("savings_movements")
    .insert(movement)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSavingsMovement(movementId: string): Promise<void> {
  const { error } = await supabase
    .from("savings_movements")
    .delete()
    .eq("id", movementId);
  if (error) throw error;
}
