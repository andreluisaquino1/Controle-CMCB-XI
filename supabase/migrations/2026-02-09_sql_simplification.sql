-- Migration: Simplificação SQL e Remoção de Legado
-- Data: 2026-02-09

BEGIN;

-- 1. Remover RPCs legadas
DROP FUNCTION IF EXISTS public.process_transaction(jsonb);
DROP FUNCTION IF EXISTS public.process_resource_transaction(jsonb);
DROP FUNCTION IF EXISTS public.process_pix_fee_batch(uuid, jsonb);

-- 2. Atualizar função de anulação (Void) para o Ledger
CREATE OR REPLACE FUNCTION public.void_transaction(p_id uuid, p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_before jsonb; v_txn record; v_user_id uuid; BEGIN
    v_user_id := auth.uid();
    -- Moderadores (admin/user) podem anular
    IF NOT public.check_can_moderate_ledger() THEN 
        RAISE EXCEPTION 'Unauthorized'; 
    END IF;
    
    SELECT to_jsonb(t) INTO v_before FROM public.ledger_transactions t WHERE id = p_id FOR UPDATE;
    IF v_before IS NULL THEN RAISE EXCEPTION 'Transaction not found in ledger'; END IF;
    IF (v_before->>'status') = 'voided' THEN RAISE EXCEPTION 'Already voided'; END IF;
    
    UPDATE public.ledger_transactions SET status = 'voided', metadata = metadata || jsonb_build_object('void_reason', p_reason, 'voided_at', now(), 'voided_by', v_user_id) WHERE id = p_id RETURNING * INTO v_txn;
    
    INSERT INTO public.ledger_audit_log (actor, action, entity, entity_id, before, after) 
    VALUES (v_user_id, 'VOID_LEDGER', 'ledger_transactions', p_id::text, v_before, to_jsonb(v_txn));
    
    RETURN to_jsonb(v_txn);
END; $$;

-- 3. Função de Reset Nuclear (Apenas Admins)
CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Permitir apenas para administradores
    IF NOT public.is_admin() THEN 
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem resetar os dados do sistema.'; 
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
END; $$;

-- 4. Atualizar gatilho de imutabilidade para permitir anulação
CREATE OR REPLACE FUNCTION public.block_ledger_mutations() RETURNS trigger LANGUAGE plpgsql AS $$
begin
  if current_setting('app.allow_ledger_reset', true) = 'on' then return new; end if;
  if (TG_OP = 'UPDATE') then
    if (old.* IS DISTINCT FROM new.*) then
       if (old.status = 'pending' AND new.status = 'validated') OR (old.status IN ('pending', 'validated') AND new.status = 'voided') then
          return new;
       end if;
       raise exception 'ledger_transactions is immutable. Only status transitions are allowed.';
    end if;
    return new;
  end if;
  raise exception 'ledger_transactions is immutable (no DELETE allowed)';
end; $$;

-- 5. Marcar coluna balance como depreciada
COMMENT ON COLUMN public.accounts.balance IS 'DEPRECATED: Use ledger_balances view instead.';
COMMENT ON COLUMN public.merchants.balance IS 'DEPRECATED: Use ledger_balances view instead.';

COMMIT;
