import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  PageHeader,
  StatCard,
  Card,
  Button,
  Badge,
  EmptyState,
  Loader,
  cn,
} from "../components/ui";

const compactCurrency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function Analytics() {
  const { incomes, expenses, savingsMovements, summary, loading } =
    useFinance();
  const navigate = useNavigate();

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

  if (loading) return <Loader page label="Calculando métricas…" />;

  const overAverage = antAverage !== null && summary.variableSpent > antAverage;
  const maxEvolution = Math.max(...evolution.map((p) => p.cumulative), 1);
  const hasEvolutionData = evolution.some((p) => p.cumulative !== 0);
  const topMonthName = topMonth
    ? new Date(year, topMonth.month, 1).toLocaleDateString("es-CO", {
        month: "long",
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análisis"
        subtitle="Métricas personales"
        icon={<BarChart3 size={20} />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText size={16} />}
            onClick={() => navigate("/reports")}
          >
            Reportes
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Promedio hormiga"
          icon={<Coins size={16} />}
          value={antAverage !== null ? formatCurrency(antAverage) : "—"}
          hint={
            antAverage !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overAverage ? "text-expense" : "text-income",
                )}
              >
                {overAverage ? (
                  <TrendingUp size={11} />
                ) : (
                  <TrendingDown size={11} />
                )}
                Este mes: {formatCurrency(summary.variableSpent)}
              </span>
            ) : (
              "Sin meses previos con gastos"
            )
          }
        />
        <StatCard
          label="Ahorro real"
          icon={<PiggyBank size={16} />}
          tone={savingsRate !== null && savingsRate < 0 ? "expense" : "income"}
          value={savingsRate !== null ? `${savingsRate.toFixed(1)}%` : "—"}
          hint={
            savingsRate !== null
              ? `De tus ingresos de este mes${savingsRate < 0 ? " (retiros netos)" : ""}`
              : "Sin ingresos este mes"
          }
        />
        <StatCard
          label="Mes más costoso"
          icon={<Flame size={16} />}
          tone="expense"
          className="col-span-2 lg:col-span-1"
          value={
            topMonth && topMonthName ? (
              <span className="capitalize">{topMonthName}</span>
            ) : (
              "—"
            )
          }
          hint={
            topMonth
              ? `${formatCurrency(topMonth.total)} · gastos variables ${year}`
              : "Sin gastos este año"
          }
        />
      </div>

      {/* Evolución del ahorro */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Evolución del ahorro</h2>
          <Badge tone="accent">
            {formatCurrency(summary.savingsAccumulated)} acumulado
          </Badge>
        </div>
        <Card>
          {hasEvolutionData ? (
            <div className="flex items-end justify-between gap-2 h-44">
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
                      className={cn(
                        "text-[10px] font-semibold nums",
                        p.cumulative < 0 ? "text-expense" : "text-muted",
                      )}
                    >
                      {compactCurrency.format(p.cumulative)}
                    </span>
                    <div className="w-full max-w-10 flex-1 flex items-end">
                      <div
                        className={cn(
                          "w-full rounded-t-lg transition-all",
                          isCurrent
                            ? "bg-gradient-to-t from-accent to-accent-bright"
                            : "bg-gradient-to-t from-accent/30 to-accent-bright/30",
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-faint capitalize">
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<PiggyBank size={20} />}
              title="Sin datos de ahorro"
              description="Tus movimientos de ahorro construirán esta gráfica."
            />
          )}
        </Card>
      </section>

      {/* Gastos por categoría */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Gastos por categoría</h2>
          <span className="text-sm text-muted">este mes</span>
        </div>
        <Card>
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
                    <span className="grid place-items-center h-8 w-8 shrink-0 rounded-full bg-surface-2 text-muted">
                      <CatIcon size={14} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{c.label}</span>
                        <span className="nums font-semibold">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                      <span className="block h-1.5 w-full rounded-full bg-surface-2">
                        <span
                          className="block h-1.5 rounded-full bg-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Coins size={20} />}
              title="Sin gastos variables"
              description="Registra gastos este mes para ver el desglose."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
