-- Categoría para gastos (principalmente variables/hormiga)
alter table public.expenses
  add column if not exists category text
  check (category in ('food','transport','shopping','fun','travel','other'));

-- Meta de ahorro del usuario (NULL = sin meta definida)
alter table public.profiles
  add column if not exists savings_goal numeric
  check (savings_goal is null or savings_goal > 0);
