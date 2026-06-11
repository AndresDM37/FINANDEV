// Callback del OAuth de Google. Desplegar con verify_jwt = false (config.toml):
// Google redirige aquí sin JWT; la seguridad la da el nonce de oauth_states.
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { exchangeCode, getGmailAddress } from "../_shared/googleAuth.ts";

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function redirectToApp(params: string): Response {
  const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
  return new Response(null, {
    status: 302,
    headers: { Location: `${appUrl}/admin?${params}` },
  });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return redirectToApp(`gmail=error&reason=${oauthError}`);
  if (!code || !state) return redirectToApp("gmail=error&reason=missing_params");

  try {
    // 1. Consumir el nonce (anti-CSRF): debe existir, ser reciente, y se borra ya
    const { data: stateRow, error: stateError } = await supabaseAdmin
      .from("oauth_states")
      .delete()
      .eq("state", state)
      .select()
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow) return redirectToApp("gmail=error&reason=invalid_state");

    const age = Date.now() - new Date(stateRow.created_at).getTime();
    if (age > STATE_MAX_AGE_MS) {
      return redirectToApp("gmail=error&reason=expired_state");
    }

    // Limpieza oportunista de nonces viejos
    await supabaseAdmin.rpc("cleanup_oauth_states");

    // 2. Intercambiar el code por tokens.
    // OJO: no usar url.origin — detrás del gateway llega como http:// y Google
    // exige que el redirect_uri coincida EXACTAMENTE con el registrado (https).
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-oauth-callback`;
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.refresh_token) {
      // Pasa si el usuario ya había autorizado sin prompt=consent
      return redirectToApp("gmail=error&reason=no_refresh_token");
    }

    // 3. Guardar la integración
    const gmailAddress = await getGmailAddress(tokens.access_token);
    const { error: upsertError } = await supabaseAdmin
      .from("email_integrations")
      .upsert({
        user_id: stateRow.user_id,
        gmail_address: gmailAddress,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        access_token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
        status: "active",
        last_error: null,
      });
    if (upsertError) throw upsertError;

    return redirectToApp("gmail=connected");
  } catch (err) {
    console.error("gmail-oauth-callback error:", err);
    return redirectToApp("gmail=error&reason=server_error");
  }
});
