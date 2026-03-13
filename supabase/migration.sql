-- =============================================
-- FinanDev — Supabase Database Schema
-- Ejecutar en el SQL Editor de Supabase
-- =============================================

-- 1. Tabla de perfiles (se crea automáticamente al registrar usuario)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  savings_percentage int not null default 20,
  created_at timestamptz not null default now()
);

-- 2. Tabla de ingresos
create table if not exists public.incomes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  received_at date not null default current_date,
  source text not null,
  created_at timestamptz not null default now()
);

-- 3. Tabla de gastos
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric not null check (amount > 0),
  type text not null check (type in ('fixed', 'variable')),
  due_day int check (due_day >= 1 and due_day <= 31),
  expense_date date,
  recurring boolean not null default false,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. Tabla de movimientos de ahorro
create table if not exists public.savings_movements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  type text not null check (type in ('auto', 'manual', 'withdraw')),
  note text not null default '',
  created_at timestamptz not null default now()
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- incomes
alter table public.incomes enable row level security;
create policy "Users can manage own incomes"
  on public.incomes for all
  using (auth.uid() = user_id);

-- expenses
alter table public.expenses enable row level security;
create policy "Users can manage own expenses"
  on public.expenses for all
  using (auth.uid() = user_id);

-- savings_movements
alter table public.savings_movements enable row level security;
create policy "Users can manage own savings_movements"
  on public.savings_movements for all
  using (auth.uid() = user_id);

-- =============================================
-- Trigger: crear perfil automáticamente al signup
-- =============================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
