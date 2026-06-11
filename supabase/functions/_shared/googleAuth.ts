import { supabaseAdmin } from "./supabaseAdmin.ts";
import type { EmailIntegration } from "./types.ts";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

function clientId(): string {
  return Deno.env.get("GOOGLE_CLIENT_ID")!;
}
function clientSecret(): string {
  return Deno.env.get("GOOGLE_CLIENT_SECRET")!;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

/** Intercambia el authorization code por tokens (paso final del OAuth). */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange falló (${res.status}): ${await res.text()}`);
  }
  return await res.json();
}

/** Obtiene la dirección de Gmail del dueño del access token. */
export async function getGmailAddress(accessToken: string): Promise<string> {
  const res = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail profile falló (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.emailAddress;
}

export class RevokedTokenError extends Error {
  constructor() {
    super("El refresh token fue revocado (invalid_grant)");
  }
}

/** Refresca el access token usando el refresh token. */
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 400 && body.includes("invalid_grant")) {
      throw new RevokedTokenError();
    }
    throw new Error(`Refresh de token falló (${res.status}): ${body}`);
  }
  return await res.json();
}

/**
 * Devuelve un access token válido para la integración: usa el cacheado si
 * le quedan más de 2 minutos; si no, lo refresca y persiste el nuevo.
 * Lanza RevokedTokenError si el usuario revocó el acceso.
 */
export async function getValidAccessToken(
  integration: EmailIntegration,
): Promise<string> {
  const expiresAt = integration.access_token_expires_at
    ? new Date(integration.access_token_expires_at).getTime()
    : 0;
  const marginMs = 2 * 60 * 1000;

  if (integration.access_token && expiresAt - Date.now() > marginMs) {
    return integration.access_token;
  }

  const token = await refreshAccessToken(integration.refresh_token);
  const newExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("email_integrations")
    .update({
      access_token: token.access_token,
      access_token_expires_at: newExpiresAt,
    })
    .eq("user_id", integration.user_id);
  if (error) throw error;

  return token.access_token;
}
