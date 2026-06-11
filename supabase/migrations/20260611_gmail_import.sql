-- =============================================
-- FinanDev — Importación de transacciones desde Gmail
-- Ejecutar en el SQL Editor de Supabase (o supabase db push)
-- =============================================

-- 1. Integración Gmail por usuario (tokens OAuth + estado de sincronización)
--    RLS habilitado SIN políticas: solo accesible con service role (Edge Functions).
create table if not exists public.email_integrations (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  gmail_address text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_internal_date_ms bigint not null default 0,
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.email_integrations enable row level security;
-- Sin políticas a propósito: los clientes no pueden leer tokens.

-- 2. Nonces para el flujo OAuth (anti-CSRF)
create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

alter table public.oauth_states enable row level security;
create policy "Users can insert own oauth_states"
  on public.oauth_states for insert
  with check (auth.uid() = user_id);
-- Solo INSERT: el callback los consume con service role.

-- 3. Transacciones importadas de correos bancarios (cola de revisión)
create table if not exists public.imported_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  gmail_message_id text not null,
  bank text not null check (bank in ('bancolombia', 'nu', 'nequi')),
  direction text not null default 'expense' check (direction in ('expense', 'income')),
  amount numeric,
  merchant text,
  transaction_date date,
  card_last4 text,
  raw_subject text not null default '',
  raw_snippet text not null default '',
  parser text not null check (parser in ('regex', 'llm', 'none')),
  confidence text not null default 'low' check (confidence in ('high', 'medium', 'low')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'ignored')),
  expense_id uuid references public.expenses(id) on delete set null,
  income_id uuid references public.incomes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);

alter table public.imported_transactions enable row level security;
create policy "Users can manage own imported_transactions"
  on public.imported_transactions for all
  using (auth.uid() = user_id);

create index if not exists imported_transactions_pending_idx
  on public.imported_transactions (user_id, status);

-- =============================================
-- Vista de estado de la integración (sin tokens) para el frontend
-- =============================================

create or replace view public.email_integration_status
with (security_invoker = off) as
  select user_id, gmail_address, last_synced_at, status, last_error
  from public.email_integrations
  where user_id = auth.uid();

-- La vista corre como security definer (owner) para saltar el deny-all de la
-- tabla base, pero el WHERE auth.uid() garantiza que cada usuario solo ve lo suyo.
grant select on public.email_integration_status to authenticated;

-- =============================================
-- RPC: desconectar Gmail (borra tokens del usuario autenticado)
-- =============================================

create or replace function public.disconnect_gmail()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.email_integrations where user_id = auth.uid();
end;
$$;

revoke all on function public.disconnect_gmail() from public;
grant execute on function public.disconnect_gmail() to authenticated;

-- =============================================
-- Limpieza de nonces viejos (se reutiliza en cada callback, no necesita cron)
-- =============================================

create or replace function public.cleanup_oauth_states()
returns void
language sql
security definer set search_path = ''
as $$
  delete from public.oauth_states where created_at < now() - interval '10 minutes';
$$;
