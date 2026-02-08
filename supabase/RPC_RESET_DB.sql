-- ============================================================================
-- RPC: RESET ALL DATA
-- ============================================================================
-- Execute este script no SQL Editor do Supabase para criar a função de reset.
-- Depois de criada, a aplicação poderá chamar supabase.rpc('reset_all_data')

CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF current_setting('request.jwt.claim.role', true) != 'authenticated' THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- 0. Permitir reset do Ledger (Bypass Immutability Trigger)
  PERFORM set_config('app.allow_ledger_reset', 'on', true);

  -- 1. Limpeza Forçada (Nuclear Option)
  -- TRUNCATE ignora triggers de row-level e é mais eficiente
  -- CASCADE garante que dependências (items, logs) também sejam apagadas
  TRUNCATE TABLE 
    public.ledger_audit_log,
    public.audit_logs,
    public.transaction_items,
    public.ledger_transactions,
    public.transactions
  RESTART IDENTITY CASCADE;

  -- 2. Resetar saldos
  UPDATE public.accounts SET balance = 0 WHERE true;
  UPDATE public.merchants SET balance = 0 WHERE true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_all_data() TO authenticated;
