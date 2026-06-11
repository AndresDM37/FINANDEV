-- Nombre de la meta de ahorro (ej. "Viaje a Japón")
alter table public.profiles
  add column if not exists savings_goal_name text;
