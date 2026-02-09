-- Migration: Unificar Resumos com o Ledger
-- Data: 2026-02-09

BEGIN;

-- 1. Atualizar schema da ledger_transactions
ALTER TABLE public.ledger_transactions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('pending', 'validated', 'voided')),
ADD COLUMN IF NOT EXISTS module public.transaction_module,
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.entities(id),
ADD COLUMN IF NOT EXISTS payment_method public.payment_method;

-- 2. Atualizar funções de resumo para ler do Ledger
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(start_date date, end_date date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE result jsonb; weekly_expenses_cash numeric := 0; weekly_expenses_pix numeric := 0; weekly_entries_cash numeric := 0; weekly_entries_pix numeric := 0; weekly_deposits numeric := 0; weekly_consumption numeric := 0; weekly_direct_pix numeric := 0; BEGIN
  SELECT 
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount_cents::numeric/100 ELSE 0 END), 0), 
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount_cents::numeric/100 ELSE 0 END), 0), 
    COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'cash' THEN amount_cents::numeric/100 ELSE 0 END), 0), 
    COALESCE(SUM(CASE WHEN (module = 'mensalidade' AND payment_method = 'pix') OR module = 'mensalidade_pix' THEN amount_cents::numeric/100 ELSE 0 END), 0), 
    COALESCE(SUM(CASE WHEN module = 'aporte_saldo' THEN amount_cents::numeric/100 ELSE 0 END), 0), 
    COALESCE(SUM(CASE WHEN module = 'consumo_saldo' THEN amount_cents::numeric/100 ELSE 0 END), 0), 
    COALESCE(SUM(CASE WHEN module = 'pix_direto_uecx' THEN amount_cents::numeric/100 ELSE 0 END), 0)
  INTO weekly_expenses_cash, weekly_expenses_pix, weekly_entries_cash, weekly_entries_pix, weekly_deposits, weekly_consumption, weekly_direct_pix 
  FROM ledger_transactions 
  WHERE created_at::date >= start_date AND created_at::date <= end_date AND status = 'validated';
  
  RETURN jsonb_build_object('weeklyExpensesCash', weekly_expenses_cash, 'weeklyExpensesPix', weekly_expenses_pix, 'weeklyEntriesCash', weekly_entries_cash, 'weeklyEntriesPix', weekly_entries_pix, 'weeklyDeposits', weekly_deposits, 'weeklyConsumption', weekly_consumption, 'weeklyDirectPix', weekly_direct_pix);
END; $$;

CREATE OR REPLACE FUNCTION public.get_report_summary(p_start_date date, p_end_date date, p_entity_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cd_id text; v_pix_id text; v_summary record; BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  SELECT id::text INTO v_cd_id FROM accounts WHERE entity_id = p_entity_id AND name = 'Conta Digital (Escolaweb)' LIMIT 1;
  SELECT id::text INTO v_pix_id FROM accounts WHERE entity_id = p_entity_id AND name = 'PIX (Conta BB)' LIMIT 1;
  
  SELECT 
    COALESCE(SUM(CASE WHEN t.module = 'gasto_associacao' AND t.payment_method = 'cash' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as expenses_cash, 
    COALESCE(SUM(CASE WHEN t.module = 'gasto_associacao' AND t.payment_method = 'pix' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as expenses_pix, 
    COALESCE(SUM(CASE WHEN (c.category = 'transfer' OR t.module = 'conta_digital_taxa') AND t.source_account = v_cd_id THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as expenses_digital, 
    COALESCE(SUM(CASE WHEN t.module = 'taxa_pix_bb' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as pix_fees, 
    COALESCE(SUM(CASE WHEN t.module = 'mensalidade' AND t.payment_method = 'cash' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as entries_cash, 
    COALESCE(SUM(CASE WHEN (t.module = 'mensalidade' AND t.payment_method = 'pix') OR t.module = 'mensalidade_pix' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as entries_pix, 
    COALESCE(SUM(CASE WHEN t.module = 'pix_nao_identificado' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as entries_pix_nao_identificado, 
    COALESCE(SUM(CASE WHEN t.module = 'aporte_saldo' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as deposits, 
    COALESCE(SUM(CASE WHEN t.module = 'consumo_saldo' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as consumption, 
    COALESCE(SUM(CASE WHEN t.module = 'pix_direto_uecx' THEN t.amount_cents::numeric/100 ELSE 0 END), 0) as direct_pix
  INTO v_summary 
  FROM ledger_transactions t 
  JOIN transaction_modules_config c ON c.module_key = t.module 
  WHERE t.created_at::date >= p_start_date AND t.created_at::date <= p_end_date AND status = 'validated' AND t.entity_id = p_entity_id;
  
  RETURN jsonb_build_object('weeklyExpensesCash', v_summary.expenses_cash, 'weeklyExpensesPix', v_summary.expenses_pix, 'weeklyExpensesDigital', v_summary.expenses_digital, 'weeklyPixFees', v_summary.pix_fees, 'weeklyEntriesCash', v_summary.entries_cash, 'weeklyEntriesPix', v_summary.entries_pix, 'weeklyEntriesPixNaoIdentificado', v_summary.entries_pix_nao_identificado, 'weeklyDeposits', v_summary.deposits, 'weeklyConsumption', v_summary.consumption, 'weeklyDirectPix', v_summary.direct_pix);
END; $$;

COMMIT;
