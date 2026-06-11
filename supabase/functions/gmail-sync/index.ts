// Worker de sincronización: lee correos bancarios nuevos de Gmail y los
// registra en imported_transactions como pendientes de revisión.
//
// Dos modos de invocación:
//  - Usuario ("Sincronizar ahora"): JWT de Supabase en Authorization → sincroniza solo su cuenta.
//  - Cron (pg_cron + pg_net): header x-cron-secret → sincroniza todas las integraciones activas.
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { getValidAccessToken, RevokedTokenError } from "../_shared/googleAuth.ts";
import { getBody, getHeader, getMessage, listMessages } from "../_shared/gmail.ts";
import { ALL_SENDERS, parseEmail } from "../_shared/parsers/index.ts";
import { llmParse } from "../_shared/parsers/llmFallback.ts";
import { normalizeBody } from "../_shared/parsers/common.ts";
import type { EmailIntegration } from "../_shared/types.ts";

const MAX_MESSAGES_PER_RUN = 25;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

interface SyncStats {
  user_id: string;
  fetched: number;
  imported: number;
  ignored: number;
  errors: number;
}

async function syncIntegration(integration: EmailIntegration): Promise<SyncStats> {
  const stats: SyncStats = {
    user_id: integration.user_id,
    fetched: 0,
    imported: 0,
    ignored: 0,
    errors: 0,
  };

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(integration);
  } catch (err) {
    if (err instanceof RevokedTokenError) {
      await supabaseAdmin
        .from("email_integrations")
        .update({ status: "revoked", last_error: err.message })
        .eq("user_id", integration.user_id);
    } else {
      await supabaseAdmin
        .from("email_integrations")
        .update({ status: "error", last_error: String(err) })
        .eq("user_id", integration.user_id);
    }
    stats.errors++;
    return stats;
  }

  // Gmail `after:` trabaja en segundos; restamos 1s para no perder mensajes
  // del mismo segundo del watermark (el dedup por message_id evita repetidos).
  const afterSeconds = Math.max(0, Math.floor(integration.last_internal_date_ms / 1000) - 1);
  const fromQuery = ALL_SENDERS.map((s) => `from:${s}`).join(" OR ");
  const query = `(${fromQuery}) after:${afterSeconds}`;

  const refs = await listMessages(accessToken, query, MAX_MESSAGES_PER_RUN);
  stats.fetched = refs.length;
  if (refs.length === 0) {
    await supabaseAdmin
      .from("email_integrations")
      .update({ last_synced_at: new Date().toISOString(), status: "active", last_error: null })
      .eq("user_id", integration.user_id);
    return stats;
  }

  // Pre-filtrar mensajes ya importados (la unique constraint es el respaldo)
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("imported_transactions")
    .select("gmail_message_id")
    .eq("user_id", integration.user_id)
    .in("gmail_message_id", refs.map((r) => r.id));
  if (existingError) throw existingError;
  const seen = new Set((existing ?? []).map((r) => r.gmail_message_id));

  let watermark = integration.last_internal_date_ms;
  let hadFailure = false;

  // Gmail devuelve más recientes primero; procesamos en orden cronológico
  // para que el watermark avance de forma segura.
  const newRefs = refs.filter((r) => !seen.has(r.id)).reverse();

  for (const ref of newRefs) {
    try {
      const message = await getMessage(accessToken, ref.id);
      const internalDateMs = Number(message.internalDate);
      const receivedAt = new Date(internalDateMs);
      const from = getHeader(message, "From");
      const subject = getHeader(message, "Subject");
      const body = getBody(message);

      const result = parseEmail(from, subject, body, receivedAt);
      if (!result) {
        // Remitente no reconocido (no debería pasar con el filtro from:)
        if (!hadFailure) watermark = Math.max(watermark, internalDateMs);
        continue;
      }

      let outcome = result.outcome;
      let parser: "regex" | "llm" | "none" = "regex";
      let confidence: "high" | "medium" | "low" = "high";

      if (outcome === null) {
        // Regex no entendió: fallback LLM
        const llmOutcome = await llmParse(
          result.bank,
          subject,
          normalizeBody(body),
          receivedAt,
        );
        outcome = llmOutcome;
        parser = llmOutcome === null ? "none" : "llm";
        confidence = "medium";
      }

      const base = {
        user_id: integration.user_id,
        gmail_message_id: ref.id,
        bank: result.bank,
        raw_subject: subject.slice(0, 200),
        raw_snippet: normalizeBody(body).slice(0, 300),
      };

      let row;
      if (outcome === "not-transaction" || outcome === null) {
        // No transaccional (OTP, rechazada) o imposible de entender:
        // se guarda igualmente para dedup permanente.
        row = {
          ...base,
          parser: outcome === null ? "none" : parser,
          confidence: "low",
          status: "ignored",
        };
        stats.ignored++;
      } else {
        row = {
          ...base,
          direction: outcome.direction,
          amount: outcome.amount,
          merchant: outcome.merchant,
          transaction_date: outcome.date,
          card_last4: outcome.cardLast4,
          parser,
          confidence,
          status: "pending",
        };
        stats.imported++;
      }

      const { error: insertError } = await supabaseAdmin
        .from("imported_transactions")
        .insert(row);
      // 23505 = unique_violation: otro run lo insertó primero, no es error real
      if (insertError && insertError.code !== "23505") throw insertError;

      if (!hadFailure) watermark = Math.max(watermark, internalDateMs);
    } catch (err) {
      // El watermark no avanza más allá del primer mensaje fallido:
      // se reintentará en el próximo run.
      console.error(`gmail-sync: error en mensaje ${ref.id}:`, err);
      hadFailure = true;
      stats.errors++;
    }
  }

  await supabaseAdmin
    .from("email_integrations")
    .update({
      last_internal_date_ms: watermark,
      last_synced_at: new Date().toISOString(),
      status: "active",
      last_error: null,
    })
    .eq("user_id", integration.user_id);

  return stats;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = Boolean(cronSecret) && req.headers.get("x-cron-secret") === cronSecret;

    let integrations: EmailIntegration[];

    if (isCron) {
      // Modo cron: todas las integraciones activas
      const { data, error } = await supabaseAdmin
        .from("email_integrations")
        .select("*")
        .in("status", ["active", "error"]);
      if (error) throw error;
      integrations = data ?? [];
    } else {
      // Modo usuario: validar JWT y sincronizar solo su integración
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: JSON_HEADERS,
        });
      }

      const { data, error } = await supabaseAdmin
        .from("email_integrations")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      integrations = data ?? [];
      if (integrations.length === 0) {
        return new Response(
          JSON.stringify({ error: "Gmail no está conectado" }),
          { status: 404, headers: JSON_HEADERS },
        );
      }
    }

    const results: SyncStats[] = [];
    for (const integration of integrations) {
      results.push(await syncIntegration(integration));
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("gmail-sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
