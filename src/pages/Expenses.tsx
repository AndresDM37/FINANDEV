import { useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Pencil,
  X,
  Check,
  CreditCard,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import { EXPENSE_CATEGORIES, getCategoryDef } from "../utils/categories";
import type {
  Expense,
  ExpenseCategory,
  ExpenseType,
} from "../types/finance.types";
import {
  PageHeader,
  Card,
  Input,
  AmountInput,
  Select,
  Switch,
  SegmentedControl,
  Button,
  ListRow,
  EmptyState,
  Loader,
} from "../components/ui";

interface EditForm {
  name: string;
  amount: string;
  dueDay: string;
  expenseDate: string;
  recurring: boolean;
  category: ExpenseCategory;
}

export default function Expenses() {
  const { expenses, loading, addExpense, editExpense, togglePaid, removeExpense } =
    useFinance();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<ExpenseType>("variable");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [dueDay, setDueDay] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setSubmitting(true);
    try {
      await addExpense({
        name,
        amount: parseFloat(amount),
        type,
        category: type === "variable" ? category : null,
        due_day: type === "fixed" && dueDay ? parseInt(dueDay) : null,
        expense_date: type === "variable" ? expenseDate : null,
        recurring,
        paid: false,
      });
      setName("");
      setAmount("");
      setDueDay("");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setEditForm({
      name: exp.name,
      amount: exp.amount.toString(),
      dueDay: exp.due_day?.toString() ?? "",
      expenseDate: exp.expense_date ?? new Date().toISOString().slice(0, 10),
      recurring: exp.recurring,
      category: exp.category ?? "other",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (expType: ExpenseType) => {
    if (!editingId || !editForm) return;
    if (!editForm.name || !editForm.amount) return;
    setEditSubmitting(true);
    try {
      await editExpense(
        editingId,
        expType === "fixed"
          ? {
              name: editForm.name,
              amount: parseFloat(editForm.amount),
              due_day: editForm.dueDay ? parseInt(editForm.dueDay) : null,
              recurring: editForm.recurring,
            }
          : {
              name: editForm.name,
              amount: parseFloat(editForm.amount),
              expense_date: editForm.expenseDate,
              category: editForm.category,
            },
      );
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      console.error("Error updating expense", error);
    } finally {
      setEditSubmitting(false);
    }
  };

  const fixedExpenses = expenses.filter((e) => e.type === "fixed");
  const variableExpenses = expenses.filter((e) => e.type === "variable");

  const categoryTotals = useMemo(() => {
    const now = new Date();
    const totals = new Map<ExpenseCategory, number>();
    for (const exp of variableExpenses) {
      const d = new Date(exp.expense_date ?? exp.created_at);
      if (
        d.getFullYear() !== now.getFullYear() ||
        d.getMonth() !== now.getMonth()
      )
        continue;
      const cat = exp.category ?? "other";
      totals.set(cat, (totals.get(cat) ?? 0) + exp.amount);
    }
    return EXPENSE_CATEGORIES.filter((c) => totals.has(c.id)).map((c) => ({
      ...c,
      total: totals.get(c.id)!,
    }));
  }, [variableExpenses]);

  const monthTotal = categoryTotals.reduce((acc, c) => acc + c.total, 0);

  if (loading) return <Loader page label="Cargando gastos…" />;

  const renderEditRow = (expType: ExpenseType) =>
    editForm && (
      <div className="flex flex-wrap items-center gap-2 py-3 w-full">
        <Input
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          placeholder="Nombre"
          className="flex-[2] min-w-[120px]"
        />
        <AmountInput
          value={editForm.amount}
          onChange={(raw) => setEditForm({ ...editForm, amount: raw })}
          placeholder="Monto"
          className="flex-1 min-w-[90px]"
        />
        {expType === "fixed" ? (
          <Input
            type="number"
            value={editForm.dueDay}
            onChange={(e) => setEditForm({ ...editForm, dueDay: e.target.value })}
            placeholder="Día"
            min="1"
            max="31"
            className="w-20"
          />
        ) : (
          <>
            <Input
              type="date"
              value={editForm.expenseDate}
              onChange={(e) =>
                setEditForm({ ...editForm, expenseDate: e.target.value })
              }
              className="w-40"
            />
            <Select
              value={editForm.category}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  category: e.target.value as ExpenseCategory,
                })
              }
              className="w-32"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={cancelEdit}
          disabled={editSubmitting}
          icon={<X size={14} />}
        />
        <Button
          size="sm"
          onClick={() => saveEdit(expType)}
          loading={editSubmitting}
          icon={<Check size={14} />}
        />
      </div>
    );

  return (
    <div className="space-y-8">
      <PageHeader title="Gastos" icon={<CreditCard size={20} />} />

      {/* Formulario de alta */}
      <Card className="space-y-4">
        <SegmentedControl<ExpenseType>
          value={type}
          onChange={setType}
          segments={[
            { value: "variable", label: "Variable" },
            { value: "fixed", label: "Fijo" },
          ]}
        />
        <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
          <Input
            placeholder="Nombre del gasto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <AmountInput
            placeholder="Monto"
            value={amount}
            onChange={setAmount}
            required
          />
          {type === "fixed" ? (
            <Input
              type="number"
              placeholder="Día de vencimiento"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              min="1"
              max="31"
            />
          ) : (
            <>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
              <Select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExpenseCategory)
                }
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </>
          )}
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3.5 h-11 sm:col-span-2">
            <span className="text-sm text-muted">Gasto recurrente</span>
            <Switch checked={recurring} onChange={setRecurring} />
          </label>
          <Button
            type="submit"
            loading={submitting}
            icon={<Plus size={16} />}
            fullWidth
            className="sm:col-span-2"
          >
            Agregar gasto
          </Button>
        </form>
      </Card>

      {/* Gastos fijos */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Gastos fijos</h2>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {fixedExpenses.map((exp) =>
              editingId === exp.id ? (
                <div key={exp.id}>{renderEditRow("fixed")}</div>
              ) : (
                <ListRow
                  key={exp.id}
                  icon={
                    <button
                      onClick={() => togglePaid(exp.id, !exp.paid)}
                      title={exp.paid ? "Marcar pendiente" : "Marcar pagado"}
                      className="grid place-items-center"
                    >
                      {exp.paid ? (
                        <CheckCircle size={18} className="text-income" />
                      ) : (
                        <Circle size={18} className="text-faint" />
                      )}
                    </button>
                  }
                  title={
                    <span className={exp.paid ? "line-through text-muted" : ""}>
                      {exp.name}
                    </span>
                  }
                  subtitle={exp.due_day ? `Vence el día ${exp.due_day}` : undefined}
                  value={<span className="text-expense">{formatCurrency(exp.amount)}</span>}
                  actions={
                    <>
                      <button
                        onClick={() => startEdit(exp)}
                        className="p-1.5 text-faint hover:text-accent transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeExpense(exp.id)}
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
              icon={<CreditCard size={20} />}
              title="Sin gastos fijos"
              description="Añade tus servicios recurrentes arriba."
            />
          )}
        </Card>
      </section>

      {/* Gastos variables */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Gastos variables (hormiga)</h2>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {variableExpenses.map((exp) => {
              const cat = getCategoryDef(exp.category);
              const CatIcon = cat.icon;
              return editingId === exp.id ? (
                <div key={exp.id}>{renderEditRow("variable")}</div>
              ) : (
                <ListRow
                  key={exp.id}
                  icon={<CatIcon size={16} className="text-warning" />}
                  title={exp.name}
                  subtitle={`${cat.label}${exp.expense_date ? ` · ${exp.expense_date}` : ""}`}
                  value={<span className="text-expense">{formatCurrency(exp.amount)}</span>}
                  actions={
                    <>
                      <button
                        onClick={() => startEdit(exp)}
                        className="p-1.5 text-faint hover:text-accent transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => removeExpense(exp.id)}
                        className="p-1.5 text-faint hover:text-expense transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  }
                />
              );
            })}
          </div>
          {variableExpenses.length === 0 && (
            <EmptyState
              icon={<CreditCard size={20} />}
              title="Sin gastos variables"
              description="Registra tus gastos del día a día."
            />
          )}
        </Card>
      </section>

      {/* Total del mes por categoría */}
      {categoryTotals.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Este mes por categoría</h2>
            <span className="text-sm font-semibold nums text-expense">
              {formatCurrency(monthTotal)}
            </span>
          </div>
          <Card className="space-y-3">
            {categoryTotals.map((c) => {
              const CatIcon = c.icon;
              const widthPct = monthTotal ? (c.total / monthTotal) * 100 : 0;
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CatIcon size={14} className="text-muted" />
                      {c.label}
                    </span>
                    <span className="nums font-medium">
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                  <span className="block h-1.5 w-full rounded-full bg-surface-2">
                    <span
                      className="block h-1.5 rounded-full bg-accent"
                      style={{ width: `${widthPct}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}
