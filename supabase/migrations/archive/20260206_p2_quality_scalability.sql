-- Migration: Block P2 — Quality, Scalability and Performance
-- Phase 2.1: Transaction Module Configuration

-- 1. Create Config Table
CREATE TABLE IF NOT EXISTS public.transaction_modules_config (
    module_key public.transaction_module PRIMARY KEY,
    label text NOT NULL,
    category text NOT NULL CHECK (category IN ('entry', 'expense', 'transfer', 'adjustment', 'neutral')),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. Seed Data
INSERT INTO public.transaction_modules_config (module_key, label, category)
VALUES 
    ('mensalidade', 'Mensalidade', 'entry'),
    ('gasto_associacao', 'Despesa Associação', 'expense'),
    ('assoc_transfer', 'Movimentação Associação', 'transfer'),
    ('especie_transfer', 'Movimentação entre Contas', 'transfer'),
    ('especie_deposito_pix', 'Depósito PIX', 'transfer'),
    ('especie_ajuste', 'Ajuste de Saldo (Espécie)', 'adjustment'),
    ('pix_ajuste', 'Ajuste de Saldo (PIX)', 'adjustment'),
    ('cofre_ajuste', 'Ajuste de Saldo (Cofre)', 'adjustment'),
    ('conta_digital_ajuste', 'Ajuste Conta Digital', 'adjustment'),
    ('conta_digital_taxa', 'Taxa Escolaweb', 'expense'),
    ('consumo_saldo', 'Gasto Estabelecimento', 'expense'),
    ('pix_direto_uecx', 'Gasto de Recurso', 'expense'),
    ('aporte_saldo', 'Depósito em Estabelecimento', 'transfer'),
    ('aporte_estabelecimento_recurso', 'Aporte em Estabelecimento (Recurso)', 'transfer')
ON CONFLICT (module_key) DO UPDATE 
SET label = EXCLUDED.label, category = EXCLUDED.category;

-- Phase 2.2: Standard Voiding RPC
CREATE OR REPLACE FUNCTION public.void_transaction(p_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_txn public.transactions;
  v_user_id uuid;
BEGIN
  -- 1. Security Check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not authenticated';
  END IF;
  
  IF NOT public.is_active_user(v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not active';
  END IF;

  -- 2. Get Transaction and Validate
  SELECT * INTO v_txn FROM public.transactions WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_txn.status = 'voided' THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  -- 3. Atomically Reverse Balances
  
  -- Account Effects (Reversed)
  IF v_txn.direction = 'in' THEN
    UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.destination_account_id;
  ELSIF v_txn.direction = 'out' THEN
    UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.source_account_id;
  ELSIF v_txn.direction = 'transfer' THEN
    UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.source_account_id;
    UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.destination_account_id;
  END IF;

  -- Merchant Effects (Reversed)
  IF v_txn.merchant_id IS NOT NULL THEN
    IF v_txn.module = 'aporte_saldo' THEN
      UPDATE public.merchants SET balance = balance - v_txn.amount WHERE id = v_txn.merchant_id;
    ELSIF v_txn.module = 'consumo_saldo' THEN
      UPDATE public.merchants SET balance = balance + v_txn.amount WHERE id = v_txn.merchant_id;
    END IF;
  END IF;

  -- 4. Update Status
  UPDATE public.transactions SET status = 'voided' WHERE id = p_id RETURNING * INTO v_txn;

  -- 5. Audit Log
  INSERT INTO public.audit_logs (
    transaction_id, action, before_json, after_json, reason, user_id
  ) VALUES (
    p_id, 'void', row_to_json(v_txn)::jsonb, row_to_json(v_txn)::jsonb, p_reason, v_user_id
  );

  RETURN row_to_json(v_txn);
END;
$$;

-- Phase 2.3: Resource Transaction RPC (UE/CX)
CREATE OR REPLACE FUNCTION public.process_resource_transaction(p_tx jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_id uuid;
  v_account_name text;
  v_entity_type text;
  v_user_id uuid;
BEGIN
  -- 1. Security Check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not authenticated';
  END IF;
  
  IF NOT public.is_active_user(v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not active';
  END IF;

  -- 2. Validate Account Type (Must belong to UE or CX)
  v_account_id := (p_tx->>'source_account_id')::uuid;
  
  SELECT a.name, e.type INTO v_account_name, v_entity_type
  FROM public.accounts a
  JOIN public.entities e ON e.id = a.entity_id
  WHERE a.id = v_account_id;

  IF v_entity_type NOT IN ('ue', 'cx') THEN
    RAISE EXCEPTION 'Access Denied: Account does not belong to Resource entities (UE/CX)';
  END IF;

  -- 3. Delegate to main processor
  -- This ensures logic is centralized in process_transaction
  RETURN public.process_transaction(p_tx);
END;
$$;

-- Phase 2.1: Update get_report_summary to use config table
CREATE OR REPLACE FUNCTION public.get_report_summary(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_assoc_id uuid;
  v_cd_id uuid;
  v_summary record;
BEGIN
  -- Security check
  IF NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_assoc_id FROM entities WHERE type = 'associacao' LIMIT 1;
  SELECT id INTO v_cd_id FROM accounts WHERE entity_id = v_assoc_id AND name = 'Conta Digital (Escolaweb)' LIMIT 1;

  SELECT 
    COALESCE(SUM(CASE WHEN t.module = 'gasto_associacao' AND t.payment_method = 'cash' THEN t.amount ELSE 0 END), 0) as expenses_cash,
    COALESCE(SUM(CASE WHEN t.module = 'gasto_associacao' AND t.payment_method = 'pix' THEN t.amount ELSE 0 END), 0) as expenses_pix,
    COALESCE(SUM(CASE 
      WHEN (c.category = 'transfer' OR t.module = 'conta_digital_taxa') 
           AND t.source_account_id = v_cd_id
      THEN t.amount ELSE 0 END), 0) as expenses_digital,
    COALESCE(SUM(CASE WHEN t.module = 'mensalidade' AND t.payment_method = 'cash' THEN t.amount ELSE 0 END), 0) as entries_cash,
    COALESCE(SUM(CASE WHEN t.module = 'mensalidade' AND t.payment_method = 'pix' THEN t.amount ELSE 0 END), 0) as entries_pix,
    COALESCE(SUM(CASE WHEN t.module = 'aporte_saldo' THEN t.amount ELSE 0 END), 0) as deposits,
    COALESCE(SUM(CASE WHEN t.module = 'consumo_saldo' THEN t.amount ELSE 0 END), 0) as consumption,
    COALESCE(SUM(CASE WHEN t.module = 'pix_direto_uecx' THEN t.amount ELSE 0 END), 0) as direct_pix
  INTO v_summary
  FROM transactions t
  JOIN transaction_modules_config c ON c.module_key = t.module
  WHERE transaction_date >= p_start_date
    AND transaction_date <= p_end_date
    AND status = 'posted'
    AND t.entity_id = v_assoc_id;
  
  result := jsonb_build_object(
    'weeklyExpensesCash', v_summary.expenses_cash,
    'weeklyExpensesPix', v_summary.expenses_pix,
    'weeklyExpensesDigital', v_summary.expenses_digital,
    'weeklyEntriesCash', v_summary.entries_cash,
    'weeklyEntriesPix', v_summary.entries_pix,
    'weeklyDeposits', v_summary.deposits,
    'weeklyConsumption', v_summary.consumption,
    'weeklyDirectPix', v_summary.direct_pix
  );
  
  RETURN result;
END;
$$;

-- Phase 2.4: Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_entity_date ON public.transactions (entity_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_source_acc ON public.transactions (source_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dest_acc ON public.transactions (destination_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_module ON public.transactions (module);
CREATE INDEX IF NOT EXISTS idx_transactions_direction ON public.transactions (direction);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);

-- Permissions
REVOKE EXECUTE ON FUNCTION public.void_transaction(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_resource_transaction(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.process_resource_transaction(jsonb) TO authenticated;
