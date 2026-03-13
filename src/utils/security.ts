// ──────────────────────────────────────────────
// Security utilities for FinanDev
// ──────────────────────────────────────────────

/**
 * Rate limiter en memoria por clave (email, IP, etc.)
 * Protege contra ataques de fuerza bruta.
 */
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5, // Máximo intentos permitidos
  windowMs: 15 * 60_000, // Ventana de 15 minutos
  lockoutMs: 15 * 60_000, // Bloqueo de 15 minutos tras exceso
  cleanupInterval: 60_000, // Limpiar entradas viejas cada 1 min
} as const;

// Limpieza periódica para no acumular memoria
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      const expired =
        entry.lockedUntil && now > entry.lockedUntil
          ? true
          : now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs;
      if (expired) rateLimitStore.delete(key);
    }
    if (rateLimitStore.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, RATE_LIMIT_CONFIG.cleanupInterval);
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs: number | null;
}

/**
 * Verifica si una acción está permitida para la clave dada.
 * Devuelve si se permite, intentos restantes y tiempo de espera.
 */
export function checkRateLimit(key: string): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Sin registro previo → permitir
  if (!entry) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - 1,
      retryAfterMs: null,
    };
  }

  // Bloqueado → verificar si ya pasó el lockout
  if (entry.lockedUntil) {
    if (now < entry.lockedUntil) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterMs: entry.lockedUntil - now,
      };
    }
    // Lockout expirado → reset
    rateLimitStore.delete(key);
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - 1,
      retryAfterMs: null,
    };
  }

  // Ventana expirada → reset
  if (now - entry.firstAttempt > RATE_LIMIT_CONFIG.windowMs) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
    });
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - 1,
      retryAfterMs: null,
    };
  }

  // Dentro de la ventana
  entry.attempts++;

  if (entry.attempts > RATE_LIMIT_CONFIG.maxAttempts) {
    entry.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutMs;
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterMs: RATE_LIMIT_CONFIG.lockoutMs,
    };
  }

  return {
    allowed: true,
    remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - entry.attempts,
    retryAfterMs: null,
  };
}

/** Resetear rate limit (ej: tras login exitoso) */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ──────────────────────────────────────────────
// Validación de inputs
// ──────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const DISPOSABLE_DOMAINS = [
  "tempmail.com",
  "throwaway.email",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "maildrop.cc",
];

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

/** Sanitizar email: trim, lowercase, eliminar caracteres peligrosos */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>"'`;(){}[\]\\]/g, "") // Eliminar chars peligrosos (XSS/injection)
    .slice(0, 254); // Max email length per RFC 5321
}

/** Validar formato de email */
export function validateEmail(email: string): ValidationResult {
  if (!email) return { valid: false, error: "El email es requerido" };
  if (email.length > 254)
    return { valid: false, error: "Email demasiado largo" };
  if (!EMAIL_REGEX.test(email))
    return { valid: false, error: "Formato de email inválido" };

  const domain = email.split("@")[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, error: "No se permiten emails temporales" };
  }

  return { valid: true, error: null };
}

/** Validar fortaleza de contraseña */
export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: "La contraseña es requerida" };
  if (password.length < 8)
    return { valid: false, error: "Mínimo 8 caracteres" };
  if (password.length > 128)
    return { valid: false, error: "Máximo 128 caracteres" };
  if (!/[A-Z]/.test(password))
    return { valid: false, error: "Debe tener al menos una mayúscula" };
  if (!/[a-z]/.test(password))
    return { valid: false, error: "Debe tener al menos una minúscula" };
  if (!/[0-9]/.test(password))
    return { valid: false, error: "Debe tener al menos un número" };
  if (!/[^A-Za-z0-9]/.test(password))
    return {
      valid: false,
      error: "Debe tener al menos un carácter especial (!@#$...)",
    };

  // Detectar contraseñas comunes
  const common = [
    "password",
    "12345678",
    "qwerty123",
    "letmein1",
    "admin123",
    "welcome1",
    "monkey12",
    "dragon12",
    "master12",
    "abc12345",
  ];
  if (common.some((c) => password.toLowerCase().includes(c))) {
    return { valid: false, error: "Contraseña demasiado común" };
  }

  return { valid: true, error: null };
}

/**
 * Calcular fortaleza de contraseña: 0-100
 */
export function passwordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;
  // Variedad de caracteres únicos
  const unique = new Set(password).size;
  if (unique >= 8) score += 10;
  return Math.min(score, 100);
}

export function strengthLabel(score: number): { label: string; color: string } {
  if (score < 30) return { label: "Muy débil", color: "#ef4444" };
  if (score < 50) return { label: "Débil", color: "#f97316" };
  if (score < 70) return { label: "Aceptable", color: "#eab308" };
  if (score < 90) return { label: "Fuerte", color: "#22c55e" };
  return { label: "Muy fuerte", color: "#10b981" };
}

// ──────────────────────────────────────────────
// Sanitización de texto genérica (anti-XSS)
// ──────────────────────────────────────────────

/** Escapa HTML entities para prevenir XSS en textos libres */
export function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return str.replace(/[&<>"']/g, (c) => map[c] ?? c);
}

/** Sanitizar input de texto libre (nombres, notas, etc.) */
export function sanitizeText(text: string, maxLength = 500): string {
  return text
    .trim()
    .replace(/[<>]/g, "") // Eliminar tags HTML
    .slice(0, maxLength);
}

// ──────────────────────────────────────────────
// Timing-safe error messages (no revelar info)
// ──────────────────────────────────────────────

/**
 * Mensajes genéricos para no revelar si un email existe o no.
 * Supabase ya maneja esto en parte, pero reforzamos en el frontend.
 */
export function safeAuthError(originalError: string): string {
  console.error("Auth Error (Original):", originalError);
  const lower = originalError.toLowerCase();

  // No revelar si el usuario existe/no existe
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("user not found") ||
    lower.includes("wrong password") ||
    lower.includes("invalid email or password")
  ) {
    return "Email o contraseña incorrectos";
  }

  if (lower.includes("email not confirmed")) {
    return "Debés confirmar tu email antes de iniciar sesión";
  }

  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "Demasiados intentos. Esperá unos minutos.";
  }

  if (
    lower.includes("already registered") ||
    lower.includes("already exists")
  ) {
    // NO revelar que el email ya existe → mensaje genérico
    return "Si el email es válido, recibirás un correo de confirmación";
  }

  if (lower.includes("weak password") || lower.includes("password")) {
    return "La contraseña no cumple los requisitos mínimos";
  }

  if (lower.includes("network") || lower.includes("fetch")) {
    return "Error de conexión. Verificá tu internet.";
  }

  // Genérico para todo lo demás
  return "Ocurrió un error. Intentá nuevamente.";
}
