import { useState } from "react";
import {
  TrendingUp,
  Wallet,
  PiggyBank,
  Edit2,
  MoreHorizontal,
  Plus,
  Coffee,
  Car,
  Home,
  Zap,
  LayoutDashboard,
  PieChart,
  CreditCard,
  User,
  Plane,
  AlertTriangle,
  Candy,
} from "lucide-react";
import { useFinance } from "../hooks/useFinance";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/calculations";
import TransactionModal from "../components/TransactionModal";

export default function Dashboard() {
  const { summary, loading, expenses, addExpense, addIncome } = useFinance();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTransactionSubmit = async (data: any) => {
    try {
      if (data.type === "expense") {
        await addExpense({
          name: data.name,
          amount: data.amount,
          type: "variable",
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
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding transaction:", error);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );

  const upcomingFixed = expenses
    .filter((e) => e.type === "fixed" && !e.paid)
    .sort((a, b) => (a.due_day ?? 0) - (b.due_day ?? 0))
    .slice(0, 3); // take just 3 to match design

  return (
    <div className="min-h-screen bg-[#0e1628] text-white font-sans pb-24 overflow-x-hidden relative">
      <div className="w-full max-w-md lg:max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header section with User and Edit Mode */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-800">
                <span className="font-bold text-lg">
                  {user?.email?.charAt(0).toUpperCase() || "A"}
                </span>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0e1628]"></div>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-medium">
                Good morning,
              </p>
              <h1 className="font-bold text-[17px] leading-tight text-slate-100">
                {user?.email?.split("@")[0] || "Alex Johnson"}
              </h1>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-[#1e293b]/50 hover:bg-[#1e293b] border border-slate-800/60 rounded-full px-3 py-1.5 transition-colors">
            <div className="bg-emerald-500 p-1 rounded-full">
              <Edit2 size={12} className="text-[#0e1628] fill-current" />
            </div>
            <span className="text-xs font-semibold text-slate-300">
              Modo Edición
            </span>
          </button>
        </header>

        {/* Horizontal scrollable Summary Cards */}
        <div className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto lg:overflow-visible pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] -mx-5 px-5 lg:mx-0 lg:px-0 snap-x lg:snap-none">
          {/* Card 1: Real Available (Green focus) */}
          <div className="min-w-[240px] lg:min-w-0 h-full bg-gradient-to-br from-[#123126] to-[#0e211b] border border-[#10b981]/10 rounded-[24px] p-5 shadow-[0_8px_30px_rgba(16,185,129,0.08)] snap-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/10 rounded-full blur-[40px] -mr-10 -mt-10"></div>
            <div className="flex justify-between items-center mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="bg-[#10b981]/20 p-1.5 rounded-lg">
                  <Wallet size={14} className="text-[#10b981]" />
                </div>
                <span className="text-xs font-bold text-[#10b981] tracking-wider uppercase">
                  Disponible Real
                </span>
              </div>
              <button className="text-[#10b981]/60 hover:text-[#10b981] transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <h2 className="text-[32px] font-bold text-white mb-2 tracking-tight relative z-10">
              {formatCurrency(summary.available)}
            </h2>
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-[#10b981] text-xs font-bold flex items-center bg-[#10b981]/10 px-1.5 py-0.5 rounded">
                <TrendingUp size={12} className="mr-1" /> +12%
              </span>
              <span className="text-slate-400 text-xs">vs mes anterior</span>
            </div>
          </div>

          {/* Card 2: Total Income */}
          <div className="min-w-[240px] lg:min-w-0 h-full bg-[#141b2e] border border-slate-800/80 rounded-[24px] p-5 snap-center">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-slate-800/80 p-1.5 rounded-lg">
                  <PiggyBank size={14} className="text-slate-300" />
                </div>
                <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
                  Ingresos Totales
                </span>
              </div>
            </div>
            <h2 className="text-[32px] font-bold text-white mb-2 tracking-tight">
              {formatCurrency(summary.totalIncome)}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[#10b981] text-xs font-bold flex items-center">
                <TrendingUp size={12} className="mr-0.5" /> +5%
              </span>
              <span className="text-slate-400 text-xs">Salarios y Extras</span>
            </div>
          </div>

          {/* Card 3: Pending Bills */}
          <div className="min-w-[240px] lg:min-w-0 h-full bg-[#141b2e] border border-red-500/10 rounded-[24px] p-5 snap-center">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-red-500/10 p-1.5 rounded-lg">
                  <Wallet size={14} className="text-red-400" />
                </div>
                <span className="text-xs font-bold text-red-400 tracking-wider uppercase">
                  Gastos Pendientes
                </span>
              </div>
            </div>
            <h2 className="text-[32px] font-bold text-white mb-2 tracking-tight">
              {formatCurrency(-summary.fixedPending)}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-xs font-bold flex items-center bg-red-400/10 px-1.5 py-0.5 rounded">
                <AlertTriangle size={12} className="mr-1" /> Vencen Pronto
              </span>
              <span className="text-slate-400 text-xs">3 servicios</span>
            </div>
          </div>

          {/* Card 4: Savings goal example */}
          <div className="min-w-[200px] lg:min-w-0 h-full bg-gradient-to-br from-[#1a233a] to-[#0e1628] border border-blue-500/20 rounded-[24px] p-5 snap-center overflow-hidden relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-500/20 p-1.5 rounded-lg">
                <Plane size={14} className="text-blue-400" />
              </div>
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">
                Viaje a Japón
              </span>
            </div>
            <p className="font-bold text-lg text-white mb-2">
              ${formatCurrency(summary.savingsAccumulated).replace("$", "")}
            </p>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: "45%" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Desktop 2-Column Wrapper */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-start mt-8">
          {/* Left Column: Next Payments */}
          <div>
            <div className="mb-4 flex justify-between items-end">
              <div className="flex items-center gap-2">
                <div className="text-emerald-500">
                  <Wallet size={18} />
                </div>
                <h3 className="font-bold text-[17px] text-white">
                  Próximos Pagos
                </h3>
              </div>
              <button className="text-emerald-500 text-xs font-bold">
                Ver Todo
              </button>
            </div>

            <div className="space-y-3">
              {/* Example Item 1: Netflix (Hardcoded fallback if list is empty for visual matching) */}
              <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center font-bold text-white shadow-[0_2px_10px_rgba(239,68,68,0.3)]">
                    N
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-100">
                      Suscripción Netflix
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Ocio • Vence Mañana
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[15px] text-white">-$15.99</p>
                  <span className="inline-block mt-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded cursor-default">
                    Pendiente
                  </span>
                </div>
              </div>

              <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-slate-700/60 flex items-center justify-center font-bold text-slate-300">
                    <Home size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-100">
                      Alquiler Mes
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Hogar • Vence en 3 días
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[15px] text-white">-$1,200.00</p>
                  <span className="inline-block mt-1 bg-slate-700 text-slate-300 border border-slate-600 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded cursor-default">
                    Programado
                  </span>
                </div>
              </div>

              {upcomingFixed.map((e, idx) => (
                <div
                  key={idx}
                  className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white shadow-[0_2px_10px_rgba(249,115,22,0.3)]">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-100">
                        {e.name}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        Vence el día {e.due_day}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[15px] text-white">
                      -{formatCurrency(e.amount)}
                    </p>
                    <span className="inline-block mt-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded cursor-default">
                      Pagado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Small Expenses */}
          <div>
            <div className="mb-4 flex items-center gap-2 lg:mt-0 mt-8">
              <div className="text-slate-400">
                <PiggyBank size={18} />
              </div>
              <h3 className="font-bold text-[17px] text-white">
                Gastos Menores
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-900/40 flex items-center justify-center text-amber-500">
                    <Coffee size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-slate-100">
                      Coffee
                    </p>
                    <p className="text-[11px] text-slate-400">Today</p>
                  </div>
                </div>
                <p className="font-bold text-sm">-$5.50</p>
              </div>

              <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-900/40 flex items-center justify-center text-purple-400">
                    <Candy size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-slate-100">
                      Snack
                    </p>
                    <p className="text-[11px] text-slate-400">Yesterday</p>
                  </div>
                </div>
                <p className="font-bold text-sm">-$3.20</p>
              </div>

              <div className="bg-[#141b2e] border border-slate-800/80 rounded-2xl p-3.5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400">
                    <Car size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-[13px] text-slate-100">Uber</p>
                    <p className="text-[11px] text-slate-400">Mon</p>
                  </div>
                </div>
                <p className="font-bold text-sm">-$12.00</p>
              </div>

              <button className="bg-transparent border border-dashed border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-center text-slate-500 hover:text-slate-400 hover:border-slate-600 transition-colors">
                <span className="text-[11px] font-bold">
                  + Agregar Frecuente
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.4)] flex items-center justify-center text-[#0e1628] transition-transform active:scale-95 z-50"
      >
        <Plus size={28} />
      </button>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleTransactionSubmit}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md lg:max-w-2xl left-1/2 -translate-x-1/2 bg-[#0a101f]/95 backdrop-blur-md border-t lg:border border-slate-800/60 lg:bottom-6 lg:rounded-2xl px-6 py-4 flex justify-between items-center z-40">
        <button className="flex flex-col items-center gap-1.5 focus:outline-none">
          <LayoutDashboard size={20} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500">
            Resumen
          </span>
        </button>
        <button className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none">
          <PieChart size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
            Análisis
          </span>
        </button>
        <button className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none">
          <CreditCard size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
            Tarjetas
          </span>
        </button>
        <button
          className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
          onClick={() => (window.location.href = "/admin")}
        >
          <User size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
            Perfil
          </span>
        </button>
      </nav>
    </div>
  );
}
