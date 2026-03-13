import { useState, type FormEvent } from "react";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import type { SavingsMovementType } from "../types/finance.types";

export default function Savings() {
  const {
    savingsMovements,
    summary,
    loading,
    addSavingsMovement,
    removeSavingsMovement,
  } = useFinance();

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<SavingsMovementType>("manual");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    try {
      const numAmount = parseFloat(amount);
      await addSavingsMovement({
        amount:
          type === "withdraw" ? -Math.abs(numAmount) : Math.abs(numAmount),
        type,
        note,
      });
      setAmount("");
      setNote("");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loader">Cargando ahorros...</div>;

  return (
    <div className="page">
      <h1 className="page-title">Ahorros</h1>

      <div className="savings-summary">
        <h2>
          Acumulado:{" "}
          <span className="text-savings">
            {formatCurrency(summary.savingsAccumulated)}
          </span>
        </h2>
      </div>

      <form onSubmit={handleAdd} className="form-inline">
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
          onChange={(e) => setType(e.target.value as SavingsMovementType)}
        >
          <option value="manual">Ahorro manual</option>
          <option value="withdraw">Retiro</option>
        </select>
        <input
          type="text"
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          <Plus size={16} /> Registrar
        </button>
      </form>

      <ul className="list">
        {savingsMovements.map((mov) => (
          <li key={mov.id} className="list-item">
            <div className="list-item__info">
              {mov.amount >= 0 ? (
                <ArrowDownCircle size={18} className="text-income" />
              ) : (
                <ArrowUpCircle size={18} className="text-expense" />
              )}
              <span>
                {mov.type === "auto"
                  ? "🤖 Auto"
                  : mov.type === "manual"
                    ? "✋ Manual"
                    : "💸 Retiro"}
              </span>
              {mov.note && <span className="text-muted"> — {mov.note}</span>}
            </div>
            <div className="list-item__actions">
              <span
                className={mov.amount >= 0 ? "text-income" : "text-expense"}
              >
                {formatCurrency(mov.amount)}
              </span>
              <button
                className="btn-icon btn-danger"
                onClick={() => removeSavingsMovement(mov.id)}
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
        {savingsMovements.length === 0 && (
          <li className="list-item text-muted">Sin movimientos de ahorro</li>
        )}
      </ul>
    </div>
  );
}
