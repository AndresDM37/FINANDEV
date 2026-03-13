import { useState, type FormEvent, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import {
  validatePassword,
  passwordStrength,
  strengthLabel,
  safeAuthError,
} from "../utils/security";

export default function UpdatePassword() {
  const { updatePassword, session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Intentamos detectar el hash de supabase en la URL si acabamos de llegar del correo
  // supabase auth maneja el token en el fragment, y useAuth procesa la sesión.

  const pwScore = passwordStrength(password);
  const pwLabel = strengthLabel(pwScore);

  useEffect(() => {
    // Si no estamos cargando y NO hay sesión, es posible que el usuario
    // haya llegado directamente o su enlace haya expirado.
    if (!loading && !session && !location.hash) {
      setError("Sesión inválida o enlace expirado. Solicita otro enlace de recuperación.");
    }
  }, [loading, session, location.hash]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, password: pwValidation.error! }));
      return;
    }

    if (password !== confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: "Las contraseñas no coinciden",
      }));
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(safeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center p-4 font-sans relative">
         <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[#10b981]/5 blur-[150px] pointer-events-none" />
        <div className="w-full max-w-[400px] relative z-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-3 bg-[#22c55e] rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ¡Contraseña actualizada!
          </h1>
          <p className="text-[#94a3b8] text-sm font-medium">
            Tu contraseña ha sido restablecida exitosamente.
          </p>
          <button
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(34,197,94,0.39)]"
            onClick={() => navigate("/login")}
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1628] flex items-center justify-center p-4 font-sans relative">
      <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[#10b981]/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10">
        <div className="flex justify-center mb-6">
          <div className="p-3.5 bg-[#22c55e] rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.25)]">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold text-white tracking-tight">
            Nueva Contraseña
          </h1>
          <p className="text-[#64748b] mt-1.5 text-sm font-medium tracking-wide">
            Crea una nueva contraseña segura
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* New Password */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-[#e2e8f0]">
              Nueva Contraseña
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#64748b] group-focus-within:text-[#22c55e] transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-[#1e293b]/80 border border-[#334155]/50 text-white pl-12 pr-12 py-3.5 rounded-xl outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/50 transition-all placeholder:text-[#475569]/70 text-[15px] tracking-widest"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#64748b] hover:text-[#94a3b8] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
             {fieldErrors.password && (
              <span className="text-xs text-red-400">
                {fieldErrors.password}
              </span>
            )}

            {password.length > 0 && (
              <div className="pt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${pwScore}%`,
                      backgroundColor: pwLabel.color,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: pwLabel.color }}
                >
                  {pwLabel.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
             <label className="text-[13px] font-bold text-[#e2e8f0]">
              Confirmar Contraseña
            </label>
             <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#64748b] group-focus-within:text-[#22c55e] transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-[#1e293b]/80 border border-[#334155]/50 text-white pl-12 pr-12 py-3.5 rounded-xl outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/50 transition-all placeholder:text-[#475569]/70 text-[15px] tracking-widest"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                required
              />
            </div>
            {fieldErrors.confirmPassword && (
              <span className="text-xs text-red-400">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#22c55e] hover:bg-[#20b958] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Guardar Contraseña"
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
            <button
               onClick={() => navigate("/login")}
              className="text-[#64748b] hover:text-[#e2e8f0] text-sm font-medium transition-colors"
            >
              Volver al Login
            </button>
        </div>
      </div>
    </div>
  );
}
