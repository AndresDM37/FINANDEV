import { useState, type FormEvent } from "react";
import { Plus, Trash2, CheckCircle, Circle } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import type { ExpenseType } from "../types/finance.types";

export default function Expenses() {
  const { expenses, loading, addExpense, togglePaid, removeExpense } =
    useFinance();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<ExpenseType>("variable");
  const [dueDay, setDueDay] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [recurring, setRecurring] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setSubmitting(true);
    try {
      await addExpense({
        name,
        amount: parseFloat(amount),
        type,
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

  const fixedExpenses = expenses.filter((e) => e.type === "fixed");
  const variableExpenses = expenses.filter((e) => e.type === "variable");

  if (loading) return <div className="page-loader">Cargando gastos...</div>;

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
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
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
                  className="btn-icon btn-danger"
                  onClick={() => removeExpense(exp.id)}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
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
          {variableExpenses.map((exp) => (
            <li key={exp.id} className="list-item">
              <div className="list-item__info">
                <span>{exp.name}</span>
                <span className="text-muted"> — {exp.expense_date}</span>
              </div>
              <div className="list-item__actions">
                <span className="text-expense">
                  {formatCurrency(exp.amount)}
                </span>
                <button
                  className="btn-icon btn-danger"
                  onClick={() => removeExpense(exp.id)}
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
          {variableExpenses.length === 0 && (
            <li className="list-item text-muted">Sin gastos variables</li>
          )}
        </ul>
      </section>
    </div>
  );
}
