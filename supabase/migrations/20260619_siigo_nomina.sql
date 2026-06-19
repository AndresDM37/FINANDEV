-- =============================================
-- FinanDev — Soporte de nómina (Siigo) en imported_transactions
-- Amplía el CHECK de `bank` para incluir el origen 'siigo'.
-- =============================================

alter table public.imported_transactions
  drop constraint if exists imported_transactions_bank_check;

alter table public.imported_transactions
  add constraint imported_transactions_bank_check
  check (bank in ('bancolombia', 'nu', 'nequi', 'siigo'));
