import { useMemo, useState } from "react";
import { FileText, Download, Printer, Search } from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { formatCurrency } from "../utils/calculations";
import { downloadCsv, csvNumber } from "../utils/exportCsv";
import { EXPENSE_CATEGORIES, getCategoryDef } from "../utils/categories";
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

  if (loading)
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0e1628] text-white font-sans pb-24 print:bg-white print:text-black print:pb-0">
      <div className="w-full max-w-md lg:max-w-5xl mx-auto p-5 lg:p-8 print:max-w-none print:p-0">
        {/* Header (pantalla) */}
        <header className="flex justify-between items-center mb-6 print:hidden">
          <div>
            <h1 className="font-bold text-[22px] text-white tracking-wide">
              Reportes
            </h1>
            <p className="text-xs text-slate-400">
              {range.from === "0000-01-01" ? "inicio" : range.from} →{" "}
              {range.to === "9999-12-31" ? "hoy" : range.to}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm px-4 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
            >
              <Download size={15} /> CSV
            </button>
            <button
              onClick={() => window.print()}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 bg-[#1e293b]/50 text-slate-300 border border-slate-700/50 font-bold text-sm px-4 py-2 rounded-xl hover:bg-[#1e293b] transition-colors disabled:opacity-40"
            >
              <Printer size={15} /> Imprimir
            </button>
          </div>
        </header>

        {/* Encabezado solo-impresión */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Reporte FinanDev</h1>
          <p className="text-sm text-gray-600">
            Periodo {range.from === "0000-01-01" ? "inicio" : range.from} a{" "}
            {range.to === "9999-12-31" ? "hoy" : range.to} · generado el{" "}
            {new Date().toLocaleString("es-CO")}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-[#141b2e] border border-slate-800/80 p-4 rounded-2xl mb-6 space-y-4 print:hidden">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                  preset === p.id
                    ? "bg-emerald-500 text-[#0a101f] border-emerald-500"
                    : "bg-[#1e293b]/50 text-slate-400 border-slate-700/50 hover:text-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-slate-400 flex items-center gap-2">
                Desde
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-[#1e293b]/50 border border-slate-700/50 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-emerald-500/50 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                />
              </label>
              <label className="text-xs text-slate-400 flex items-center gap-2">
                Hasta
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-[#1e293b]/50 border border-slate-700/50 text-white px-3 py-2 rounded-xl text-sm outline-none focus:border-emerald-500/50 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                />
              </label>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={kind}
              onChange={(e) => {
                const k = e.target.value as KindFilter;
                setKind(k);
                if (k !== "all" && k !== "variable") setCategory("all");
              }}
              className="bg-[#1e293b]/50 border border-slate-700/50 text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50"
            >
              <option value="all">Todos los movimientos</option>
              <option value="income">Ingresos</option>
              <option value="fixed">Gastos fijos</option>
              <option value="variable">Gastos variables</option>
              <option value="saving">Ahorros</option>
            </select>

            {showCategoryFilter && (
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ExpenseCategory | "all")
                }
                className="bg-[#1e293b]/50 border border-slate-700/50 text-white px-3 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50"
              >
                <option value="all">Todas las categorías</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}

            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar por concepto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1e293b]/50 border border-slate-700/50 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:border-emerald-500/50 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Resumen del periodo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 print:bg-white print:border-gray-300 print:rounded-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-gray-600">
              Ingresos
            </p>
            <p className="text-lg font-black text-emerald-400">
              {formatCurrency(totals.income)}
            </p>
          </div>
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 print:bg-white print:border-gray-300 print:rounded-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-gray-600">
              Gastos
            </p>
            <p className="text-lg font-black text-red-400">
              -{formatCurrency(totals.spent)}
            </p>
          </div>
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 print:bg-white print:border-gray-300 print:rounded-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-gray-600">
              Ahorro Neto
            </p>
            <p className="text-lg font-black text-blue-400">
              {formatCurrency(totals.netSavings)}
            </p>
          </div>
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 print:bg-white print:border-gray-300 print:rounded-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 print:text-gray-600">
              Balance
            </p>
            <p className="text-lg font-black text-white print:text-black">
              {formatCurrency(totals.balance)}
            </p>
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl overflow-x-auto print:bg-white print:border-gray-300 print:rounded-none print:overflow-visible">
          {filtered.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800/80 print:text-gray-600 print:border-gray-300">
                  <th className="px-4 py-3 font-bold">Fecha</th>
                  <th className="px-4 py-3 font-bold">Hora reg.</th>
                  <th className="px-4 py-3 font-bold">Tipo</th>
                  <th className="px-4 py-3 font-bold">Concepto</th>
                  <th className="px-4 py-3 font-bold">Categoría</th>
                  <th className="px-4 py-3 font-bold text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {filtered.map((r) => (
                  <tr
                    key={`${r.kind}-${r.id}`}
                    className="hover:bg-[#1e293b]/40 transition-colors print:hover:bg-transparent"
                  >
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap print:text-black">
                      {r.effectiveDate}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap print:text-gray-600">
                      {fmtTime(r.registeredAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${KIND_META[r.kind].badge}`}
                      >
                        {KIND_META[r.kind].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-100 print:text-black">
                      {r.concept}
                    </td>
                    <td className="px-4 py-3 text-slate-400 print:text-gray-600">
                      {r.category ? getCategoryDef(r.category).label : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${
                        r.amount >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {r.amount >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(r.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
              <FileText size={32} className="opacity-20" />
              <p className="text-sm font-medium">
                No hay movimientos en este periodo con los filtros actuales.
              </p>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex justify-between items-start gap-4 mt-3 text-[11px] text-slate-500 print:text-gray-600">
          <span>{filtered.length} movimientos</span>
          <span className="text-right max-w-xs">
            Nota: los gastos fijos recurrentes aparecen una sola vez, en su
            fecha de registro.
          </span>
        </div>
      </div>
    </div>
  );
}
