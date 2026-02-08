-- ============================================================================
-- CMCB-XI DATABASE: CLEAN DATA (Limpeza pós-testes)
-- ============================================================================
-- Este script apaga o histórico de transações e logs, e zera os saldos.
-- Use com cuidado!

BEGIN;

-- 0. Permitir reset do Ledger (Bypass Immutability Trigger)
SET LOCAL app.allow_ledger_reset = 'on';

-- 1. Remover itens de transação
DELETE FROM public.transaction_items WHERE true;

-- 2. Remover registros de auditoria
DELETE FROM public.audit_logs WHERE true;

-- 3. Remover transações "front-end"
DELETE FROM public.transactions WHERE true;

-- 4. Remover transações do Ledger (AQUI ESTAVAM OS DADOS RESTANTES)
DELETE FROM public.ledger_transactions WHERE true;

-- 5. Remover auditoria do Ledger
DELETE FROM public.ledger_audit_log WHERE true;

-- 6. Resetar saldos de todas as contas para R$ 0,00
UPDATE public.accounts SET balance = 0 WHERE true;

-- 7. Resetar saldos de todos os estabelecimentos para R$ 0,00
UPDATE public.merchants SET balance = 0 WHERE true;

-- 8. Opcional: Remover estabelecimentos criados durante testes (preservando o schema)
-- DELETE FROM public.merchants WHERE created_at > '2026-02-06';

COMMIT;
