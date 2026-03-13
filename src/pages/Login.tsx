import { useState, type FormEvent, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Wallet,
  Chrome,
  Apple as AppleIcon,
  Loader2,
  LogIn,
} from "lucide-react";
import {
  sanitizeEmail,
  validateEmail,
  validatePassword,
  passwordStrength,
  strengthLabel,
  checkRateLimit,
  resetRateLimit,
  safeAuthError,
} from "../utils/security";

export default function Login() {
  const { user, signIn, signUp, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);
  const [lockoutMsg, setLockoutMsg] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Honeypot anti-bot
  const [honeypot, setHoneypot] = useState("");

  // Timing anti-bot
  const renderTime = useRef(Date.now());

  // Password strength indicator
  const pwScore = isSignUp ? passwordStrength(password) : 0;
  const pwLabel = strengthLabel(pwScore);

  // Reset errors
  useEffect(() => {
    setError("");
    setFieldErrors({});
    setSignUpSuccess(false);
  }, [isSignUp]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (honeypot) {
      setSubmitting(true);
      setTimeout(() => setSubmitting(false), 2000);
      return;
    }

    if (Date.now() - renderTime.current < 1000) {
      setError("Demasiado rápido. Intentá de nuevo.");
      return;
    }

    const cleanEmail = sanitizeEmail(email);
    const emailValidation = validateEmail(cleanEmail);
    if (!emailValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, email: emailValidation.error! }));
      return;
    }

    if (isSignUp) {
      const pwValidation = validatePassword(password);
      if (!pwValidation.valid) {
        setFieldErrors((prev) => ({ ...prev, password: pwValidation.error! }));
        return;
      }
    } else {
      if (password.length < 6) {
        setFieldErrors((prev) => ({
          ...prev,
          password: "Mínimo 6 caracteres",
        }));
        return;
      }
    }

    const rl = checkRateLimit(cleanEmail);
    if (!rl.allowed) {
      const minutes = Math.ceil((rl.retryAfterMs ?? 0) / 60_000);
      setLockoutMsg(
        `Demasiados intentos. Tu cuenta está bloqueada por ${minutes} minuto${minutes > 1 ? "s" : ""}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(cleanEmail, password);
        resetRateLimit(cleanEmail);
        setSignUpSuccess(true);
      } else {
        await signIn(cleanEmail, password);
        resetRateLimit(cleanEmail);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(safeAuthError(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-[#0e1628] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-3 bg-[#22c55e] rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            ¡Registro enviado!
          </h1>
          <p className="text-[#94a3b8] text-sm">
            Si el email es válido, recibirás un correo de confirmación. Revisá
            tu bandeja de entrada (y spam).
          </p>
          <button
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-3.5 rounded-xl transition-all"
            onClick={() => {
              setIsSignUp(false);
              setSignUpSuccess(false);
            }}
          >
            Volver a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1628] flex items-center justify-center p-4 font-sans relative">
      {/* subtle top-left ambient light similar to the image */}
      <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-[#10b981]/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="p-3.5 bg-[#22c55e] rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.25)]">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-bold text-white tracking-tight">
            {isSignUp ? "Crear Cuenta" : "Bienvenido de nuevo"}
          </h1>
          <p className="text-[#64748b] mt-1.5 text-sm font-medium tracking-wide">
            {isSignUp ? "Comienza tu viaje financiero" : "Domina tus finanzas"}
          </p>
        </div>

        {lockoutMsg && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
            {lockoutMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <input
            type="text"
            className="hidden"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {/* Email */}
          <div className="space-y-2">
            <label className="text-[13px] font-bold text-[#e2e8f0]">
              Correo Electrónico
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[#64748b] group-focus-within:text-[#22c55e] transition-colors" />
              </div>
              <input
                type="email"
                className="w-full bg-[#1e293b]/80 border border-[#334155]/50 text-white pl-12 pr-4 py-3.5 rounded-xl outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/50 transition-all placeholder:text-[#475569] text-[15px]"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                required
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && (
              <span className="text-xs text-red-400">{fieldErrors.email}</span>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[13px] font-bold text-[#e2e8f0]">
                Contraseña
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  className="text-[13px] font-bold text-[#22c55e] hover:text-[#16a34a] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
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
                autoComplete={isSignUp ? "new-password" : "current-password"}
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

            {isSignUp && password.length > 0 && (
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

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs text-center animate-shake">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !!lockoutMsg}
              className="w-full bg-[#22c55e] hover:bg-[#20b958] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(34,197,94,0.39)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="text-[15px]">
                    {isSignUp ? "Crear Cuenta" : "Iniciar Sesión"}
                  </span>
                  {!isSignUp && <LogIn className="w-4 h-4 ml-1" />}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#334155]/50"></div>
          </div>
          <div className="relative flex justify-center text-[11px] font-bold uppercase tracking-wider">
            <span className="bg-[#0e1628] px-4 text-[#475569]">
              O continúa con
            </span>
          </div>
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-2 gap-4">
          <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#1e293b]/50 border border-[#334155]/30 rounded-xl hover:bg-[#1e293b] transition-colors text-[#e2e8f0] font-bold text-[14px]">
            <Chrome className="w-[18px] h-[18px]" />
            <span>Google</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-3.5 px-4 bg-[#1e293b]/50 border border-[#334155]/30 rounded-xl hover:bg-[#1e293b] transition-colors text-[#e2e8f0] font-bold text-[14px]">
            <AppleIcon className="w-[18px] h-[18px]" />
            <span>Apple</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-[#64748b] text-[14px] font-medium">
            {isSignUp ? "¿Ya tienes una cuenta?" : "¿No tienes una cuenta?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#22c55e] hover:text-[#16a34a] font-bold transition-colors"
            >
              {isSignUp ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
