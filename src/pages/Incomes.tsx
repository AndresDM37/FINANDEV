import { useState, useMemo, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  X,
  Check,
  Calendar,
  Wallet,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import type { Income } from "../types/finance.types";

export default function Incomes() {
  const { incomes, loading, addIncome, removeIncome, editIncome } = useFinance();

  // Create form state
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthYear); // Default to current month
  const [filterSource, setFilterSource] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    source: string;
    amount: string;
    receivedAt: string;
  } | null>(null);
  const [editingSubmitting, setEditingSubmitting] = useState(false);

  // Derived state
  const filteredIncomes = useMemo(() => {
    return incomes.filter((inc) => {
      const matchMonth = filterMonth
        ? inc.received_at.startsWith(filterMonth)
        : true;
      const matchSource = filterSource
        ? inc.source.toLowerCase().includes(filterSource.toLowerCase())
        : true;
      return matchMonth && matchSource;
    });
  }, [incomes, filterMonth, filterSource]);

  const currentMonthTotal = useMemo(() => {
    return incomes
      .filter((inc) => inc.received_at.startsWith(currentMonthYear))
      .reduce((acc, inc) => acc + inc.amount, 0);
  }, [incomes, currentMonthYear]);

  const currentYearTotal = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    return incomes
      .filter((inc) => inc.received_at.startsWith(currentYear))
      .reduce((acc, inc) => acc + inc.amount, 0);
  }, [incomes]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !source) return;
    setSubmitting(true);
    try {
      await addIncome({
        amount: parseFloat(amount),
        source,
        received_at: receivedAt,
      });
      setSource("");
      setAmount("");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (inc: Income) => {
    setEditingId(inc.id);
    setEditForm({
      source: inc.source,
      amount: inc.amount.toString(),
      receivedAt: inc.received_at,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    if (!editForm.amount || !editForm.source) return;

    setEditingSubmitting(true);
    try {
      await editIncome(editingId, {
        source: editForm.source,
        amount: parseFloat(editForm.amount),
        received_at: editForm.receivedAt,
      });
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      console.error("Error updating income", error);
    } finally {
      setEditingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a101f] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a101f] text-white font-sans pb-24 relative selection:bg-emerald-500/30">
      <div className="w-full max-w-md lg:max-w-3xl mx-auto p-5 lg:p-8">
        
        {/* Header Options */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="font-bold text-[22px] text-white tracking-wide">
            Ingresos
          </h1>
          <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
            <Wallet size={20} />
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#141b2e] border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Calendar size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Este Mes</span>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(currentMonthTotal)}</p>
          </div>
          <div className="bg-[#141b2e] border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <TrendingUp size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">Este Año</span>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(currentYearTotal)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#141b2e] border border-slate-800/80 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Buscar por fuente..."
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full bg-[#1e293b]/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-500"
            />
          </div>
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={16} className="text-slate-500" />
            </div>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full sm:w-40 bg-[#1e293b]/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
            />
          </div>
          {filterMonth && (
            <button 
              onClick={() => setFilterMonth('')}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-2 flex my-auto items-center"
            >
              Ver todos
            </button>
          )}
        </div>

        {/* Add New Income */}
        <div className="mb-8">
          <h2 className="font-bold text-lg text-white mb-4">Registrar Ingreso</h2>
          <form onSubmit={handleAdd} className="bg-[#141b2e] border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest pl-1">Fuente</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Wallet size={16} className="text-emerald-500/70" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ej. Salario, Freelance"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                    className="w-full bg-[#0a101f] border border-slate-800 text-white pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest pl-1">Monto</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign size={16} className="text-emerald-500/70" />
                  </div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    step="any"
                    required
                    className="w-full bg-[#0a101f] border border-slate-800 text-white pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
             <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest pl-1">Fecha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-emerald-500/70" />
                  </div>
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    required
                    className="w-full bg-[#0a101f] border border-slate-800 text-white pl-10 pr-4 py-3 rounded-xl text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                  />
                </div>
              </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#0a101f] font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-[#0a101f] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Plus size={18} strokeWidth={3} />
                  <span>Agregar Ingreso</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Incomes List */}
        <div>
          <h2 className="font-bold text-lg text-white mb-4 flex items-center justify-between">
            <span>Historial ({filteredIncomes.length})</span>
          </h2>
          
          <div className="bg-[#141b2e] rounded-2xl border border-slate-800/80 divide-y divide-slate-800/80">
            {filteredIncomes.map((inc) => (
              <div
                key={inc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#1e293b]/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl gap-4 sm:gap-0"
              >
                {editingId === inc.id && editForm ? (
                  // Inline Edit Form
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-center">
                    <input
                      type="text"
                      value={editForm.source}
                      onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                      className="w-full bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                      placeholder="Fuente"
                    />
                    <input
                      type="number"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                      className="w-full bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50"
                      placeholder="Monto"
                    />
                    <input
                      type="date"
                      value={editForm.receivedAt}
                      onChange={(e) => setEditForm({ ...editForm, receivedAt: e.target.value })}
                      className="w-full bg-[#0a101f] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-emerald-500/50 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        disabled={editingSubmitting}
                        className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={editingSubmitting}
                        className="p-2 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 rounded-lg transition-colors"
                      >
                        <Check size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal View
                  <>
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-emerald-500">
                         <TrendingUp size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">
                          {inc.source}
                        </h3>
                        <p className="text-xs text-slate-400">{new Date(inc.received_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                      <span className="font-black text-white text-[15px] tabular-nums">
                        +{formatCurrency(inc.amount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEdit(inc)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => removeIncome(inc.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-900/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {filteredIncomes.length === 0 && (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
                <Wallet size={32} className="opacity-20" />
                <p className="text-sm font-medium">No se encontraron ingresos.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
