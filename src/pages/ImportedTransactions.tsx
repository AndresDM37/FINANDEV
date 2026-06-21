import { useState } from "react";
import {
  Check,
  X,
  RefreshCw,
  Mail,
  Inbox,
  CheckCheck,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import { cn } from "../components/ui/cn";
import type { ImportedTransaction } from "../types/finance.types";
import {
  PageHeader,
  Card,
  StatCard,
  Textarea,
  AmountInput,
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

// Ajusta el alto de la textarea a su contenido para mostrar el nombre completo
// sin recortes ni scroll horizontal. Estable a nivel de módulo para que React
// no la recree en cada render.
function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

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

  // Monto válido (en edición) de una transacción pendiente, o 0 si aún no sirve.
  const validAmount = (tx: ImportedTransaction) => {
    const v = parseFloat(getEdit(tx).amount);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  const isReady = (tx: ImportedTransaction) =>
    getEdit(tx).name.trim().length > 0 && validAmount(tx) > 0;

  const pendingExpense = pending
    .filter((t) => t.direction === "expense")
    .reduce((sum, t) => sum + validAmount(t), 0);
  const pendingIncome = pending
    .filter((t) => t.direction === "income")
    .reduce((sum, t) => sum + validAmount(t), 0);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await syncGmail();
    } catch {
      setSyncError(
        "No pudimos leer tu correo. Conecta Gmail desde Perfil y vuelve a sincronizar.",
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
    const items = pending.filter((tx) => isReady(tx));
    const skipped = pending.length - items.length;
    if (items.length === 0) {
      setDialog({
        title: "Nada para registrar",
        description:
          "Ninguna pendiente tiene comercio y monto válidos. Completa los campos y vuelve a intentarlo.",
        confirmLabel: "Entendido",
        hideCancel: true,
        action: async () => {},
      });
      return;
    }
    setDialog({
      title: "Registrar todas",
      description: `Se registrarán ${items.length} transacción(es) en Gastos/Ingresos${skipped > 0 ? ` (${skipped} sin monto válido se omitirán)` : ""}.`,
      confirmLabel: "Registrar todas",
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
      title: "Descartar todas",
      description: `Se descartarán ${items.length} transacción(es). No se registrarán y saldrán de pendientes.`,
      confirmLabel: "Descartar todas",
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
        subtitle="Aprueba o descarta lo que llega de tu banco"
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
        <div className="space-y-4">
          {pending.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Inbox size={20} />}
                title="Todo al día"
                description="Las compras y pagos nuevos que lleguen a tu correo aparecerán aquí para que los revises."
              />
            </Card>
          ) : (
            <>
              {/* Resumen del dinero por revisar */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard
                  label="Por revisar"
                  value={pending.length}
                  icon={<Inbox size={18} />}
                />
                <StatCard
                  label="Gastos"
                  tone="expense"
                  value={formatCurrency(pendingExpense)}
                  icon={<ArrowUpRight size={18} />}
                />
                {pendingIncome > 0 && (
                  <StatCard
                    label="Ingresos"
                    tone="income"
                    value={formatCurrency(pendingIncome)}
                    icon={<ArrowDownLeft size={18} />}
                  />
                )}
              </div>

              {/* Acciones masivas */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestConfirmAll}
                  disabled={bulkWorking}
                  icon={<CheckCheck size={16} />}
                >
                  Registrar todas
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={requestIgnoreAll}
                  disabled={bulkWorking}
                  icon={<Trash2 size={16} />}
                >
                  Descartar todas
                </Button>
              </div>

              {/* Recibos por aprobar */}
              <div className="space-y-3">
                {pending.map((tx) => {
                  const edit = getEdit(tx);
                  const isIncome = tx.direction === "income";
                  const amount = validAmount(tx);
                  const busy = workingId === tx.id;
                  return (
                    <Card
                      key={tx.id}
                      className={cn(
                        "space-y-4 border-l-2",
                        isIncome ? "border-l-income" : "border-l-expense",
                      )}
                    >
                      {/* Metadata callada */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone="neutral">{BANK_LABELS[tx.bank]}</Badge>
                        {tx.transaction_date && (
                          <span>{tx.transaction_date}</span>
                        )}
                        {tx.card_last4 && <span>·*{tx.card_last4}</span>}
                        {tx.confidence !== "high" && (
                          <Badge tone={CONFIDENCE_TONE[tx.confidence]}>
                            Confianza {CONFIDENCE_LABELS[tx.confidence]}
                          </Badge>
                        )}
                      </div>

                      {/* Monto como protagonista */}
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            isIncome ? "text-income" : "text-expense",
                          )}
                        >
                          {isIncome ? (
                            <ArrowDownLeft size={14} />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}
                          {isIncome ? "Ingreso" : "Gasto"}
                        </span>
                        <span
                          className={cn(
                            "text-2xl font-bold nums leading-none",
                            amount === 0
                              ? "text-faint"
                              : isIncome
                                ? "text-income"
                                : "text-expense",
                          )}
                        >
                          {amount === 0
                            ? "—"
                            : `${isIncome ? "+" : "−"} ${formatCurrency(amount)}`}
                        </span>
                      </div>

                      {/* Edición */}
                      <div className="space-y-2">
                        <Textarea
                          ref={autoSize}
                          label="Comercio"
                          rows={1}
                          value={edit.name}
                          onChange={(e) => {
                            setEdit(tx.id, "name", e.target.value);
                            autoSize(e.target);
                          }}
                          placeholder="Nombre del comercio"
                          className="overflow-hidden leading-snug"
                        />
                        <AmountInput
                          label="Monto"
                          value={edit.amount}
                          onChange={(raw) => setEdit(tx.id, "amount", raw)}
                          placeholder="0"
                          className="sm:max-w-[12rem]"
                        />
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(tx)}
                          disabled={!isReady(tx) || bulkWorking || busy}
                          loading={busy}
                          icon={<Check size={16} />}
                          fullWidth
                          className="sm:flex-1"
                        >
                          Registrar {isIncome ? "ingreso" : "gasto"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleIgnore(tx)}
                          disabled={bulkWorking || busy}
                          icon={<X size={16} />}
                        >
                          Descartar
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {history.map((tx) => {
              const confirmed = tx.status === "confirmed";
              const isIncome = tx.direction === "income";
              return (
                <ListRow
                  key={tx.id}
                  icon={
                    confirmed ? (
                      <Check size={16} className="text-income" />
                    ) : (
                      <X size={16} className="text-faint" />
                    )
                  }
                  title={tx.merchant ?? tx.raw_subject}
                  subtitle={`${BANK_LABELS[tx.bank]} · ${tx.transaction_date ?? ""} · ${confirmed ? "Registrada" : "Descartada"}`}
                  value={
                    tx.amount == null ? (
                      "—"
                    ) : (
                      <span
                        className={cn(
                          !confirmed
                            ? "text-muted"
                            : isIncome
                              ? "text-income"
                              : "text-expense",
                        )}
                      >
                        {confirmed ? (isIncome ? "+" : "−") + " " : ""}
                        {formatCurrency(tx.amount)}
                      </span>
                    )
                  }
                />
              );
            })}
          </div>
          {history.length === 0 && (
            <EmptyState
              icon={<Mail size={20} />}
              title="Sin historial"
              description="Aquí verás las transacciones que registres o descartes."
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
