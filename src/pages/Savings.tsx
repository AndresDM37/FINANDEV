import { useState, type FormEvent } from "react";
import {
  Plus,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Bot,
  Hand,
  Landmark,
  PiggyBank,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import type { SavingsMovementType } from "../types/finance.types";
import {
  PageHeader,
  Card,
  Input,
  SegmentedControl,
  Button,
  ListRow,
  EmptyState,
  Loader,
} from "../components/ui";

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

  if (loading) return <Loader page label="Cargando ahorros…" />;

  return (
    <div className="space-y-8">
      <PageHeader title="Ahorros" icon={<PiggyBank size={20} />} />

      {/* Acumulado */}
      <Card variant="accent" className="relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-info/15 blur-3xl" />
        <div className="relative">
          <span className="text-xs font-semibold uppercase tracking-wide text-info">
            Total acumulado
          </span>
          <p className="mt-2 text-4xl font-bold nums text-info">
            {formatCurrency(summary.savingsAccumulated)}
          </p>
        </div>
      </Card>

      {/* Registrar movimiento */}
      <Card className="space-y-4">
        <SegmentedControl<SavingsMovementType>
          value={type}
          onChange={setType}
          segments={[
            { value: "manual", label: "Ahorro manual" },
            { value: "withdraw", label: "Retiro" },
          ]}
        />
        <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="any"
            required
          />
          <Input
            placeholder="Nota (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            type="submit"
            loading={submitting}
            icon={<Plus size={16} />}
            fullWidth
            className="sm:col-span-2"
          >
            Registrar movimiento
          </Button>
        </form>
      </Card>

      {/* Movimientos */}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Movimientos</h2>
        <Card className="divide-y divide-line" padded={false}>
          <div className="px-4 sm:px-5">
            {savingsMovements.map((mov) => (
              <ListRow
                key={mov.id}
                icon={
                  mov.amount >= 0 ? (
                    <ArrowDownCircle size={18} className="text-income" />
                  ) : (
                    <ArrowUpCircle size={18} className="text-expense" />
                  )
                }
                title={mov.note || (mov.type === "withdraw" ? "Retiro" : "Ahorro")}
                subtitle={
                  <span className="inline-flex items-center gap-1">
                    {mov.type === "auto" ? (
                      <>
                        <Bot size={12} /> Automático
                      </>
                    ) : mov.type === "manual" ? (
                      <>
                        <Hand size={12} /> Manual
                      </>
                    ) : (
                      <>
                        <Landmark size={12} /> Retiro
                      </>
                    )}
                  </span>
                }
                value={
                  <span className={mov.amount >= 0 ? "text-income" : "text-expense"}>
                    {mov.amount >= 0 ? "+" : ""}
                    {formatCurrency(mov.amount)}
                  </span>
                }
                actions={
                  <button
                    onClick={() => removeSavingsMovement(mov.id)}
                    className="p-1.5 text-faint hover:text-expense transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                }
              />
            ))}
          </div>
          {savingsMovements.length === 0 && (
            <EmptyState
              icon={<PiggyBank size={20} />}
              title="Sin movimientos"
              description="Registra tu primer ahorro arriba."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
