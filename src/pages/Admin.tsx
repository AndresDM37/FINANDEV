import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/calculations";
import {
  updateSavingsPercentage,
  getEmailIntegrationStatus,
  startGmailConnect,
  disconnectGmail,
  triggerGmailSync,
} from "../services/financeService";
import type { EmailIntegrationStatus } from "../types/finance.types";
import {
  ArrowLeft,
  MoreVertical,
  Briefcase,
  Brush,
  Home,
  Wifi,
  Plus,
  Pencil,
  Trash2,
  LayoutDashboard,
  PieChart,
  User,
  CreditCard,
  Mail,
  RefreshCw,
} from "lucide-react";

export default function Admin() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [percentage, setPercentage] = useState(
    profile?.savings_percentage?.toString() ?? "20",
  );

  // ── Conexión con Gmail ──────────────────────
  const [gmailStatus, setGmailStatus] = useState<EmailIntegrationStatus | null>(
    null,
  );
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailNotice, setGmailNotice] = useState<string | null>(null);
  const [gmailSyncing, setGmailSyncing] = useState(false);

  useEffect(() => {
    // Mensaje al volver del consentimiento de Google (?gmail=connected|error)
    const params = new URLSearchParams(window.location.search);
    const result = params.get("gmail");
    if (result === "connected") {
      setGmailNotice("✅ Gmail conectado correctamente.");
    } else if (result === "error") {
      setGmailNotice(
        `⚠️ No se pudo conectar Gmail (${params.get("reason") ?? "error"}). Intenta de nuevo.`,
      );
    }
    if (result) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    getEmailIntegrationStatus()
      .then(setGmailStatus)
      .catch(() => setGmailStatus(null))
      .finally(() => setGmailLoading(false));
  }, []);

  const handleGmailConnect = async () => {
    if (!profile) return;
    try {
      const url = await startGmailConnect(profile.id);
      window.location.href = url;
    } catch (err) {
      setGmailNotice(`⚠️ ${err instanceof Error ? err.message : "Error al iniciar la conexión"}`);
    }
  };

  const handleGmailDisconnect = async () => {
    if (!window.confirm("¿Desconectar Gmail? Dejarán de importarse tus correos del banco.")) return;
    await disconnectGmail();
    setGmailStatus(null);
  };

  const handleGmailSync = async () => {
    setGmailSyncing(true);
    try {
      await triggerGmailSync();
      const status = await getEmailIntegrationStatus();
      setGmailStatus(status);
      setGmailNotice("✅ Sincronización completada. Revisa la pestaña Correos.");
    } catch {
      setGmailNotice("⚠️ Error al sincronizar. Revisa la conexión.");
    } finally {
      setGmailSyncing(false);
    }
  };

  // Fallback estimated savings
  const estAmount = 850.0;

  const handleSave = async (newVal: number) => {
    if (!profile) return;
    try {
      await updateSavingsPercentage(profile.id, newVal);
      await refreshProfile();
    } catch {
      console.error("Error saving percentage");
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPercentage(val);
  };

  const handleSliderMouseUp = () => {
    handleSave(parseInt(percentage));
  };

  // Mock Data to match the design aesthetics perfectly
  const incomes = [
    {
      id: 1,
      title: "Tech Corp Salary",
      subtitle: "Monthly • 1st",
      amount: 4250,
      icon: <Briefcase size={16} />,
    },
    {
      id: 2,
      title: "Freelance Design",
      subtitle: "Irregular",
      amount: 1200,
      icon: <Brush size={16} />,
    },
  ];

  const expenses = [
    {
      id: 1,
      title: "Apartment Rent",
      subtitle: "Monthly • 5th",
      amount: -1800,
      icon: <Home size={16} />,
    },
    {
      id: 2,
      title: "Internet & Utils",
      subtitle: "Monthly • 12th",
      amount: -145,
      icon: <Wifi size={16} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#111814] text-white font-sans pb-24 relative selection:bg-emerald-500/30">
      <div className="w-full max-w-md lg:max-w-3xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <button
            className="text-slate-200 hover:text-white transition-colors"
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-[17px] text-white tracking-wide">
            Perfil
          </h1>
          <button className="text-slate-200 hover:text-white transition-colors">
            <MoreVertical size={20} />
          </button>
        </header>

        {/* View / Admin Mode Toggle */}
        <div className="bg-[#1e293b]/50 rounded-full p-1 flex items-center mb-8 border border-slate-800/60">
          <button className="flex-1 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors rounded-full text-center">
            Vista General
          </button>
          <button className="flex-1 py-2 text-sm font-bold text-emerald-400 bg-[#0a101f] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-slate-800/80 text-center">
            Modo Edición
          </button>
        </div>

        {/* Savings Target Widget */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Meta de Ahorro</h2>
            <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">
              Activo
            </span>
          </div>

          <div className="bg-[#141b2e] rounded-2xl p-5 border border-slate-800/80 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs text-slate-400 mb-1">Ahorro Automático</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-black text-white">
                    {percentage}
                  </span>
                  <span className="text-emerald-500 font-bold text-lg">%</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Monto Est.</p>
                <p className="text-white font-bold">
                  {formatCurrency(estAmount)}
                </p>
              </div>
            </div>

            {/* Custom Range Slider */}
            <div className="relative mb-6">
              <input
                type="range"
                min="0"
                max="50"
                value={percentage}
                onChange={handleSliderChange}
                onMouseUp={handleSliderMouseUp}
                onTouchEnd={handleSliderMouseUp}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 z-10 relative"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${(parseInt(percentage) / 50) * 100}%, #1e293b ${(parseInt(percentage) / 50) * 100}%, #1e293b 100%)`,
                }}
              />
              <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-800/80 pt-4">
              <span className="text-xs text-slate-400">
                Próx. transferencia: 1 Oct
              </span>
              <button className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                Configurar Fechas
              </button>
            </div>
          </div>
        </div>

        {/* Conexión con Gmail */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Conexión con Gmail</h2>
            {gmailStatus && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                  gmailStatus.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {gmailStatus.status === "active"
                  ? "Conectado"
                  : gmailStatus.status === "revoked"
                    ? "Revocado"
                    : "Error"}
              </span>
            )}
          </div>

          <div className="bg-[#141b2e] rounded-2xl p-5 border border-slate-800/80 shadow-sm">
            {gmailNotice && (
              <p className="text-xs text-slate-300 mb-3">{gmailNotice}</p>
            )}

            {gmailLoading ? (
              <p className="text-xs text-slate-400">Cargando estado...</p>
            ) : gmailStatus ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      {gmailStatus.gmail_address}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Última sincronización:{" "}
                      {gmailStatus.last_synced_at
                        ? new Date(gmailStatus.last_synced_at).toLocaleString()
                        : "nunca"}
                    </p>
                  </div>
                </div>

                {gmailStatus.status === "revoked" && (
                  <p className="text-xs text-red-400 mb-3">
                    El acceso fue revocado en Google. Vuelve a conectar tu
                    cuenta para seguir importando correos.
                  </p>
                )}
                {gmailStatus.last_error && gmailStatus.status === "error" && (
                  <p className="text-xs text-red-400 mb-3">
                    {gmailStatus.last_error}
                  </p>
                )}

                <div className="flex gap-3">
                  {gmailStatus.status === "active" ? (
                    <button
                      onClick={handleGmailSync}
                      disabled={gmailSyncing}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw
                        size={14}
                        className={gmailSyncing ? "animate-spin" : ""}
                      />
                      Sincronizar ahora
                    </button>
                  ) : (
                    <button
                      onClick={handleGmailConnect}
                      className="text-xs font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      Reconectar
                    </button>
                  )}
                  <button
                    onClick={handleGmailDisconnect}
                    className="text-xs font-bold text-red-900/60 hover:text-red-400 transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-4">
                  Conecta tu Gmail para que las compras de Bancolombia, Nu y
                  Nequi se registren automáticamente desde los correos del
                  banco. Solo lectura: nunca enviamos ni borramos correos.
                </p>
                <button
                  onClick={handleGmailConnect}
                  className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm px-4 py-2 rounded-xl hover:bg-emerald-500/20 transition-colors"
                >
                  <Mail size={16} />
                  Conectar Gmail
                </button>
              </>
            )}
          </div>
        </div>

        {/* Income Sources */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Fuentes de Ingreso</h2>
            <button className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-colors">
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>

          <div className="bg-[#141b2e] rounded-2xl border border-slate-800/80 divide-y divide-slate-800/80">
            {incomes.map((inc) => (
              <div
                key={inc.id}
                className="p-4 flex items-center justify-between hover:bg-[#1e293b]/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                    {inc.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      {inc.title}
                    </h3>
                    <p className="text-xs text-slate-400">{inc.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-white text-sm">
                    {inc.title.includes("Freelance") ? "~" : ""}$
                    {inc.amount.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="text-slate-500 hover:text-emerald-400 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button className="text-red-900/40 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Expenses */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg text-white">Gastos Fijos</h2>
            <button className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-colors">
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>

          <div className="bg-[#141b2e] rounded-2xl border border-slate-800/80 divide-y divide-slate-800/80">
            {expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-4 flex items-center justify-between hover:bg-[#1e293b]/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-slate-800/80 flex items-center justify-center text-slate-300">
                    {exp.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">
                      {exp.title}
                    </h3>
                    <p className="text-xs text-slate-400">{exp.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-white text-sm">
                    -${Math.abs(exp.amount).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="text-slate-500 hover:text-emerald-400 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button className="text-red-900/40 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Helper Logout button at the very bottom since this view was also used for Settings */}
        <div className="mt-12 text-center pb-8">
          <button
            onClick={signOut}
            className="text-slate-500 hover:text-red-400 text-sm font-bold transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md lg:max-w-2xl left-1/2 -translate-x-1/2 bg-[#0a101f]/95 backdrop-blur-md border-t lg:border border-slate-800/60 lg:bottom-6 lg:rounded-2xl px-6 py-4 flex justify-between items-center z-40">
        <button
          className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
          onClick={() => (window.location.href = "/")}
        >
          <LayoutDashboard size={20} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400">
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

        <button className="flex flex-col items-center gap-1.5 focus:outline-none">
          <User size={20} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500">Perfil</span>
        </button>
      </nav>

      {/* Dynamic styles for the custom range slider thumb */}
      <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 4px solid #141b2e;
            box-shadow: 0 0 0 2px #10b981, 0 2px 5px rgba(0,0,0,0.3);
            transform: translateY(-2px);
          }
          input[type=range]::-moz-range-thumb {
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: #10b981;
            cursor: pointer;
            border: 4px solid #141b2e;
            box-shadow: 0 0 0 2px #10b981, 0 2px 5px rgba(0,0,0,0.3);
            transform: translateY(-2px);
          }
        `}</style>
    </div>
  );
}
