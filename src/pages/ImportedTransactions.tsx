import { useState } from "react";
import { Check, X, RefreshCw, Mail } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import type { ImportedTransaction } from "../types/finance.types";

const BANK_LABELS: Record<ImportedTransaction["bank"], string> = {
  bancolombia: "Bancolombia",
  nu: "Nu",
  nequi: "Nequi",
};

const CONFIDENCE_LABELS: Record<ImportedTransaction["confidence"], string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

type Tab = "pending" | "history";

export default function ImportedTransactions() {
  const {
    importedTransactions,
    pendingImportCount,
    loading,
    confirmImported,
    ignoreImported,
    syncGmail,
  } = useFinance();

  const [tab, setTab] = useState<Tab>("pending");
  const [syncing, setSyncing] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { name: string; amount: string }>
  >({});
  const [syncError, setSyncError] = useState<string | null>(null);

  const pending = importedTransactions.filter((t) => t.status === "pending");
  const history = importedTransactions.filter((t) => t.status !== "pending");

  const getEdit = (tx: ImportedTransaction) =>
    edits[tx.id] ?? {
      name: tx.merchant ?? "",
      amount: tx.amount?.toString() ?? "",
    };

  const setEdit = (id: string, field: "name" | "amount", value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...getEditById(id), [field]: value },
    }));

    function getEditById(txId: string) {
      const tx = importedTransactions.find((t) => t.id === txId)!;
      return (
        edits[txId] ?? {
          name: tx.merchant ?? "",
          amount: tx.amount?.toString() ?? "",
        }
      );
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await syncGmail();
    } catch {
      setSyncError(
        "No se pudo sincronizar. ¿Ya conectaste Gmail en Configuración?",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleConfirm = async (tx: ImportedTransaction) => {
    const edit = getEdit(tx);
    const amount = parseFloat(edit.amount);
    if (!edit.name || !amount || amount <= 0) return;
    setWorkingId(tx.id);
    try {
      await confirmImported(tx, { name: edit.name, amount });
    } finally {
      setWorkingId(null);
    }
  };

  const handleIgnore = async (tx: ImportedTransaction) => {
    setWorkingId(tx.id);
    try {
      await ignoreImported(tx.id);
    } finally {
      setWorkingId(null);
    }
  };

  if (loading)
    return <div className="page-loader">Cargando transacciones...</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 className="page-title">Correos del banco</h1>
        <button onClick={handleSync} disabled={syncing} className="btn-icon" title="Sincronizar ahora">
          <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
        </button>
      </div>

      {syncError && <p style={{ color: "#f87171", fontSize: 13 }}>{syncError}</p>}

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button
          onClick={() => setTab("pending")}
          style={{
            fontWeight: tab === "pending" ? 700 : 400,
            opacity: tab === "pending" ? 1 : 0.6,
          }}
        >
          Pendientes ({pendingImportCount})
        </button>
        <button
          onClick={() => setTab("history")}
          style={{
            fontWeight: tab === "history" ? 700 : 400,
            opacity: tab === "history" ? 1 : 0.6,
          }}
        >
          Historial ({history.length})
        </button>
      </div>

      {tab === "pending" && (
        <section className="section">
          {pending.length === 0 && (
            <p style={{ opacity: 0.7, fontSize: 14 }}>
              <Mail size={14} style={{ verticalAlign: "middle" }} /> No hay
              transacciones por revisar. Las compras nuevas que lleguen a tu
              correo aparecerán aquí.
            </p>
          )}
          <ul className="list">
            {pending.map((tx) => {
              const edit = getEdit(tx);
              return (
                <li key={tx.id} className="list-item" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: "1 1 100%", display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.8 }}>
                    <span>{BANK_LABELS[tx.bank]}</span>
                    <span>{tx.transaction_date ?? ""}</span>
                    {tx.card_last4 && <span>*{tx.card_last4}</span>}
                    <span title={`Confianza del parser: ${tx.parser}`}>
                      Confianza: {CONFIDENCE_LABELS[tx.confidence]}
                    </span>
                    <span style={{ fontWeight: 600, color: tx.direction === "income" ? "#34d399" : "#f87171" }}>
                      {tx.direction === "income" ? "Ingreso" : "Gasto"}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={edit.name}
                    onChange={(e) => setEdit(tx.id, "name", e.target.value)}
                    placeholder="Nombre / comercio"
                    style={{ flex: "2 1 140px" }}
                  />
                  <input
                    type="number"
                    value={edit.amount}
                    onChange={(e) => setEdit(tx.id, "amount", e.target.value)}
                    placeholder="Monto"
                    min="1"
                    step="any"
                    style={{ flex: "1 1 90px" }}
                  />
                  <button
                    className="btn-icon"
                    onClick={() => handleConfirm(tx)}
                    disabled={workingId === tx.id}
                    title="Confirmar y registrar"
                    style={{ color: "#34d399" }}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleIgnore(tx)}
                    disabled={workingId === tx.id}
                    title="Ignorar"
                    style={{ color: "#f87171" }}
                  >
                    <X size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "history" && (
        <section className="section">
          {history.length === 0 && (
            <p style={{ opacity: 0.7, fontSize: 14 }}>Aún no hay historial.</p>
          )}
          <ul className="list">
            {history.map((tx) => (
              <li key={tx.id} className="list-item">
                <div>
                  <strong>{tx.merchant ?? tx.raw_subject}</strong>
                  <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
                    {BANK_LABELS[tx.bank]} · {tx.transaction_date ?? ""} ·{" "}
                    {tx.status === "confirmed" ? "Confirmada" : "Ignorada"}
                  </p>
                </div>
                <span style={{ fontWeight: 600 }}>
                  {tx.amount != null ? formatCurrency(tx.amount) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
