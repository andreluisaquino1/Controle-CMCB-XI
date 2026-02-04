-- SCRIPT DE RESET TOTAL DE DADOS (CMCB-XI)
-- Use este script para apagar todo o histórico de transações e zerar os saldos.
-- Execute no SQL Editor do Supabase.

BEGIN;

-- 1. Remover registros de auditoria
DELETE FROM public.audit_logs;

-- 2. Remover todas as transações (Histórico de todas as páginas)
DELETE FROM public.transactions;

-- 3. Resetar saldos de todas as contas (Associação, UE e CX) para R$ 0,00
UPDATE public.accounts SET balance = 0;

-- 4. Resetar saldos de todos os estabelecimentos para R$ 0,00
UPDATE public.merchants SET balance = 0;

COMMIT;
