import { useState, useMemo, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
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
import {
  PageHeader,
  StatCard,
  Card,
  Input,
  AmountInput,
  Button,
  ListRow,
  EmptyState,
  Loader,
} from "../components/ui";

export default function Incomes() {
  const { incomes, loading, addIncome, removeIncome, editIncome } = useFinance();

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);

  const currentMonthYear = new Date().toISOString().slice(0, 7);
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthYear);
  const [filterSource, setFilterSource] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    source: string;
    amount: string;
    receivedAt: string;
  } | null>(null);
  const [editingSubmitting, setEditingSubmitting] = useState(false);

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

  if (loading) return <Loader page label="Cargando ingresos…" />;

  return (
    <div className="space-y-8">
      <PageHeader title="Ingresos" icon={<Wallet size={20} />} />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Este mes"
          value={formatCurrency(currentMonthTotal)}
          icon={<Calendar size={16} />}
          tone="income"
        />
        <StatCard
          label="Este año"
          value={formatCurrency(currentYearTotal)}
          icon={<TrendingUp size={16} />}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          icon={<Search size={16} />}
          placeholder="Buscar por fuente…"
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="flex-1"
        />
        <Input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="sm:w-48"
        />
        {filterMonth && (
          <Button variant="ghost" size="sm" onClick={() => setFilterMonth("")}>
            Ver todos
          </Button>
        )}
      </div>

      {/* Registrar ingreso */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Registrar ingreso</h2>
        <Card>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Fuente"
                icon={<Wallet size={16} />}
                placeholder="Ej. Salario, Freelance"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
              <AmountInput
                label="Monto"
                icon={<DollarSign size={16} />}
                placeholder="0"
                value={amount}
                onChange={setAmount}
                required
              />
            </div>
            <Input
              label="Fecha"
              icon={<Calendar size={16} />}
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              required
            />
            <Button
              type="submit"
              loading={submitting}
              icon={<Plus size={18} />}
              fullWidth
            >
              Agregar ingreso
            </Button>
          </form>
        </Card>
      </section>

      {/* Historial */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">
          Historial ({filteredIncomes.length})
        </h2>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {filteredIncomes.map((inc) =>
              editingId === inc.id && editForm ? (
                <div
                  key={inc.id}
                  className="flex flex-wrap items-center gap-2 py-3"
                >
                  <Input
                    value={editForm.source}
                    onChange={(e) =>
                      setEditForm({ ...editForm, source: e.target.value })
                    }
                    placeholder="Fuente"
                    className="flex-[2] min-w-[120px]"
                  />
                  <AmountInput
                    value={editForm.amount}
                    onChange={(raw) =>
                      setEditForm({ ...editForm, amount: raw })
                    }
                    placeholder="Monto"
                    className="flex-1 min-w-[90px]"
                  />
                  <Input
                    type="date"
                    value={editForm.receivedAt}
                    onChange={(e) =>
                      setEditForm({ ...editForm, receivedAt: e.target.value })
                    }
                    className="w-40"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={editingSubmitting}
                    icon={<X size={14} />}
                  />
                  <Button
                    size="sm"
                    onClick={saveEdit}
                    loading={editingSubmitting}
                    icon={<Check size={14} />}
                  />
                </div>
              ) : (
                <ListRow
                  key={inc.id}
                  icon={<TrendingUp size={16} className="text-income" />}
                  title={inc.source}
                  subtitle={new Date(inc.received_at).toLocaleDateString()}
                  value={
                    <span className="text-income">+{formatCurrency(inc.amount)}</span>
                  }
                  actions={
                    <>
                      <button
                        onClick={() => startEdit(inc)}
                        className="p-1.5 text-faint hover:text-accent transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeIncome(inc.id)}
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
          {filteredIncomes.length === 0 && (
            <EmptyState
              icon={<Wallet size={20} />}
              title="Sin ingresos"
              description="No se encontraron ingresos con estos filtros."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
