-- ============================================================================
-- NUCLEAR CLEANUP (v2): Absolute Reset
-- ============================================================================
-- Se o script anterior deixou 4 registros, use este que utiliza TRUNCATE.
-- CERTIFIQUE-SE DE QUE TODO O TEXTO ESTÁ SELECIONADO ANTES DE CLICAR EM 'RUN'.

DO $$ 
BEGIN
  -- 1. Desabilitar restrições temporariamente
  SET LOCAL app.allow_ledger_reset = 'on';

  -- 2. Limpar tabelas usando TRUNCATE (mais rápido e reseta IDs)
  TRUNCATE TABLE 
    public.ledger_audit_log,
    public.ledger_transactions,
    public.transaction_items,
    public.audit_logs,
    public.transactions
  RESTART IDENTITY CASCADE;

  -- 3. Resetar saldos
  UPDATE public.accounts SET balance = 0;
  UPDATE public.merchants SET balance = 0;

  RAISE NOTICE 'Limpeza concluída com sucesso.';
END $$;

-- VERIFICAÇÃO FINAL
SELECT 'Ledger' as tabela, count(*) FROM public.ledger_transactions
UNION ALL
SELECT 'Transações' as tabela, count(*) FROM public.transactions
UNION ALL
SELECT 'Itens' as tabela, count(*) FROM public.transaction_items;
