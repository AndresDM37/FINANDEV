import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";

export default function Incomes() {
  const { incomes, loading, addIncome, removeIncome } = useFinance();

  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [receivedAt, setReceivedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);

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

  if (loading) return <div className="page-loader">Cargando ingresos...</div>;

  return (
    <div className="page">
      <h1 className="page-title">Ingresos</h1>

      <form onSubmit={handleAdd} className="form-inline">
        <input
          type="text"
          placeholder="Fuente (ej: Sueldo)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
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
        <input
          type="date"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          <Plus size={16} /> Agregar
        </button>
      </form>

      <ul className="list">
        {incomes.map((inc) => (
          <li key={inc.id} className="list-item">
            <div>
              <strong>{inc.source}</strong>
              <span className="text-muted"> — {inc.received_at}</span>
            </div>
            <div className="list-item__actions">
              <span className="text-income">{formatCurrency(inc.amount)}</span>
              <button
                className="btn-icon btn-danger"
                onClick={() => removeIncome(inc.id)}
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
        {incomes.length === 0 && (
          <li className="list-item text-muted">Sin ingresos registrados</li>
        )}
      </ul>
    </div>
  );
}
