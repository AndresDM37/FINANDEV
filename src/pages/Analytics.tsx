import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Coins,
  PiggyBank,
  Flame,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import {
  formatCurrency,
  filterCurrentMonth,
  computeMonthlyVariableAverage,
  computeMonthlySavingsRate,
  computeMostExpensiveMonth,
  computeSavingsEvolution,
} from "../utils/calculations";
import { EXPENSE_CATEGORIES } from "../utils/categories";

const compactCurrency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function Analytics() {
  const { incomes, expenses, savingsMovements, summary, loading } =
    useFinance();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const antAverage = useMemo(
    () => computeMonthlyVariableAverage(expenses, 6),
    [expenses],
  );
  const savingsRate = useMemo(
    () => computeMonthlySavingsRate(incomes, savingsMovements, year, month),
    [incomes, savingsMovements, year, month],
  );
  const topMonth = useMemo(
    () => computeMostExpensiveMonth(expenses, year),
    [expenses, year],
  );
  const evolution = useMemo(
    () => computeSavingsEvolution(savingsMovements, 6),
    [savingsMovements],
  );

  const categoryBreakdown = useMemo(() => {
    const monthVariables = filterCurrentMonth(
      expenses.filter((e) => e.type === "variable"),
      year,
      month,
    );
    const totals = new Map<string, number>();
    for (const e of monthVariables) {
      const cat = e.category ?? "other";
      totals.set(cat, (totals.get(cat) ?? 0) + e.amount);
    }
    const monthTotal = monthVariables.reduce((sum, e) => sum + e.amount, 0);
    const rows = EXPENSE_CATEGORIES.filter((c) => totals.has(c.id))
      .map((c) => ({ ...c, total: totals.get(c.id)! }))
      .sort((a, b) => b.total - a.total);
    return { rows, monthTotal };
  }, [expenses, year, month]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );

  const overAverage = antAverage !== null && summary.variableSpent > antAverage;
  const maxEvolution = Math.max(...evolution.map((p) => p.cumulative), 1);
  const hasEvolutionData = evolution.some((p) => p.cumulative !== 0);
  const topMonthName = topMonth
    ? new Date(year, topMonth.month, 1).toLocaleDateString("es-CO", {
        month: "long",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0e1628] text-white font-sans pb-24">
      <div className="w-full max-w-md lg:max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-bold text-[22px] text-white tracking-wide">
              Análisis
            </h1>
            <p className="text-xs text-slate-400">Métricas personales</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/reports"
              title="Reportes"
              className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl hover:bg-emerald-500/20 transition-colors"
            >
              <FileText size={20} />
            </Link>
            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-xl">
              <BarChart3 size={20} />
            </div>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Promedio gasto hormiga */}
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-amber-500/10 p-1.5 rounded-lg">
                <Coins size={14} className="text-amber-500" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                Promedio Hormiga
              </span>
            </div>
            {antAverage !== null ? (
              <>
                <p className="text-xl font-black text-white mb-2">
                  {formatCurrency(antAverage)}
                </p>
                <span
                  className={`text-[11px] font-bold flex items-center w-fit px-1.5 py-0.5 rounded ${
                    overAverage
                      ? "text-red-400 bg-red-400/10"
                      : "text-emerald-500 bg-emerald-500/10"
                  }`}
                >
                  {overAverage ? (
                    <TrendingUp size={11} className="mr-1" />
                  ) : (
                    <TrendingDown size={11} className="mr-1" />
                  )}
                  Este mes: {formatCurrency(summary.variableSpent)}
                </span>
                <p className="text-[10px] text-slate-500 mt-2">
                  Promedio mensual (últimos 6 meses)
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Aún no hay meses anteriores con gastos
              </p>
            )}
          </div>

          {/* % real de ahorro */}
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-500/10 p-1.5 rounded-lg">
                <PiggyBank size={14} className="text-blue-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                Ahorro Real
              </span>
            </div>
            {savingsRate !== null ? (
              <>
                <p
                  className={`text-xl font-black mb-2 ${
                    savingsRate >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {savingsRate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-slate-500">
                  De tus ingresos de este mes
                  {savingsRate < 0 ? " (retiros netos)" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                Sin ingresos registrados este mes
              </p>
            )}
          </div>

          {/* Mes más costoso */}
          <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-5 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-red-500/10 p-1.5 rounded-lg">
                <Flame size={14} className="text-red-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                Mes Más Costoso
              </span>
            </div>
            {topMonth && topMonthName ? (
              <>
                <p className="text-xl font-black text-white capitalize mb-2">
                  {topMonthName}
                </p>
                <p className="text-sm font-bold text-red-400">
                  {formatCurrency(topMonth.total)}
                </p>
                <p className="text-[10px] text-slate-500 mt-2">
                  Gastos variables · {year}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-500">Sin gastos este año</p>
            )}
          </div>
        </div>

        {/* Evolución del ahorro */}
        <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-5 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-[15px] text-white">
              Evolución del Ahorro
            </h3>
            <span className="text-xs font-bold text-emerald-500">
              {formatCurrency(summary.savingsAccumulated)} acumulado
            </span>
          </div>
          {hasEvolutionData ? (
            <div className="flex items-end justify-between gap-2 h-40">
              {evolution.map((p, idx) => {
                const isCurrent = idx === evolution.length - 1;
                const heightPct = Math.max(
                  0,
                  (p.cumulative / maxEvolution) * 100,
                );
                return (
                  <div
                    key={`${p.year}-${p.month}`}
                    className="flex-1 h-full flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`text-[10px] font-semibold ${
                        p.cumulative < 0 ? "text-red-400" : "text-slate-400"
                      }`}
                    >
                      {compactCurrency.format(p.cumulative)}
                    </span>
                    <div className="w-full max-w-10 flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-lg ${
                          isCurrent
                            ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                            : "bg-gradient-to-t from-emerald-600/40 to-emerald-400/40"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 capitalize">
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Aún no tienes movimientos de ahorro.
            </p>
          )}
        </div>

        {/* Gastos por categoría del mes */}
        <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-[15px] text-white">
              Gastos por Categoría
            </h3>
            <span className="text-xs text-slate-400">este mes</span>
          </div>
          {categoryBreakdown.rows.length > 0 ? (
            <div className="space-y-4">
              {categoryBreakdown.rows.map((c) => {
                const CatIcon = c.icon;
                const pct =
                  categoryBreakdown.monthTotal > 0
                    ? (c.total / categoryBreakdown.monthTotal) * 100
                    : 0;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                      <CatIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-200">
                          {c.label}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Sin gastos variables este mes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
