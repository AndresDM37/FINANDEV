import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import {
  updateSavingsPercentage,
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
  ArrowLeft,
  MoreVertical,
  Briefcase,
  Home,
  Plus,
  Pencil,
  Trash2,
  LayoutDashboard,
  PieChart,
  User,
  CreditCard,
  Mail,
  RefreshCw,
  Check,
  X,
  PiggyBank,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

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

  const [percentage, setPercentage] = useState(
    profile?.savings_percentage?.toString() ?? "20",
  );
  const [goalInput, setGoalInput] = useState(
    profile?.savings_goal?.toString() ?? "",
  );

  // El perfil puede llegar después del primer render: sincronizar
  useEffect(() => {
    if (profile) {
      setPercentage(profile.savings_percentage.toString());
      setGoalInput(profile.savings_goal?.toString() ?? "");
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
    // Mensaje al volver del consentimiento de Google (?gmail=connected|error)
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
      setGmailNotice(`⚠️ ${err instanceof Error ? err.message : "Error al iniciar la conexión"}`);
    }
  };

  const handleGmailDisconnect = async () => {
    if (!window.confirm("¿Desconectar Gmail? Dejarán de importarse tus correos del banco.")) return;
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

  // Ahorro estimado del mes según ingresos reales
  const estAmount =
    (summary.totalIncome * (parseInt(percentage) || 0)) / 100;

  const handleSave = async (newVal: number) => {
    if (!profile) return;
    try {
      await updateSavingsPercentage(profile.id, newVal);
      await refreshProfile();
    } catch {
      console.error("Error saving percentage");
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPercentage(val);
  };

  const handleSliderMouseUp = () => {
    handleSave(parseInt(percentage));
  };

  const handleGoalSave = async () => {
    if (!profile) return;
    const parsed = parseFloat(goalInput);
    const goal = goalInput && !isNaN(parsed) && parsed > 0 ? parsed : null;
    try {
      await updateSavingsGoal(profile.id, goal);
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
    if (!window.confirm(`¿Eliminar "${row.label}"? Esta acción no se puede deshacer.`))
      return;
    if (row.kind === "income") await removeIncome(row.id);
    else if (row.kind === "expense") await removeExpense(row.id);
    else await removeSavingsMovement(row.id);
  };

  const fixedExpenses = expenses.filter((e) => e.type === "fixed");
  const recentIncomes = incomes.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#111814] text-white font-sans pb-24 relative selection:bg-emerald-500/30">
      <div className="w-full max-w-md lg:max-w-3xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <button
            className="text-slate-200 hover:text-white transition-colors"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-[17px] text-white tracking-wide">
            Perfil
          </h1>
          <button className="text-slate-200 hover:text-white transition-colors">
            <MoreVertical size={20} />
          </button>
        </header>

        {/* View / Admin Mode Toggle */}
        <div className="bg-[#1e293b]/50 rounded-full p-1 flex items-center mb-8 border border-slate-800/60">
          <button className="flex-1 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors rounded-full text-center">
            Vista General
          </button>
          <button className="flex-1 py-2 text-sm font-bold text-emerald-400 bg-[#0a101f] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-slate-800/80 text-center">
            Modo Edición
          </button>
        </div>

        {/* Savings Target Widget */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Meta de Ahorro</h2>
            <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">
              Activo
            </span>
          </div>

          <div className="bg-[#141b2e] rounded-2xl p-5 border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Ahorro Automático</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-black text-white">
                    {percentage}
                  </span>
                  <span className="text-emerald-500 font-bold text-lg">%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Monto Est.</p>
                <p className="text-white font-bold">
                  {formatCurrency(estAmount)}
                </p>
              </div>
            </div>

            {/* Custom Range Slider */}
            <div className="relative mb-6">
              <input
                type="range"
                min="0"
                max="50"
                value={percentage}
                onChange={handleSliderChange}
                onMouseUp={handleSliderMouseUp}
                onTouchEnd={handleSliderMouseUp}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 z-10 relative"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(parseInt(percentage) / 50) * 100}%, #1e293b ${(parseInt(percentage) / 50) * 100}%, #1e293b 100%)`,
                }}
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-4">
              <label className="text-xs text-slate-400 block mb-2">
                Meta total de ahorro (deja vacío para quitarla)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Ej. 10.000.000"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="flex-1 bg-[#0a101f] border border-slate-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleGoalSave}
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Conexión con Gmail */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Conexión con Gmail</h2>
            {gmailStatus && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                  gmailStatus.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {gmailStatus.status === "active"
                  ? "Conectado"
                  : gmailStatus.status === "revoked"
                    ? "Revocado"
                    : "Error"}
              </span>
            )}
          </div>

          <div className="bg-[#141b2e] rounded-2xl p-5 border border-slate-800/80 shadow-sm">
            {gmailNotice && (
              <p className="text-xs text-slate-300 mb-3">{gmailNotice}</p>
            )}

            {gmailLoading ? (
              <p className="text-xs text-slate-400">Cargando estado...</p>
            ) : gmailStatus ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      {gmailStatus.gmail_address}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Última sincronización:{" "}
                      {gmailStatus.last_synced_at
                        ? new Date(gmailStatus.last_synced_at).toLocaleString()
                        : "nunca"}
                    </p>
                  </div>
                </div>

                {gmailStatus.status === "revoked" && (
                  <p className="text-xs text-red-400 mb-3">
                    El acceso fue revocado en Google. Vuelve a conectar tu
                    cuenta para seguir importando correos.
                  </p>
                )}
                {gmailStatus.last_error && gmailStatus.status === "error" && (
                  <p className="text-xs text-red-400 mb-3">
                    {gmailStatus.last_error}
                  </p>
                )}

                <div className="flex gap-3">
                  {gmailStatus.status === "active" ? (
                    <button
                      onClick={handleGmailSync}
                      disabled={gmailSyncing}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        size={14}
                        className={gmailSyncing ? "animate-spin" : ""}
                      />
                      Sincronizar ahora
                    </button>
                  ) : (
                    <button
                      onClick={handleGmailConnect}
                      className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      Reconectar
                    </button>
                  )}
                  <button
                    onClick={handleGmailDisconnect}
                    className="text-xs font-bold text-red-900/60 hover:text-red-400 transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-4">
                  Conecta tu Gmail para que las compras de Bancolombia, Nu y
                  Nequi se registren automáticamente desde los correos del
                  banco. Solo lectura: nunca enviamos ni borramos correos.
                </p>
                <button
                  onClick={handleGmailConnect}
                  className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm px-4 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors"
                >
                  <Mail size={16} />
                  Conectar Gmail
                </button>
              </>
            )}
          </div>
        </div>

        {/* Income Sources */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Fuentes de Ingreso</h2>
            <button
              onClick={() => (window.location.href = "/incomes")}
              title="Agregar ingreso"
              className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>

          <div className="bg-[#141b2e] rounded-2xl border border-slate-800/80 divide-y divide-slate-800/80">
            {recentIncomes.map((inc) => (
              <div
                key={inc.id}
                className="p-4 flex items-center justify-between hover:bg-[#1e293b]/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl gap-3"
              >
                {editingIncomeId === inc.id ? (
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={incomeForm.source}
                      onChange={(e) =>
                        setIncomeForm({ ...incomeForm, source: e.target.value })
                      }
                      placeholder="Fuente"
                      className="flex-1 min-w-[120px] bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                    />
                    <input
                      type="number"
                      value={incomeForm.amount}
                      onChange={(e) =>
                        setIncomeForm({ ...incomeForm, amount: e.target.value })
                      }
                      placeholder="Monto"
                      className="w-32 bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                    />
                    <button
                      onClick={() => setEditingIncomeId(null)}
                      className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={saveIncomeEdit}
                      className="p-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 rounded-lg transition-colors"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">
                          {inc.source}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {new Date(inc.received_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white text-sm">
                        +{formatCurrency(inc.amount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startIncomeEdit(inc)}
                          className="text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleIncomeDelete(inc)}
                          className="text-red-900/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {recentIncomes.length === 0 && (
              <p className="p-4 text-xs text-slate-500">Sin ingresos registrados.</p>
            )}
          </div>
          {incomes.length > recentIncomes.length && (
            <button
              onClick={() => (window.location.href = "/incomes")}
              className="mt-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Ver todos ({incomes.length}) →
            </button>
          )}
        </div>

        {/* Fixed Expenses */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Gastos Fijos</h2>
            <button
              onClick={() => (window.location.href = "/expenses")}
              title="Agregar gasto"
              className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>

          <div className="bg-[#141b2e] rounded-2xl border border-slate-800/80 divide-y divide-slate-800/80">
            {fixedExpenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 flex items-center justify-between hover:bg-[#1e293b]/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl gap-3"
              >
                {editingExpenseId === exp.id ? (
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={expenseForm.name}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, name: e.target.value })
                      }
                      placeholder="Nombre"
                      className="flex-1 min-w-[120px] bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                    />
                    <input
                      type="number"
                      value={expenseForm.amount}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, amount: e.target.value })
                      }
                      placeholder="Monto"
                      className="w-28 bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                    />
                    <input
                      type="number"
                      value={expenseForm.dueDay}
                      onChange={(e) =>
                        setExpenseForm({ ...expenseForm, dueDay: e.target.value })
                      }
                      placeholder="Día"
                      min="1"
                      max="31"
                      className="w-16 bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                    />
                    <button
                      onClick={() => setEditingExpenseId(null)}
                      className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={saveExpenseEdit}
                      className="p-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 rounded-lg transition-colors"
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                        <Home size={16} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">
                          {exp.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {exp.due_day ? `Mensual · día ${exp.due_day}` : "Mensual"}
                          {exp.paid ? " · ✅ pagado" : " · pendiente"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-white text-sm">
                        -{formatCurrency(exp.amount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startExpenseEdit(exp)}
                          className="text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleExpenseDelete(exp)}
                          className="text-red-900/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {fixedExpenses.length === 0 && (
              <p className="p-4 text-xs text-slate-500">Sin gastos fijos.</p>
            )}
          </div>
        </div>

        {/* Ahorro: acumulado + retiro rápido */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Ahorro</h2>
            <span className="bg-blue-500/10 text-blue-400 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-500/20 flex items-center gap-1">
              <PiggyBank size={12} />
              {formatCurrency(summary.savingsAccumulated)}
            </span>
          </div>
          <div className="bg-[#141b2e] rounded-2xl p-5 border border-slate-800/80 shadow-sm">
            <p className="text-xs text-slate-400 mb-3">
              Registrar un retiro del ahorro (viaje, compra, etc.)
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Monto"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-32 bg-[#0a101f] border border-slate-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
              />
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                className="flex-1 min-w-[140px] bg-[#0a101f] border border-slate-800 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
              />
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount}
                className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Retirar
              </button>
            </div>
          </div>
        </div>

        {/* Movimientos históricos */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">
              Movimientos Históricos
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">
              últimos {history.length}
            </span>
          </div>
          <div className="bg-[#141b2e] rounded-2xl border border-slate-800/80 divide-y divide-slate-800/80">
            {history.map((row) => (
              <div
                key={`${row.kind}-${row.id}`}
                className="p-4 flex items-center justify-between hover:bg-[#1e293b]/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-8 h-8 shrink-0 rounded-full border border-slate-800/80 flex items-center justify-center ${
                      row.amount >= 0
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {row.amount >= 0 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-100 truncate">
                      {row.label}
                    </h3>
                    <p className="text-xs text-slate-400">{row.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-bold text-sm ${
                      row.amount >= 0 ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {row.amount >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(row.amount))}
                  </span>
                  <button
                    onClick={() => handleHistoryDelete(row)}
                    className="text-red-900/40 hover:text-red-500 transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="p-4 text-xs text-slate-500">Sin movimientos.</p>
            )}
          </div>
        </div>

        {/* Helper Logout button at the very bottom since this view was also used for Settings */}
        <div className="mt-12 text-center pb-8">
          <button
            onClick={signOut}
            className="text-slate-500 hover:text-red-400 text-sm font-bold transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md lg:max-w-2xl left-1/2 -translate-x-1/2 bg-[#0a101f]/95 backdrop-blur-md border-t lg:border border-slate-800/60 lg:bottom-6 lg:rounded-2xl px-6 py-4 flex justify-between items-center z-40">
        <button
          className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
          onClick={() => (window.location.href = "/")}
        >
          <LayoutDashboard size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
            Resumen
          </span>
        </button>

        <button
          className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
          onClick={() => (window.location.href = "/analytics")}
        >
          <PieChart size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
            Análisis
          </span>
        </button>

        <button className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none">
          <CreditCard size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
            Tarjetas
          </span>
        </button>

        <button className="flex flex-col items-center gap-1.5 focus:outline-none">
          <User size={20} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500">Perfil</span>
        </button>
      </nav>

      {/* Dynamic styles for the custom range slider thumb */}
      <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 4px solid #141b2e;
            box-shadow: 0 0 0 2px #10b981, 0 2px 5px rgba(0,0,0,0.3);
            transform: translateY(-2px);
          }
          input[type=range]::-moz-range-thumb {
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 4px solid #141b2e;
            box-shadow: 0 0 0 2px #10b981, 0 2px 5px rgba(0,0,0,0.3);
            transform: translateY(-2px);
          }
        `}</style>
    </div>
  );
}
