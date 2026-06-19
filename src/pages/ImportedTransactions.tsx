import { useState } from "react";
import { Check, X, RefreshCw, Mail, CheckCheck, Trash2 } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import type { ImportedTransaction } from "../types/finance.types";
import {
  PageHeader,
  Card,
  Input,
  Tabs,
  Badge,
  Button,
  EmptyState,
  Loader,
  ListRow,
  ConfirmDialog,
} from "../components/ui";

interface DialogState {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  hideCancel?: boolean;
  action: () => Promise<void>;
}

const BANK_LABELS: Record<ImportedTransaction["bank"], string> = {
  bancolombia: "Bancolombia",
  nu: "Nu",
  nequi: "Nequi",
  siigo: "Nómina",
};

const CONFIDENCE_LABELS: Record<ImportedTransaction["confidence"], string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const CONFIDENCE_TONE: Record<
  ImportedTransaction["confidence"],
  "income" | "warning" | "expense"
> = {
  high: "income",
  medium: "warning",
  low: "expense",
};

type TabKey = "pending" | "history";

export default function ImportedTransactions() {
  const {
    importedTransactions,
    pendingImportCount,
    loading,
    confirmImported,
    confirmManyImported,
    ignoreImported,
    ignoreManyImported,
    syncGmail,
  } = useFinance();

  const [tab, setTab] = useState<TabKey>("pending");
  const [syncing, setSyncing] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
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
    setEdits((prev) => {
      const tx = importedTransactions.find((t) => t.id === id)!;
      const current =
        prev[id] ?? {
          name: tx.merchant ?? "",
          amount: tx.amount?.toString() ?? "",
        };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await syncGmail();
    } catch {
      setSyncError(
        "No se pudo sincronizar. ¿Ya conectaste Gmail en Perfil?",
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

  // Acciones masivas sobre los pendientes (vía ConfirmDialog del sistema)
  const requestConfirmAll = () => {
    const items = pending.filter((tx) => {
      const e = getEdit(tx);
      return e.name.trim() && parseFloat(e.amount) > 0;
    });
    const skipped = pending.length - items.length;
    if (items.length === 0) {
      setDialog({
        title: "Nada para confirmar",
        description:
          "Ninguna pendiente tiene nombre y monto válidos. Revisa los campos antes de aceptar.",
        confirmLabel: "Entendido",
        hideCancel: true,
        action: async () => {},
      });
      return;
    }
    setDialog({
      title: "Aceptar todas",
      description: `Se registrarán ${items.length} transacción(es) en Gastos/Ingresos${skipped > 0 ? ` (${skipped} sin monto válido se omitirán)` : ""}.`,
      confirmLabel: "Aceptar todas",
      action: () =>
        confirmManyImported(
          items.map((tx) => {
            const e = getEdit(tx);
            return { tx, name: e.name, amount: parseFloat(e.amount) };
          }),
        ),
    });
  };

  const requestIgnoreAll = () => {
    if (pending.length === 0) return;
    const items = [...pending];
    setDialog({
      title: "Rechazar todas",
      description: `Se rechazarán ${items.length} transacción(es). No se registrarán y saldrán de pendientes.`,
      confirmLabel: "Rechazar todas",
      danger: true,
      action: () => ignoreManyImported(items.map((tx) => tx.id)),
    });
  };

  const runDialog = async () => {
    if (!dialog) return;
    setBulkWorking(true);
    try {
      await dialog.action();
    } finally {
      setBulkWorking(false);
      setDialog(null);
    }
  };

  if (loading) return <Loader page label="Cargando transacciones…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Correos del banco"
        icon={<Mail size={20} />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            icon={
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            }
          >
            Sincronizar
          </Button>
        }
      />

      {syncError && (
        <Card className="border-expense/25 bg-expense/10 text-sm text-expense">
          {syncError}
        </Card>
      )}

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "pending", label: `Pendientes (${pendingImportCount})` },
          { value: "history", label: `Historial (${history.length})` },
        ]}
      />

      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted">
                {pending.length} pendiente{pending.length === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={requestConfirmAll}
                  disabled={bulkWorking}
                  icon={<CheckCheck size={16} />}
                >
                  Aceptar todos
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={requestIgnoreAll}
                  disabled={bulkWorking}
                  icon={<Trash2 size={16} />}
                >
                  Rechazar todos
                </Button>
              </div>
            </div>
          )}
          {pending.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Mail size={20} />}
                title="Nada por revisar"
                description="Las compras nuevas que lleguen a tu correo aparecerán aquí."
              />
            </Card>
          ) : (
            pending.map((tx) => {
              const edit = getEdit(tx);
              return (
                <Card key={tx.id} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Badge tone="neutral">{BANK_LABELS[tx.bank]}</Badge>
                    {tx.transaction_date && <span>{tx.transaction_date}</span>}
                    {tx.card_last4 && <span>·*{tx.card_last4}</span>}
                    <Badge tone={CONFIDENCE_TONE[tx.confidence]}>
                      Confianza {CONFIDENCE_LABELS[tx.confidence]}
                    </Badge>
                    <Badge tone={tx.direction === "income" ? "income" : "expense"}>
                      {tx.direction === "income" ? "Ingreso" : "Gasto"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={edit.name}
                      onChange={(e) => setEdit(tx.id, "name", e.target.value)}
                      placeholder="Nombre / comercio"
                      className="flex-[2] min-w-[140px]"
                    />
                    <Input
                      type="number"
                      value={edit.amount}
                      onChange={(e) => setEdit(tx.id, "amount", e.target.value)}
                      placeholder="Monto"
                      min="1"
                      step="any"
                      className="flex-1 min-w-[90px]"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(tx)}
                      disabled={workingId === tx.id || bulkWorking}
                      icon={<Check size={16} />}
                      title="Confirmar y registrar"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleIgnore(tx)}
                      disabled={workingId === tx.id || bulkWorking}
                      icon={<X size={16} />}
                      title="Ignorar"
                    />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "history" && (
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {history.map((tx) => (
              <ListRow
                key={tx.id}
                title={tx.merchant ?? tx.raw_subject}
                subtitle={`${BANK_LABELS[tx.bank]} · ${tx.transaction_date ?? ""} · ${tx.status === "confirmed" ? "Confirmada" : "Ignorada"}`}
                value={tx.amount != null ? formatCurrency(tx.amount) : "—"}
              />
            ))}
          </div>
          {history.length === 0 && (
            <EmptyState
              icon={<Mail size={20} />}
              title="Sin historial"
              description="Aquí verás las transacciones confirmadas o ignoradas."
            />
          )}
        </Card>
      )}

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        description={dialog?.description}
        confirmLabel={dialog?.confirmLabel}
        danger={dialog?.danger}
        hideCancel={dialog?.hideCancel}
        busy={bulkWorking}
        onConfirm={runDialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
