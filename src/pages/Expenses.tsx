import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, CheckCircle, Circle, Pencil, X, Check } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import { EXPENSE_CATEGORIES, getCategoryDef } from "../utils/categories";
import type {
  Expense,
  ExpenseCategory,
  ExpenseType,
} from "../types/finance.types";

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

  // Edición inline (mismo patrón que Incomes.tsx)
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

  // Total del mes actual por categoría (gastos variables)
  const categoryTotals = useMemo(() => {
    const now = new Date();
    const totals = new Map<ExpenseCategory, number>();
    for (const exp of variableExpenses) {
      const d = new Date(exp.expense_date ?? exp.created_at);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth())
        continue;
      const cat = exp.category ?? "other";
      totals.set(cat, (totals.get(cat) ?? 0) + exp.amount);
    }
    return EXPENSE_CATEGORIES.filter((c) => totals.has(c.id)).map((c) => ({
      ...c,
      total: totals.get(c.id)!,
    }));
  }, [variableExpenses]);

  if (loading) return <div className="page-loader">Cargando gastos...</div>;

  const renderEditRow = (expType: ExpenseType) =>
    editForm && (
      <div className="edit-row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", width: "100%" }}>
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          placeholder="Nombre"
          style={{ flex: 2, minWidth: 120 }}
        />
        <input
          type="number"
          value={editForm.amount}
          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
          placeholder="Monto"
          min="1"
          step="any"
          style={{ flex: 1, minWidth: 90 }}
        />
        {expType === "fixed" ? (
          <>
            <input
              type="number"
              value={editForm.dueDay}
              onChange={(e) => setEditForm({ ...editForm, dueDay: e.target.value })}
              placeholder="Día"
              min="1"
              max="31"
              style={{ width: 70 }}
            />
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editForm.recurring}
                onChange={(e) =>
                  setEditForm({ ...editForm, recurring: e.target.checked })
                }
              />
              Recurrente
            </label>
          </>
        ) : (
          <>
            <input
              type="date"
              value={editForm.expenseDate}
              onChange={(e) =>
                setEditForm({ ...editForm, expenseDate: e.target.value })
              }
            />
            <select
              value={editForm.category}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  category: e.target.value as ExpenseCategory,
                })
              }
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          className="btn-icon"
          onClick={cancelEdit}
          disabled={editSubmitting}
          title="Cancelar"
        >
          <X size={16} />
        </button>
        <button
          className="btn-icon"
          onClick={() => saveEdit(expType)}
          disabled={editSubmitting}
          title="Guardar"
        >
          <Check size={16} className="text-income" />
        </button>
      </div>
    );

  return (
    <div className="page">
      <h1 className="page-title">Gastos</h1>

      <form onSubmit={handleAdd} className="form-inline">
        <input
          type="text"
          placeholder="Nombre del gasto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          step="any"
          required
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ExpenseType)}
        >
          <option value="variable">Variable</option>
          <option value="fixed">Fijo</option>
        </select>

        {type === "fixed" && (
          <input
            type="number"
            placeholder="Día vencimiento"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            min="1"
            max="31"
          />
        )}

        {type === "variable" && (
          <>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </>
        )}

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          Recurrente
        </label>

        <button type="submit" disabled={submitting}>
          <Plus size={16} /> Agregar
        </button>
      </form>

      {/* Gastos Fijos */}
      <section className="section">
        <h2 className="section-title">Gastos Fijos</h2>
        <ul className="list">
          {fixedExpenses.map((exp) => (
            <li key={exp.id} className="list-item">
              {editingId === exp.id ? (
                renderEditRow("fixed")
              ) : (
                <>
                  <button
                    className="btn-icon"
                    onClick={() => togglePaid(exp.id, !exp.paid)}
                    title={exp.paid ? "Marcar pendiente" : "Marcar pagado"}
                  >
                    {exp.paid ? (
                      <CheckCircle size={18} className="text-income" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                  <div className="list-item__info">
                    <span className={exp.paid ? "line-through" : ""}>
                      {exp.name}
                    </span>
                    {exp.due_day && (
                      <span className="text-muted"> — día {exp.due_day}</span>
                    )}
                  </div>
                  <div className="list-item__actions">
                    <span className="text-expense">
                      {formatCurrency(exp.amount)}
                    </span>
                    <button
                      className="btn-icon"
                      onClick={() => startEdit(exp)}
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => removeExpense(exp.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {fixedExpenses.length === 0 && (
            <li className="list-item text-muted">Sin gastos fijos</li>
          )}
        </ul>
      </section>

      {/* Gastos Variables */}
      <section className="section">
        <h2 className="section-title">Gastos Variables (hormiga)</h2>
        <ul className="list">
          {variableExpenses.map((exp) => {
            const cat = getCategoryDef(exp.category);
            const CatIcon = cat.icon;
            return (
              <li key={exp.id} className="list-item">
                {editingId === exp.id ? (
                  renderEditRow("variable")
                ) : (
                  <>
                    <span className="btn-icon" title={cat.label}>
                      <CatIcon size={16} />
                    </span>
                    <div className="list-item__info">
                      <span>{exp.name}</span>
                      <span className="text-muted">
                        {" "}
                        — {cat.label} · {exp.expense_date}
                      </span>
                    </div>
                    <div className="list-item__actions">
                      <span className="text-expense">
                        {formatCurrency(exp.amount)}
                      </span>
                      <button
                        className="btn-icon"
                        onClick={() => startEdit(exp)}
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => removeExpense(exp.id)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
          {variableExpenses.length === 0 && (
            <li className="list-item text-muted">Sin gastos variables</li>
          )}
        </ul>
      </section>

      {/* Total del mes por categoría */}
      {categoryTotals.length > 0 && (
        <section className="section">
          <h2 className="section-title">Total del mes por categoría</h2>
          <ul className="list">
            {categoryTotals.map((c) => {
              const CatIcon = c.icon;
              return (
                <li key={c.id} className="list-item">
                  <span className="btn-icon">
                    <CatIcon size={16} />
                  </span>
                  <div className="list-item__info">
                    <span>{c.label}</span>
                  </div>
                  <span className="text-expense">{formatCurrency(c.total)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
