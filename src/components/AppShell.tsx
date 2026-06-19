import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  PiggyBank,
  PieChart,
  FileText,
  Mail,
  User,
  Plus,
  MoreHorizontal,
  LogOut,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { FinanceProvider, useFinance } from "../hooks/useFinance";
import TransactionModal, {
  type TransactionFormData,
} from "./TransactionModal";
import { Modal, cn } from "./ui";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/incomes", label: "Ingresos", icon: TrendingUp },
  { to: "/expenses", label: "Gastos", icon: CreditCard },
  { to: "/savings", label: "Ahorros", icon: PiggyBank },
  { to: "/analytics", label: "Análisis", icon: PieChart },
  { to: "/reports", label: "Reportes", icon: FileText },
  { to: "/imported", label: "Correos", icon: Mail },
  { to: "/admin", label: "Perfil", icon: User },
];

// Pestañas primarias del móvil (el resto va al sheet "Más").
const MOBILE_PRIMARY = ["/", "/expenses", "/analytics"];

export default function AppShell() {
  return (
    <FinanceProvider>
      <Shell />
    </FinanceProvider>
  );
}

function Shell() {
  const { user, signOut } = useAuth();
  const { addExpense, addIncome, pendingImportCount } = useFinance();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSubmit = async (data: TransactionFormData) => {
    try {
      if (data.type === "expense") {
        await addExpense({
          name: data.name,
          amount: data.amount,
          type: "variable",
          category: data.category ?? "other",
          due_day: null,
          expense_date: data.date.slice(0, 10),
          recurring: false,
          paid: true,
        });
      } else {
        await addIncome({
          source: data.name,
          amount: data.amount,
          received_at: data.date.slice(0, 10),
        });
      }
      setModalOpen(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
    }
  };

  const username = user?.email?.split("@")[0] ?? "Usuario";
  const primary = NAV.filter((n) => MOBILE_PRIMARY.includes(n.to));
  const secondary = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to));

  return (
    <div className="min-h-screen bg-ground text-ink">
      {/* ── Sidebar (escritorio) ───────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-line bg-surface/40 px-4 py-6 print:hidden">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-accent text-ground">
            <Wallet size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight">FinanDev</span>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="mb-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-ground font-semibold h-11 hover:bg-accent-bright active:scale-[0.98] transition-all"
        >
          <Plus size={18} /> Nueva transacción
        </button>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent-bright"
                    : "text-muted hover:text-ink hover:bg-surface-2/60",
                )
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {to === "/imported" && pendingImportCount > 0 && (
                <span className="ml-auto grid place-items-center min-w-5 h-5 px-1 rounded-full bg-accent text-ground text-xs font-bold">
                  {pendingImportCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-1">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-surface-2 text-ink font-bold">
              {username.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{username}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Cerrar sesión"
              className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-expense hover:bg-surface-2 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Contenido ──────────────────────────────── */}
      <div className="lg:pl-60 print:pl-0">
        <main className="mx-auto w-full max-w-5xl px-5 pt-6 pb-28 lg:px-10 lg:pt-10 lg:pb-12 print:p-0">
          <Outlet />
        </main>
      </div>

      {/* ── Tab bar (móvil) ────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-ground/95 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {primary.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
            <TabLink key={to} to={to} label={label} icon={Icon} end={end} />
          ))}

          <button
            onClick={() => setModalOpen(true)}
            aria-label="Nueva transacción"
            className="grid place-items-center h-12 w-12 -mt-6 rounded-full bg-accent text-ground shadow-[0_6px_20px_rgba(16,185,129,0.4)] active:scale-95 transition-transform"
          >
            <Plus size={26} />
          </button>

          {primary.slice(2).map(({ to, label, icon: Icon, end }) => (
            <TabLink key={to} to={to} label={label} icon={Icon} end={end} />
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 px-2 py-1 text-muted"
          >
            <span className="relative">
              <MoreHorizontal size={20} />
              {pendingImportCount > 0 && (
                <span className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </span>
            <span className="text-[10px] font-medium">Más</span>
          </button>
        </div>
      </nav>

      {/* ── Sheet "Más" (móvil) ────────────────────── */}
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Menú">
        <div className="grid grid-cols-2 gap-2">
          {secondary.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-accent/30 bg-accent-soft text-accent-bright"
                    : "border-line bg-surface-2 text-ink hover:border-line-strong",
                )
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {to === "/imported" && pendingImportCount > 0 && (
                <span className="ml-auto grid place-items-center min-w-5 h-5 px-1 rounded-full bg-accent text-ground text-xs font-bold">
                  {pendingImportCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
        <button
          onClick={handleSignOut}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-expense/25 bg-expense/10 p-3 text-sm font-medium text-expense transition-colors hover:bg-expense/20"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </Modal>

      {/* ── Modal de transacción (global) ──────────── */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-1 px-2 py-1 transition-colors",
          isActive ? "text-accent-bright" : "text-muted",
        )
      }
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}
