import { useMemo, useState } from "react";
import { FileText, Download, Printer, Search } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import { downloadCsv, csvNumber } from "../utils/exportCsv";
import { EXPENSE_CATEGORIES, getCategoryDef } from "../utils/categories";
import {
  PageHeader,
  Card,
  Input,
  Select,
  Button,
  EmptyState,
  Loader,
  cn,
} from "../components/ui";
import type {
  Income,
  Expense,
  SavingsMovement,
  ExpenseCategory,
} from "../types/finance.types";

type PeriodPreset =
  | "today"
  | "week"
  | "month"
  | "prevMonth"
  | "year"
  | "custom";

type RowKind = "income" | "fixed" | "variable" | "saving";
type KindFilter = "all" | RowKind;

interface ReportRow {
  id: string;
  kind: RowKind;
  concept: string;
  category: ExpenseCategory | null;
  amount: number; // con signo: ingresos +, gastos -, ahorro ± como viene
  effectiveDate: string; // YYYY-MM-DD
  registeredAt: string; // created_at ISO
}

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "prevMonth", label: "Mes anterior" },
  { id: "year", label: "Año" },
  { id: "custom", label: "Personalizado" },
];

const KIND_META: Record<
  RowKind,
  { label: string; badge: string }
> = {
  income: {
    label: "Ingreso",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  fixed: {
    label: "Gasto fijo",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  variable: {
    label: "Gasto variable",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  saving: {
    label: "Ahorro",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

/** YYYY-MM-DD en hora local (evita el corrimiento de día de toISOString en UTC-5). */
function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolveRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "today": {
      const t = toLocalISODate(now);
      return { from: t, to: t };
    }
    case "week": {
      const dow = (now.getDay() + 6) % 7; // lunes = 0
      const monday = new Date(y, m, now.getDate() - dow);
      const sunday = new Date(y, m, now.getDate() - dow + 6);
      return { from: toLocalISODate(monday), to: toLocalISODate(sunday) };
    }
    case "month":
      return {
        from: toLocalISODate(new Date(y, m, 1)),
        to: toLocalISODate(new Date(y, m + 1, 0)),
      };
    case "prevMonth":
      return {
        from: toLocalISODate(new Date(y, m - 1, 1)),
        to: toLocalISODate(new Date(y, m, 0)),
      };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "custom":
      return {
        from: customFrom || "0000-01-01",
        to: customTo || "9999-12-31",
      };
  }
}

function buildReportRows(
  incomes: Income[],
  expenses: Expense[],
  movements: SavingsMovement[],
): ReportRow[] {
  return [
    ...incomes.map<ReportRow>((i) => ({
      id: i.id,
      kind: "income",
      concept: i.source,
      category: null,
      amount: i.amount,
      effectiveDate: i.received_at,
      registeredAt: i.created_at,
    })),
    ...expenses.map<ReportRow>((e) => ({
      id: e.id,
      kind: e.type === "fixed" ? "fixed" : "variable",
      concept: e.name,
      category: e.type === "variable" ? (e.category ?? "other") : null,
      amount: -e.amount,
      effectiveDate: e.expense_date ?? toLocalISODate(new Date(e.created_at)),
      registeredAt: e.created_at,
    })),
    ...movements.map<ReportRow>((s) => ({
      id: s.id,
      kind: "saving",
      concept: s.note || (s.type === "withdraw" ? "Retiro" : "Ahorro"),
      category: null,
      amount: s.amount,
      effectiveDate: toLocalISODate(new Date(s.created_at)),
      registeredAt: s.created_at,
    })),
  ];
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Reports() {
  const { incomes, expenses, savingsMovements, loading } = useFinance();

  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [category, setCategory] = useState<ExpenseCategory | "all">("all");
  const [search, setSearch] = useState("");

  const allRows = useMemo(
    () => buildReportRows(incomes, expenses, savingsMovements),
    [incomes, expenses, savingsMovements],
  );

  const range = useMemo(
    () => resolveRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const filtered = useMemo(
    () =>
      allRows
        .filter(
          (r) =>
            r.effectiveDate >= range.from &&
            r.effectiveDate <= range.to &&
            (kind === "all" || r.kind === kind) &&
            (category === "all" || r.category === category) &&
            (!search ||
              r.concept.toLowerCase().includes(search.toLowerCase())),
        )
        .sort(
          (a, b) =>
            b.effectiveDate.localeCompare(a.effectiveDate) ||
            b.registeredAt.localeCompare(a.registeredAt),
        ),
    [allRows, range, kind, category, search],
  );

  const totals = useMemo(() => {
    let income = 0;
    let spent = 0;
    let netSavings = 0;
    for (const r of filtered) {
      if (r.kind === "income") income += r.amount;
      else if (r.kind === "saving") netSavings += r.amount;
      else spent += -r.amount;
    }
    return { income, spent, netSavings, balance: income - spent - netSavings };
  }, [filtered]);

  const showCategoryFilter = kind === "all" || kind === "variable";

  const handleExportCsv = () => {
    const rows: (string | number)[][] = [
      ["Fecha", "Hora registro", "Tipo", "Concepto", "Categoría", "Monto"],
      ...filtered.map((r) => [
        r.effectiveDate,
        fmtTime(r.registeredAt),
        KIND_META[r.kind].label,
        r.concept,
        r.category ? getCategoryDef(r.category).label : "",
        csvNumber(r.amount),
      ]),
      [],
      ["Total ingresos", "", "", "", "", csvNumber(totals.income)],
      ["Total gastos", "", "", "", "", csvNumber(-totals.spent)],
      ["Ahorro neto", "", "", "", "", csvNumber(totals.netSavings)],
      ["Balance", "", "", "", "", csvNumber(totals.balance)],
    ];
    downloadCsv(`reporte_${range.from}_${range.to}.csv`, rows);
  };

  if (loading) return <Loader page label="Generando reporte…" />;

  const rangeLabel = `${range.from === "0000-01-01" ? "inicio" : range.from} → ${range.to === "9999-12-31" ? "hoy" : range.to}`;

  return (
    <div className="space-y-6 print:text-black">
      {/* Header (pantalla) */}
      <div className="print:hidden">
        <PageHeader
          title="Reportes"
          subtitle={rangeLabel}
          icon={<FileText size={20} />}
          actions={
            <>
              <Button
                size="sm"
                onClick={handleExportCsv}
                disabled={filtered.length === 0}
                icon={<Download size={15} />}
              >
                CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.print()}
                disabled={filtered.length === 0}
                icon={<Printer size={15} />}
              >
                Imprimir
              </Button>
            </>
          }
        />
      </div>

      {/* Encabezado solo-impresión */}
      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Reporte FinanDev</h1>
        <p className="text-sm text-gray-600">
          Periodo {rangeLabel} · generado el{" "}
          {new Date().toLocaleString("es-CO")}
        </p>
      </div>

      {/* Filtros */}
      <Card className="space-y-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                preset === p.id
                  ? "bg-accent text-ground border-accent"
                  : "bg-surface-2 text-muted border-line hover:text-ink",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="flex flex-wrap gap-3">
            <Input
              type="date"
              label="Desde"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <Input
              type="date"
              label="Hasta"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            value={kind}
            onChange={(e) => {
              const k = e.target.value as KindFilter;
              setKind(k);
              if (k !== "all" && k !== "variable") setCategory("all");
            }}
            className="sm:w-52"
          >
            <option value="all">Todos los movimientos</option>
            <option value="income">Ingresos</option>
            <option value="fixed">Gastos fijos</option>
            <option value="variable">Gastos variables</option>
            <option value="saving">Ahorros</option>
          </Select>

          {showCategoryFilter && (
            <Select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ExpenseCategory | "all")
              }
              className="sm:w-48"
            >
              <option value="all">Todas las categorías</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          )}

          <Input
            icon={<Search size={16} />}
            placeholder="Buscar por concepto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>
      </Card>

      {/* Resumen del periodo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Ingresos", value: formatCurrency(totals.income), cls: "text-income" },
          { label: "Gastos", value: `-${formatCurrency(totals.spent)}`, cls: "text-expense" },
          { label: "Ahorro neto", value: formatCurrency(totals.netSavings), cls: "text-info" },
          { label: "Balance", value: formatCurrency(totals.balance), cls: "text-ink print:text-black" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-surface p-4 print:bg-white print:border-gray-300 print:rounded-none"
          >
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted print:text-gray-600">
              {s.label}
            </p>
            <p className={cn("text-lg font-bold nums", s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla de movimientos */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface print:bg-white print:border-gray-300 print:rounded-none print:overflow-visible">
        {filtered.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted print:text-gray-600 print:border-gray-300">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Hora reg.</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Concepto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line print:divide-gray-200">
              {filtered.map((r) => (
                <tr
                  key={`${r.kind}-${r.id}`}
                  className="hover:bg-surface-2/40 transition-colors print:hover:bg-transparent"
                >
                  <td className="px-4 py-3 text-muted whitespace-nowrap print:text-black">
                    {r.effectiveDate}
                  </td>
                  <td className="px-4 py-3 text-faint whitespace-nowrap print:text-gray-600">
                    {fmtTime(r.registeredAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        KIND_META[r.kind].badge,
                      )}
                    >
                      {KIND_META[r.kind].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold print:text-black">
                    {r.concept}
                  </td>
                  <td className="px-4 py-3 text-muted print:text-gray-600">
                    {r.category ? getCategoryDef(r.category).label : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-bold nums whitespace-nowrap",
                      r.amount >= 0 ? "text-income" : "text-expense",
                    )}
                  >
                    {r.amount >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(r.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={<FileText size={20} />}
            title="Sin movimientos"
            description="No hay movimientos en este periodo con los filtros actuales."
          />
        )}
      </div>

      {/* Pie */}
      <div className="flex justify-between items-start gap-4 text-xs text-faint print:text-gray-600">
        <span>{filtered.length} movimientos</span>
        <span className="text-right max-w-xs">
          Nota: los gastos fijos recurrentes aparecen una sola vez, en su fecha
          de registro.
        </span>
      </div>
    </div>
  );
}
