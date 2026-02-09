-- ============================================================================
-- FIX: Corrigir transações de mensalidade com source/destination invertidos
-- ============================================================================
-- Problema: As transações de mensalidade foram registradas com:
--   - source_account = cash/pix_bb (errado)
--   - destination_account = NULL (errado)
-- Deveria ser:
--   - source_account = ext:income
--   - destination_account = cash/pix_bb
--
-- Bug adicional: função block_ledger_mutations retornava NULL (cancela operação)
-- em vez de NEW (permite operação) quando bypass estava ativo.
-- ============================================================================

-- PASSO 1: Corrigir a função de bloqueio (bug: retornava NULL em vez de NEW)
CREATE OR REPLACE FUNCTION public.block_ledger_mutations() 
RETURNS trigger 
LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('app.allow_ledger_reset', true) = 'on' THEN 
    RETURN NEW;  -- Permite a operação quando bypass está ativo
  END IF;
  RAISE EXCEPTION 'ledger_transactions is immutable (no UPDATE/DELETE allowed)';
END; 
$$;

-- PASSO 2: Ativar bypass e corrigir dados
SET LOCAL app.allow_ledger_reset = 'on';

-- Corrigir transações de mensalidade (dinheiro)
UPDATE ledger_transactions
SET source_account = 'ext:income', destination_account = 'cash'
WHERE metadata->>'modulo' = 'mensalidade'
AND source_account = 'cash' AND destination_account IS NULL;

-- Corrigir transações de mensalidade PIX
UPDATE ledger_transactions
SET source_account = 'ext:income', destination_account = 'pix_bb'
WHERE metadata->>'modulo' = 'mensalidade_pix'
AND source_account = 'pix_bb' AND destination_account IS NULL;

-- Desativar bypass
RESET app.allow_ledger_reset;

-- Verificar resultado
SELECT * FROM ledger_balances WHERE account_id IN ('cash', 'pix_bb');
