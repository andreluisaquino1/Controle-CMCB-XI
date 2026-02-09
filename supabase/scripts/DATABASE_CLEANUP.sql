-- ============================================================================
-- DATABASE CLEANUP UTILITIES
-- ============================================================================
-- Este arquivo contém scripts para limpar dados e resetar o banco de dados.

-- ----------------------------------------------------------------------------
-- OPÇÃO 1: SCRIPT MANUAL (Para execução direta no SQL Editor)
-- ----------------------------------------------------------------------------
/*
BEGIN;
  -- Bypass Immutability Trigger
  SET LOCAL app.allow_ledger_reset = 'on';

  DELETE FROM public.transaction_items WHERE true;
  DELETE FROM public.audit_logs WHERE true;
  DELETE FROM public.transactions WHERE true;
  DELETE FROM public.ledger_transactions WHERE true;
  DELETE FROM public.ledger_audit_log WHERE true;

  UPDATE public.accounts SET balance = 0 WHERE true;
  UPDATE public.merchants SET balance = 0 WHERE true;
COMMIT;
*/

-- ----------------------------------------------------------------------------
-- OPÇÃO 2: STORED PROCEDURE (RPC)
-- Permite reset via aplicação: supabase.rpc('reset_all_data')
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário pode moderar o ledger (admin/usuário)
  IF NOT public.check_can_moderate_ledger() THEN
    RAISE EXCEPTION 'Acesso negado: Somente administradores ou usuários autorizados podem resetar os dados.';
  END IF;

  -- Bypass Immutability Trigger
  PERFORM set_config('app.allow_ledger_reset', 'on', true);

  -- Limpeza rápida com TRUNCATE CASCADE
  TRUNCATE TABLE 
    public.ledger_audit_log,
    public.audit_logs,
    public.transaction_items,
    public.ledger_transactions,
    public.transactions
  RESTART IDENTITY CASCADE;

  -- Zerar saldos legados (redundância para segurança)
  UPDATE public.accounts SET balance = 0 WHERE true;
  UPDATE public.merchants SET balance = 0 WHERE true;
  
  -- Resetar bypass
  PERFORM set_config('app.allow_ledger_reset', 'off', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_all_data() TO authenticated;
