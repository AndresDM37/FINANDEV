import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import {
  updateSavingsGoal,
  getEmailIntegrationStatus,
  startGmailConnect,
  disconnectGmail,
  triggerGmailSync,
} from "../services/financeService";
import type {
  EmailIntegrationStatus,
  Expense,
  Income,
} from "../types/finance.types";
import {
  Briefcase,
  Home,
  Plus,
  Pencil,
  Trash2,
  Mail,
  RefreshCw,
  Check,
  X,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Target,
  LogOut,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Input,
  AmountInput,
  Button,
  Badge,
  ListRow,
  EmptyState,
} from "../components/ui";

interface HistoryRow {
  id: string;
  kind: "income" | "expense" | "saving";
  label: string;
  detail: string;
  amount: number;
  date: string;
}

export default function Admin() {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const {
    incomes,
    expenses,
    savingsMovements,
    summary,
    editIncome,
    removeIncome,
    editExpense,
    removeExpense,
    removeSavingsMovement,
    addSavingsMovement,
  } = useFinance();

  const [goalInput, setGoalInput] = useState(
    profile?.savings_goal?.toString() ?? "",
  );
  const [goalNameInput, setGoalNameInput] = useState(
    profile?.savings_goal_name ?? "",
  );

  useEffect(() => {
    if (profile) {
      setGoalInput(profile.savings_goal?.toString() ?? "");
      setGoalNameInput(profile.savings_goal_name ?? "");
    }
  }, [profile]);

  // ── Edición inline de ingresos y gastos fijos ──
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState({ source: "", amount: "" });
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    dueDay: "",
  });

  // ── Retiro rápido de ahorro ──
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // ── Conexión con Gmail ──────────────────────
  const [gmailStatus, setGmailStatus] = useState<EmailIntegrationStatus | null>(
    null,
  );
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailNotice, setGmailNotice] = useState<string | null>(null);
  const [gmailSyncing, setGmailSyncing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("gmail");
    if (result === "connected") {
      setGmailNotice("✅ Gmail conectado correctamente.");
    } else if (result === "error") {
      setGmailNotice(
        `⚠️ No se pudo conectar Gmail (${params.get("reason") ?? "error"}). Intenta de nuevo.`,
      );
    }
    if (result) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    getEmailIntegrationStatus()
      .then(setGmailStatus)
      .catch(() => setGmailStatus(null))
      .finally(() => setGmailLoading(false));
  }, []);

  const handleGmailConnect = async () => {
    if (!profile) return;
    try {
      const url = await startGmailConnect(profile.id);
      window.location.href = url;
    } catch (err) {
      setGmailNotice(
        `⚠️ ${err instanceof Error ? err.message : "Error al iniciar la conexión"}`,
      );
    }
  };

  const handleGmailDisconnect = async () => {
    if (
      !window.confirm(
        "¿Desconectar Gmail? Dejarán de importarse tus correos del banco.",
      )
    )
      return;
    await disconnectGmail();
    setGmailStatus(null);
  };

  const handleGmailSync = async () => {
    setGmailSyncing(true);
    try {
      await triggerGmailSync();
      const status = await getEmailIntegrationStatus();
      setGmailStatus(status);
      setGmailNotice("✅ Sincronización completada. Revisa la pestaña Correos.");
    } catch {
      setGmailNotice("⚠️ Error al sincronizar. Revisa la conexión.");
    } finally {
      setGmailSyncing(false);
    }
  };

  const handleGoalSave = async () => {
    if (!profile) return;
    const parsed = parseFloat(goalInput);
    const goal = goalInput && !isNaN(parsed) && parsed > 0 ? parsed : null;
    const name = goalNameInput.trim() || null;
    try {
      await updateSavingsGoal(profile.id, goal, name);
      await refreshProfile();
    } catch {
      console.error("Error saving goal");
    }
  };

  // ── Handlers de ingresos ──
  const startIncomeEdit = (inc: Income) => {
    setEditingIncomeId(inc.id);
    setIncomeForm({ source: inc.source, amount: inc.amount.toString() });
  };

  const saveIncomeEdit = async () => {
    if (!editingIncomeId || !incomeForm.source || !incomeForm.amount) return;
    await editIncome(editingIncomeId, {
      source: incomeForm.source,
      amount: parseFloat(incomeForm.amount),
    });
    setEditingIncomeId(null);
  };

  const handleIncomeDelete = async (inc: Income) => {
    if (!window.confirm(`¿Eliminar el ingreso "${inc.source}"?`)) return;
    await removeIncome(inc.id);
  };

  // ── Handlers de gastos fijos ──
  const startExpenseEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseForm({
      name: exp.name,
      amount: exp.amount.toString(),
      dueDay: exp.due_day?.toString() ?? "",
    });
  };

  const saveExpenseEdit = async () => {
    if (!editingExpenseId || !expenseForm.name || !expenseForm.amount) return;
    await editExpense(editingExpenseId, {
      name: expenseForm.name,
      amount: parseFloat(expenseForm.amount),
      due_day: expenseForm.dueDay ? parseInt(expenseForm.dueDay) : null,
    });
    setEditingExpenseId(null);
  };

  const handleExpenseDelete = async (exp: Expense) => {
    if (!window.confirm(`¿Eliminar el gasto "${exp.name}"?`)) return;
    await removeExpense(exp.id);
  };

  // ── Retiro de ahorro ──
  const handleWithdraw = async () => {
    const parsed = parseFloat(withdrawAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    setWithdrawing(true);
    try {
      await addSavingsMovement({
        amount: -Math.abs(parsed),
        type: "withdraw",
        note: withdrawNote || "Retiro desde Perfil",
      });
      setWithdrawAmount("");
      setWithdrawNote("");
    } finally {
      setWithdrawing(false);
    }
  };

  // ── Historial unificado (últimos 30 movimientos) ──
  const history = useMemo<HistoryRow[]>(() => {
    const rows: HistoryRow[] = [
      ...incomes.map((i) => ({
        id: i.id,
        kind: "income" as const,
        label: i.source,
        detail: `Ingreso · ${i.received_at}`,
        amount: i.amount,
        date: i.received_at,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        kind: "expense" as const,
        label: e.name,
        detail: `Gasto ${e.type === "fixed" ? "fijo" : "variable"} · ${e.expense_date ?? e.created_at.slice(0, 10)}`,
        amount: -e.amount,
        date: e.expense_date ?? e.created_at.slice(0, 10),
      })),
      ...savingsMovements.map((m) => ({
        id: m.id,
        kind: "saving" as const,
        label: m.note || (m.type === "withdraw" ? "Retiro" : "Ahorro"),
        detail: `Ahorro (${m.type}) · ${m.created_at.slice(0, 10)}`,
        amount: m.amount,
        date: m.created_at.slice(0, 10),
      })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  }, [incomes, expenses, savingsMovements]);

  const handleHistoryDelete = async (row: HistoryRow) => {
    if (
      !window.confirm(
        `¿Eliminar "${row.label}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    if (row.kind === "income") await removeIncome(row.id);
    else if (row.kind === "expense") await removeExpense(row.id);
    else await removeSavingsMovement(row.id);
  };

  const fixedExpenses = expenses.filter((e) => e.type === "fixed");
  const recentIncomes = incomes.slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Perfil y ajustes"
        subtitle={profile?.email}
        actions={
          <Button variant="ghost" size="sm" icon={<LogOut size={16} />} onClick={signOut}>
            Salir
          </Button>
        }
      />

      {/* Meta de Ahorro */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Meta de ahorro</h2>
          <Badge tone="accent">Activo</Badge>
        </div>
        <Card className="space-y-4">
          <p className="text-sm text-muted">
            Define tu meta (nombre y monto). El ahorro es manual: regístralo
            cuando quieras en la pestaña <span className="font-semibold text-ink">Ahorros</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Nombre (ej. Moto)"
              value={goalNameInput}
              onChange={(e) => setGoalNameInput(e.target.value)}
              className="flex-1"
            />
            <AmountInput
              placeholder="Monto"
              value={goalInput}
              onChange={setGoalInput}
              className="flex-1"
            />
            <Button onClick={handleGoalSave}>Guardar</Button>
          </div>
          <p className="text-xs text-faint">
            Deja el monto vacío para quitar la meta.
          </p>
        </Card>
      </section>

      {/* Conexión con Gmail */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Conexión con Gmail</h2>
          {gmailStatus && (
            <Badge tone={gmailStatus.status === "active" ? "income" : "expense"}>
              {gmailStatus.status === "active"
                ? "Conectado"
                : gmailStatus.status === "revoked"
                  ? "Revocado"
                  : "Error"}
            </Badge>
          )}
        </div>
        <Card>
          {gmailNotice && (
            <p className="mb-3 text-sm text-muted">{gmailNotice}</p>
          )}

          {gmailLoading ? (
            <p className="text-sm text-muted">Cargando estado…</p>
          ) : gmailStatus ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid place-items-center h-10 w-10 rounded-full bg-surface-2 text-muted">
                  <Mail size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold">
                    {gmailStatus.gmail_address}
                  </p>
                  <p className="text-xs text-muted">
                    Última sincronización:{" "}
                    {gmailStatus.last_synced_at
                      ? new Date(gmailStatus.last_synced_at).toLocaleString()
                      : "nunca"}
                  </p>
                </div>
              </div>

              {gmailStatus.status === "revoked" && (
                <p className="mb-3 text-sm text-expense">
                  El acceso fue revocado en Google. Vuelve a conectar tu cuenta
                  para seguir importando correos.
                </p>
              )}
              {gmailStatus.last_error && gmailStatus.status === "error" && (
                <p className="mb-3 text-sm text-expense">
                  {gmailStatus.last_error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {gmailStatus.status === "active" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleGmailSync}
                    disabled={gmailSyncing}
                    icon={
                      <RefreshCw
                        size={14}
                        className={gmailSyncing ? "animate-spin" : ""}
                      />
                    }
                  >
                    Sincronizar ahora
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={handleGmailConnect}>
                    Reconectar
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleGmailDisconnect}>
                  Desconectar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-muted">
                Conecta tu Gmail para que las compras de Bancolombia, Nu y Nequi
                se registren automáticamente desde los correos del banco. Solo
                lectura: nunca enviamos ni borramos correos.
              </p>
              <Button onClick={handleGmailConnect} icon={<Mail size={16} />}>
                Conectar Gmail
              </Button>
            </>
          )}
        </Card>
      </section>

      {/* Fuentes de Ingreso */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Fuentes de ingreso</h2>
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => navigate("/incomes")}
          >
            Añadir
          </Button>
        </div>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {recentIncomes.map((inc) =>
              editingIncomeId === inc.id ? (
                <div key={inc.id} className="flex flex-wrap items-center gap-2 py-3">
                  <Input
                    value={incomeForm.source}
                    onChange={(e) =>
                      setIncomeForm({ ...incomeForm, source: e.target.value })
                    }
                    placeholder="Fuente"
                    className="flex-1 min-w-[120px]"
                  />
                  <AmountInput
                    value={incomeForm.amount}
                    onChange={(raw) =>
                      setIncomeForm({ ...incomeForm, amount: raw })
                    }
                    placeholder="Monto"
                    className="w-32"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingIncomeId(null)}
                    icon={<X size={14} />}
                  />
                  <Button size="sm" onClick={saveIncomeEdit} icon={<Check size={14} />} />
                </div>
              ) : (
                <ListRow
                  key={inc.id}
                  icon={<Briefcase size={16} />}
                  title={inc.source}
                  subtitle={new Date(inc.received_at).toLocaleDateString()}
                  value={
                    <span className="text-income">+{formatCurrency(inc.amount)}</span>
                  }
                  actions={
                    <>
                      <button
                        onClick={() => startIncomeEdit(inc)}
                        className="p-1.5 text-faint hover:text-accent transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleIncomeDelete(inc)}
                        className="p-1.5 text-faint hover:text-expense transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  }
                />
              ),
            )}
          </div>
          {recentIncomes.length === 0 && (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="Sin ingresos"
              description="Registra tu primera fuente de ingreso."
            />
          )}
        </Card>
        {incomes.length > recentIncomes.length && (
          <button
            onClick={() => navigate("/incomes")}
            className="text-sm font-semibold text-accent hover:text-accent-bright transition-colors"
          >
            Ver todos ({incomes.length}) →
          </button>
        )}
      </section>

      {/* Gastos Fijos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Gastos fijos</h2>
          <Button
            variant="ghost"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => navigate("/expenses")}
          >
            Añadir
          </Button>
        </div>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {fixedExpenses.map((exp) =>
              editingExpenseId === exp.id ? (
                <div key={exp.id} className="flex flex-wrap items-center gap-2 py-3">
                  <Input
                    value={expenseForm.name}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, name: e.target.value })
                    }
                    placeholder="Nombre"
                    className="flex-1 min-w-[120px]"
                  />
                  <AmountInput
                    value={expenseForm.amount}
                    onChange={(raw) =>
                      setExpenseForm({ ...expenseForm, amount: raw })
                    }
                    placeholder="Monto"
                    className="w-28"
                  />
                  <Input
                    type="number"
                    value={expenseForm.dueDay}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, dueDay: e.target.value })
                    }
                    placeholder="Día"
                    min="1"
                    max="31"
                    className="w-16"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingExpenseId(null)}
                    icon={<X size={14} />}
                  />
                  <Button size="sm" onClick={saveExpenseEdit} icon={<Check size={14} />} />
                </div>
              ) : (
                <ListRow
                  key={exp.id}
                  icon={<Home size={16} />}
                  title={exp.name}
                  subtitle={`${exp.due_day ? `Mensual · día ${exp.due_day}` : "Mensual"}${exp.paid ? " · pagado" : " · pendiente"}`}
                  value={
                    <span className="text-expense">-{formatCurrency(exp.amount)}</span>
                  }
                  actions={
                    <>
                      <button
                        onClick={() => startExpenseEdit(exp)}
                        className="p-1.5 text-faint hover:text-accent transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleExpenseDelete(exp)}
                        className="p-1.5 text-faint hover:text-expense transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  }
                />
              ),
            )}
          </div>
          {fixedExpenses.length === 0 && (
            <EmptyState
              icon={<Home size={20} />}
              title="Sin gastos fijos"
              description="Registra tus servicios recurrentes."
            />
          )}
        </Card>
      </section>

      {/* Ahorro: retiro rápido */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Ahorro</h2>
          <Badge tone="info" icon={<PiggyBank size={12} />}>
            {formatCurrency(summary.savingsAccumulated)}
          </Badge>
        </div>
        <Card className="space-y-3">
          <p className="text-sm text-muted">
            Registrar un retiro del ahorro (viaje, compra, etc.)
          </p>
          <div className="flex flex-wrap gap-2">
            <AmountInput
              placeholder="Monto"
              value={withdrawAmount}
              onChange={setWithdrawAmount}
              className="w-32"
            />
            <Input
              placeholder="Nota (opcional)"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
              className="flex-1 min-w-[140px]"
            />
            <Button
              variant="danger"
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount}
            >
              Retirar
            </Button>
          </div>
        </Card>
      </section>

      {/* Movimientos históricos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Movimientos históricos</h2>
          <button
            onClick={() => navigate("/reports")}
            className="text-sm font-semibold text-accent hover:text-accent-bright transition-colors"
          >
            Ver reporte →
          </button>
        </div>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {history.map((row) => (
              <ListRow
                key={`${row.kind}-${row.id}`}
                icon={
                  row.amount >= 0 ? (
                    <TrendingUp size={16} className="text-income" />
                  ) : (
                    <TrendingDown size={16} className="text-expense" />
                  )
                }
                title={row.label}
                subtitle={row.detail}
                value={
                  <span className={row.amount >= 0 ? "text-income" : "text-ink"}>
                    {row.amount >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(row.amount))}
                  </span>
                }
                actions={
                  <button
                    onClick={() => handleHistoryDelete(row)}
                    className="p-1.5 text-faint hover:text-expense transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 size={14} />
                  </button>
                }
              />
            ))}
          </div>
          {history.length === 0 && (
            <EmptyState
              icon={<Target size={20} />}
              title="Sin movimientos"
              description="Tus ingresos, gastos y ahorros aparecerán aquí."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
