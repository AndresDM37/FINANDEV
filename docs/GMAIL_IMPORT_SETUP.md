# Guía de despliegue: Importación de correos del banco (Gmail)

Esta guía cubre los pasos **manuales** que tienes que hacer una sola vez para activar
la lectura automática de correos de Bancolombia, Nu y Nequi. Todo el código ya está
en el repo (`supabase/functions/`, `supabase/migrations/`, frontend).

---

## Paso 1: Proyecto en Google Cloud (≈15 min)

1. Ve a [console.cloud.google.com](https://console.cloud.google.com) y crea un proyecto (ej. `finandev`).
2. **APIs y servicios → Biblioteca** → busca **Gmail API** → Habilitar.
3. **APIs y servicios → Pantalla de consentimiento OAuth**:
   - Tipo de usuario: **Externo**.
   - Nombre de la app: FinanDev. Correo de soporte: el tuyo.
   - Scopes: agrega `https://www.googleapis.com/auth/gmail.readonly`.
   - ⚠️ **CRÍTICO**: cuando termines, cambia el estado de publicación de "Testing" a
     **"In production"** (botón "Publicar la app"). Si queda en Testing, los refresh
     tokens **expiran a los 7 días** y la integración muere en silencio cada semana.
     La app quedará "sin verificar" — no importa, solo la usas tú: en el consentimiento
     haz clic en "Avanzado → Ir a FinanDev (no seguro)".
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth**:
   - Tipo: **Aplicación web**.
   - URIs de redireccionamiento autorizados:
     `https://<TU-PROJECT-REF>.supabase.co/functions/v1/gmail-oauth-callback`
     (el project-ref está en la URL de tu dashboard de Supabase).
   - Guarda el **Client ID** y el **Client Secret**.

## Paso 2: Vincular el CLI de Supabase y aplicar la migración

```powershell
# Instalar el CLI si no lo tienes (con scoop: scoop install supabase)
npx supabase login
npx supabase link --project-ref <TU-PROJECT-REF>

# Aplicar la migración nueva (o copia/pega supabase/migrations/20260611_gmail_import.sql
# en el SQL Editor del dashboard, como hiciste con migration.sql)
npx supabase db push
```

## Paso 3: Secrets de las Edge Functions

```powershell
npx supabase secrets set GOOGLE_CLIENT_ID="<client id>"
npx supabase secrets set GOOGLE_CLIENT_SECRET="<client secret>"
npx supabase secrets set ANTHROPIC_API_KEY="<tu api key de console.anthropic.com>"
npx supabase secrets set CRON_SECRET="<genera uno: [guid]::NewGuid().ToString()>"
npx supabase secrets set APP_URL="https://<tu-app>.vercel.app"
```

Y en el frontend (`.env.local` local y variables de entorno en Vercel):

```
VITE_GOOGLE_CLIENT_ID=<client id>
```

## Paso 4: Desplegar las Edge Functions

```powershell
npx supabase functions deploy gmail-oauth-callback
npx supabase functions deploy gmail-sync
```

El `supabase/config.toml` ya marca ambas con `verify_jwt = false`
(el callback lo llama Google sin JWT; el sync valida JWT o `x-cron-secret` en el código).

## Paso 5: Conectar Gmail desde la app

1. Despliega el frontend (`git push` → Vercel) con `VITE_GOOGLE_CLIENT_ID` configurado.
2. Entra a la app → **Config** → card **"Conexión con Gmail"** → **Conectar Gmail**.
3. Acepta el consentimiento de Google (clic en "Avanzado" si avisa que no está verificada).
4. Deberías volver a `/admin?gmail=connected` y ver tu correo conectado.
5. Pulsa **"Sincronizar ahora"** y revisa la pestaña **Correos**.

## Paso 6: Programar el cron (cada 15 min)

En el **SQL Editor** del dashboard de Supabase:

```sql
-- 1. Habilitar extensiones (Dashboard → Database → Extensions también sirve)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Guardar el cron secret en el Vault (mismo valor que el secret CRON_SECRET)
select vault.create_secret('<EL MISMO CRON_SECRET>', 'cron_secret');

-- 3. Programar la sincronización
select cron.schedule(
  'gmail-sync-every-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<TU-PROJECT-REF>.supabase.co/functions/v1/gmail-sync',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode":"cron"}'::jsonb
  )
  $$
);
```

Verificar que corre: `select * from cron.job_run_details order by start_time desc limit 5;`

---

## Validación de los parsers con correos reales (IMPORTANTE)

Los patrones regex de `supabase/functions/_shared/parsers/` están basados en los
formatos típicos de cada banco, y los fixtures actuales son **sintéticos**. Antes de
confiar en ellos:

1. Busca en tu Gmail 5–10 correos reales de cada banco (compra, retiro, transferencia,
   rechazada, OTP).
2. **Confirma los remitentes reales** y ajusta las listas `senders` en
   `bancolombia.ts` / `nequi.ts` / `nu.ts` si difieren.
3. Copia el texto (sanitizado) a los archivos de `fixtures/` reemplazando los sintéticos.
4. Corre los tests: `npx -y deno test --allow-read supabase/functions/_shared/parsers/`
5. Si un formato no lo entiende el regex, no pasa nada: cae al fallback LLM
   (claude-haiku-4-5) y se importa con confianza "Media".

Nota: Nu Colombia puede notificar principalmente por push de la app y no por correo —
verifica qué te llega realmente antes de invertir más en su parser.

## Desarrollo local de las funciones

```powershell
# Crear supabase/functions/.env.local con los mismos secrets
npx supabase functions serve gmail-sync --env-file supabase/functions/.env.local
```

## Solución de problemas

| Síntoma | Causa probable |
|---|---|
| `gmail=error&reason=no_refresh_token` | Google no devolvió refresh token: revoca el acceso en [myaccount.google.com/permissions](https://myaccount.google.com/permissions) y vuelve a conectar |
| Estado "Revocado" en Admin | Revocaste el acceso en Google, o la app quedó en "Testing" y el token expiró a los 7 días → publicar a producción y reconectar |
| Sync no trae nada | Verifica los remitentes reales de tus correos vs las listas `senders` |
| Cron no corre | `select * from cron.job_run_details` para ver errores; verifica el secret del Vault |
