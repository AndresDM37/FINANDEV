import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Zap,
  AlertTriangle,
  ArrowRight,
  Mail,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { useAuth } from "../hooks/useAuth";
import {
  formatCurrency,
  getPaymentStatus,
  computeMonthlyVariableAverage,
  LOW_BALANCE_RATIO,
  type PaymentStatus,
} from "../utils/calculations";
import { getCategoryDef } from "../utils/categories";
import { Card, StatCard, Badge, ListRow, EmptyState, Loader } from "../components/ui";

const STATUS_BADGE: Record<
  PaymentStatus,
  { label: string; tone: "income" | "expense" | "warning" | "neutral" }
> = {
  paid: { label: "Pagado", tone: "income" },
  overdue: { label: "Vencido", tone: "expense" },
  "due-soon": { label: "Vence pronto", tone: "warning" },
  scheduled: { label: "Programado", tone: "neutral" },
};

export default function Dashboard() {
  const { summary, loading, expenses, pendingImportCount } = useFinance();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  if (loading) return <Loader page label="Cargando tu resumen…" />;

  const username = user?.email?.split("@")[0] ?? "Usuario";

  const upcomingFixed = expenses
    .filter((e) => e.type === "fixed")
    .sort((a, b) => (a.due_day ?? 0) - (b.due_day ?? 0))
    .slice(0, 5);

  const pendingFixedCount = expenses.filter(
    (e) => e.type === "fixed" && !e.paid,
  ).length;

  const recentVariables = expenses
    .filter((e) => e.type === "variable")
    .sort((a, b) =>
      (b.expense_date ?? b.created_at).localeCompare(
        a.expense_date ?? a.created_at,
      ),
    )
    .slice(0, 6);

  const variableAverage = computeMonthlyVariableAverage(expenses);
  const overAverage =
    variableAverage !== null && summary.variableSpent > variableAverage;

  const alerts: { id: string; text: string; tone: "expense" | "warning" }[] = [];
  if (
    summary.totalIncome > 0 &&
    summary.available < summary.totalIncome * LOW_BALANCE_RATIO
  ) {
    alerts.push({
      id: "low-balance",
      text: `Tu disponible (${formatCurrency(summary.available)}) está por debajo del ${LOW_BALANCE_RATIO * 100}% de tus ingresos del mes.`,
      tone: "expense",
    });
  }
  if (overAverage && variableAverage !== null) {
    const pct = Math.round(
      ((summary.variableSpent - variableAverage) / variableAverage) * 100,
    );
    alerts.push({
      id: "over-average",
      text: `Tus gastos hormiga van ${pct}% por encima de tu promedio mensual (${formatCurrency(variableAverage)}).`,
      tone: "warning",
    });
  }

  const savingsGoal = profile?.savings_goal ?? null;
  const savingsProgress = savingsGoal
    ? Math.min(100, (summary.savingsAccumulated / savingsGoal) * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <header className="flex items-center gap-3">
        <span className="grid place-items-center h-11 w-11 rounded-full bg-accent-soft text-accent font-bold text-lg">
          {username.charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="text-sm text-muted">Hola de nuevo</p>
          <h1 className="text-xl font-bold capitalize leading-tight">
            {username}
          </h1>
        </div>
      </header>

      {/* Hero: disponible real */}
      <Card variant="accent" className="relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent">
            <Wallet size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Disponible real
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold nums text-accent-bright">
            {formatCurrency(summary.available)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Lo que te queda este mes tras gastos y ahorro
          </p>
        </div>
      </Card>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(summary.totalIncome)}
          hint="Salarios y extras"
          icon={<PiggyBank size={16} />}
        />
        <StatCard
          label="Gastos pendientes"
          tone="expense"
          value={formatCurrency(summary.fixedPending)}
          hint={`${pendingFixedCount} ${pendingFixedCount === 1 ? "servicio" : "servicios"} por pagar`}
          icon={<AlertTriangle size={16} />}
        />
        <StatCard
          label={profile?.savings_goal_name || "Meta de ahorro"}
          tone="info"
          value={formatCurrency(summary.savingsAccumulated)}
          icon={<PiggyBank size={16} />}
          hint={
            savingsProgress !== null && savingsGoal ? (
              <span className="block">
                <span className="mt-1 block h-1.5 w-full rounded-full bg-surface-2">
                  <span
                    className="block h-1.5 rounded-full bg-info"
                    style={{ width: `${savingsProgress}%` }}
                  />
                </span>
                <span className="mt-1.5 block">
                  {Math.round(savingsProgress)}% de {formatCurrency(savingsGoal)}
                </span>
              </span>
            ) : (
              "Define tu meta en Perfil"
            )
          }
        />
      </div>

      {/* Transacciones importadas por revisar */}
      {pendingImportCount > 0 && (
        <button
          onClick={() => navigate("/imported")}
          className="w-full text-left"
        >
          <Card variant="accent" className="flex items-center justify-between hover:bg-accent/15 transition-colors">
            <span className="flex items-center gap-2 text-sm font-semibold text-accent-bright">
              <Mail size={16} />
              {pendingImportCount}{" "}
              {pendingImportCount === 1
                ? "transacción del banco por revisar"
                : "transacciones del banco por revisar"}
            </span>
            <ArrowRight size={16} className="text-accent shrink-0" />
          </Card>
        </button>
      )}

      {/* Alertas */}
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={
            alert.tone === "expense"
              ? "flex items-center gap-3 border-expense/25 bg-expense/10"
              : "flex items-center gap-3 border-warning/25 bg-warning/10"
          }
        >
          <AlertTriangle
            size={18}
            className={alert.tone === "expense" ? "text-expense shrink-0" : "text-warning shrink-0"}
          />
          <span className="text-sm font-medium">{alert.text}</span>
        </Card>
      ))}

      {/* Dos columnas */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Próximos pagos */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={18} className="text-accent" />
            <h2 className="text-base font-bold">Próximos pagos</h2>
          </div>
          <Card className="divide-y divide-line">
            {upcomingFixed.map((e) => {
              const badge = STATUS_BADGE[getPaymentStatus(e)];
              return (
                <ListRow
                  key={e.id}
                  icon={<Zap size={16} className="text-warning" />}
                  title={e.name}
                  subtitle={
                    e.due_day ? `Vence el día ${e.due_day}` : "Sin vencimiento"
                  }
                  value={
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-expense">
                        -{formatCurrency(e.amount)}
                      </span>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </span>
                  }
                />
              );
            })}
            {upcomingFixed.length === 0 && (
              <EmptyState
                icon={<Wallet size={20} />}
                title="Sin gastos fijos"
                description="Registra tus servicios recurrentes para verlos aquí."
              />
            )}
          </Card>
        </section>

        {/* Gastos menores */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank size={18} className="text-muted" />
              <h2 className="text-base font-bold">Gastos menores</h2>
            </div>
            {variableAverage !== null && (
              <Badge tone={overAverage ? "expense" : "income"}>
                {overAverage ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {overAverage ? "Sobre" : "Bajo"} tu promedio
              </Badge>
            )}
          </div>
          <Card className="divide-y divide-line">
            {recentVariables.map((e) => {
              const cat = getCategoryDef(e.category);
              const CatIcon = cat.icon;
              return (
                <ListRow
                  key={e.id}
                  icon={<CatIcon size={16} className="text-warning" />}
                  title={e.name}
                  subtitle={`${cat.label}${e.expense_date ? ` · ${e.expense_date.slice(5)}` : ""}`}
                  value={<span className="text-expense">-{formatCurrency(e.amount)}</span>}
                />
              );
            })}
            {recentVariables.length === 0 && (
              <EmptyState
                icon={<PiggyBank size={20} />}
                title="Sin gastos menores"
                description="Usa el botón + para registrar uno rápido."
              />
            )}
          </Card>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Total este mes
            </span>
            <span className="text-lg font-bold nums">
              {formatCurrency(summary.variableSpent)}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
