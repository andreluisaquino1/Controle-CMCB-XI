-- ============================================================================
-- CMCB-XI DATABASE: CLEAN DATA (Limpeza pós-testes)
-- ============================================================================
-- Este script apaga o histórico de transações e logs, e zera os saldos.
-- Use com cuidado!

BEGIN;

-- 1. Remover itens de transação
DELETE FROM public.transaction_items;

-- 2. Remover registros de auditoria
DELETE FROM public.audit_logs;

-- 3. Remover todas as transações
DELETE FROM public.transactions;

-- 4. Resetar saldos de todas as contas para R$ 0,00
UPDATE public.accounts SET balance = 0;

-- 5. Resetar saldos de todos os estabelecimentos para R$ 0,00
UPDATE public.merchants SET balance = 0;

-- 6. Opcional: Remover estabelecimentos criados durante testes (preservando o schema)
-- DELETE FROM public.merchants WHERE created_at > '2026-02-06';

COMMIT;
