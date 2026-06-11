import { createClient } from "npm:@supabase/supabase-js@2";

// Cliente con service role: salta RLS. Solo para uso en Edge Functions.
export const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);
