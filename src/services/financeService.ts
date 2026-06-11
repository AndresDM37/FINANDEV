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
  ImportedTransaction,
  EmailIntegrationStatus,
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

export async function updateSavingsGoal(
  userId: string,
  goal: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ savings_goal: goal })
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

export async function updateExpense(
  expenseId: string,
  updates: Partial<NewExpense>,
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update(updates)
    .eq("id", expenseId);
  if (error) throw error;
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

// ──────────────────────────────────────────────
// Integración Gmail (importación de correos bancarios)
// ──────────────────────────────────────────────

export async function getEmailIntegrationStatus(): Promise<EmailIntegrationStatus | null> {
  const { data, error } = await supabase
    .from("email_integration_status")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Inicia el flujo OAuth: crea el nonce anti-CSRF y devuelve la URL
 * de consentimiento de Google a la que hay que redirigir.
 */
export async function startGmailConnect(userId: string): Promise<string> {
  const state = crypto.randomUUID();
  const { error } = await supabase
    .from("oauth_states")
    .insert({ state, user_id: userId });
  if (error) throw error;

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  if (!clientId) {
    throw new Error("Falta la variable de entorno VITE_GOOGLE_CLIENT_ID");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${supabaseUrl}/functions/v1/gmail-oauth-callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function disconnectGmail(): Promise<void> {
  const { error } = await supabase.rpc("disconnect_gmail");
  if (error) throw error;
}

export async function triggerGmailSync(): Promise<void> {
  const { error } = await supabase.functions.invoke("gmail-sync", {
    body: { mode: "manual" },
  });
  if (error) throw error;
}

export async function getImportedTransactions(
  userId: string,
): Promise<ImportedTransaction[]> {
  const { data, error } = await supabase
    .from("imported_transactions")
    .select("*")
    .eq("user_id", userId)
    .neq("parser", "none")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Confirma una transacción importada: la registra como gasto o ingreso
 * (reutilizando addExpense/addIncome para conservar el auto-ahorro) y
 * enlaza la fila importada con el registro creado.
 */
export async function confirmImportedTransaction(
  tx: ImportedTransaction,
  overrides: { name: string; amount: number },
  savingsPercentage: number,
): Promise<void> {
  let expenseId: string | null = null;
  let incomeId: string | null = null;

  if (tx.direction === "income") {
    const income = await addIncome(
      {
        user_id: tx.user_id,
        amount: overrides.amount,
        received_at: tx.transaction_date ?? new Date().toISOString().slice(0, 10),
        source: overrides.name,
      },
      savingsPercentage,
    );
    incomeId = income.id;
  } else {
    const expense = await addExpense({
      user_id: tx.user_id,
      name: overrides.name,
      amount: overrides.amount,
      type: "variable",
      category: "other",
      due_day: null,
      expense_date: tx.transaction_date ?? new Date().toISOString().slice(0, 10),
      recurring: false,
      paid: true,
    });
    expenseId = expense.id;
  }

  const { error } = await supabase
    .from("imported_transactions")
    .update({ status: "confirmed", expense_id: expenseId, income_id: incomeId })
    .eq("id", tx.id);
  if (error) throw error;
}

export async function ignoreImportedTransaction(txId: string): Promise<void> {
  const { error } = await supabase
    .from("imported_transactions")
    .update({ status: "ignored" })
    .eq("id", txId);
  if (error) throw error;
}
