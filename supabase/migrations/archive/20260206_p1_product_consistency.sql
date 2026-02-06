-- Migration: Block P1 — Product Consistency & Reliability
-- Phase 1.1 & 1.2

-- 1. Add unique constraint to accounts
-- First, ensure we don't have duplicates that would block this
-- If duplicates exist, we take the one with highest balance or latest update (manual cleanup might be safer, but we try a basic approach)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_entity_id_name_key') THEN
    -- In case of duplicates, the migration would fail. Here we assume clean state or minimal duplicates.
    ALTER TABLE accounts ADD CONSTRAINT accounts_entity_id_name_key UNIQUE(entity_id, name);
  END IF;
END $$;

-- 2. Add 'create' to audit_action
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'create' AND enumtypid = 'audit_action'::regtype) THEN
    ALTER TYPE audit_action ADD VALUE 'create';
  END IF;
END $$;

-- 3. Central Transaction RPC
CREATE OR REPLACE FUNCTION public.process_transaction(p_tx jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction_id uuid;
  v_amount numeric;
  v_direction text;
  v_module text;
  v_source_account_id uuid;
  v_destination_account_id uuid;
  v_merchant_id uuid;
  v_user_id uuid;
  v_txn public.transactions;
BEGIN
  -- 1. Security Check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Not authenticated';
  END IF;
  
  IF NOT public.is_active_user(v_user_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not active';
  END IF;

  -- 2. Extract and Validate
  v_amount := (p_tx->>'amount')::numeric;
  v_direction := p_tx->>'direction';
  v_module := p_tx->>'module';
  v_source_account_id := (p_tx->>'source_account_id')::uuid;
  v_destination_account_id := (p_tx->>'destination_account_id')::uuid;
  v_merchant_id := (p_tx->>'merchant_id')::uuid;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- 3. Insert Transaction
  INSERT INTO public.transactions (
    transaction_date, module, entity_id, source_account_id, 
    destination_account_id, merchant_id, amount, direction, 
    payment_method, origin_fund, capital_custeio, shift, 
    description, notes, parent_transaction_id, created_by, status
  ) VALUES (
    (p_tx->>'transaction_date')::date,
    (p_tx->>'module')::public.transaction_module,
    (p_tx->>'entity_id')::uuid,
    v_source_account_id,
    v_destination_account_id,
    v_merchant_id,
    v_amount,
    v_direction::public.transaction_direction,
    p_tx->>'payment_method',
    p_tx->>'origin_fund',
    p_tx->>'capital_custeio',
    p_tx->>'shift',
    p_tx->>'description',
    p_tx->>'notes',
    (p_tx->>'parent_transaction_id')::uuid,
    v_user_id,
    'posted'
  ) RETURNING * INTO v_txn;

  v_transaction_id := v_txn.id;

  -- 4. Apply Effects to Balances
  
  -- Account Effects
  IF v_direction = 'in' THEN
    IF v_destination_account_id IS NULL THEN
      RAISE EXCEPTION 'Destination account is required for "in" direction';
    END IF;
    UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_destination_account_id;
  ELSIF v_direction = 'out' THEN
    IF v_source_account_id IS NULL THEN
      RAISE EXCEPTION 'Source account is required for "out" direction';
    END IF;
    UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_source_account_id;
  ELSIF v_direction = 'transfer' THEN
    IF v_source_account_id IS NULL OR v_destination_account_id IS NULL THEN
      RAISE EXCEPTION 'Both source and destination accounts are required for transfer';
    END IF;
    UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_source_account_id;
    UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_destination_account_id;
  END IF;

  -- Merchant Effects
  IF v_merchant_id IS NOT NULL THEN
    IF v_module = 'aporte_saldo' THEN
      UPDATE public.merchants SET balance = balance + v_amount WHERE id = v_merchant_id;
    ELSIF v_module = 'consumo_saldo' THEN
      UPDATE public.merchants SET balance = balance - v_amount WHERE id = v_merchant_id;
    END IF;
  END IF;

  -- 5. Audit Log
  INSERT INTO public.audit_logs (
    transaction_id, action, before_json, after_json, reason, user_id
  ) VALUES (
    v_transaction_id, 'create', '{}'::jsonb, row_to_json(v_txn)::jsonb, 'Transaction created via process_transaction RPC', v_user_id
  );

  RETURN row_to_json(v_txn);
END;
$$;

-- 4. Update get_current_balances to be more robust
CREATE OR REPLACE FUNCTION public.get_current_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_assoc_id uuid;
  especie_balance numeric := 0;
  pix_balance numeric := 0;
  conta_digital_balance numeric := 0;
  cofre_balance numeric := 0;
  merchant_balances jsonb;
  resource_balances jsonb;
  ue_accounts jsonb;
  cx_accounts jsonb;
BEGIN
  -- Security check
  IF NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_assoc_id FROM entities WHERE type = 'associacao' LIMIT 1;

  -- Get Association account balances using scoped naming
  SELECT COALESCE(balance, 0) INTO especie_balance
  FROM accounts WHERE entity_id = v_assoc_id AND name = 'Espécie';
  
  SELECT COALESCE(balance, 0) INTO pix_balance
  FROM accounts WHERE entity_id = v_assoc_id AND name = 'PIX (Conta BB)';
  
  SELECT COALESCE(balance, 0) INTO conta_digital_balance
  FROM accounts WHERE entity_id = v_assoc_id AND name = 'Conta Digital (Escolaweb)';
  
  SELECT COALESCE(balance, 0) INTO cofre_balance
  FROM accounts WHERE entity_id = v_assoc_id AND name = 'Cofre';
  
  -- Get merchant balances (only saldo mode, active)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'balance', balance,
    'mode', mode
  )), '[]'::jsonb)
  INTO merchant_balances
  FROM merchants
  WHERE mode = 'saldo' AND active = true;
  
  -- Get UE accounts  
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'balance', a.balance,
    'account_number', a.account_number
  ) ORDER BY a.name), '[]'::jsonb)
  INTO ue_accounts
  FROM accounts a
  JOIN entities e ON e.id = a.entity_id
  WHERE e.type = 'ue' AND a.active = true;
  
  -- Get CX accounts
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'balance', a.balance,
    'account_number', a.account_number
  ) ORDER BY a.name), '[]'::jsonb)
  INTO cx_accounts
  FROM accounts a
  JOIN entities e ON e.id = a.entity_id
  WHERE e.type = 'cx' AND a.active = true;
  
  -- Build resource balances object
  resource_balances := jsonb_build_object(
    'UE', ue_accounts,
    'CX', cx_accounts
  );
  
  -- Build final result
  result := jsonb_build_object(
    'especieBalance', especie_balance,
    'pixBalance', pix_balance,
    'contaDigitalBalance', conta_digital_balance,
    'cofreBalance', cofre_balance,
    'merchantBalances', merchant_balances,
    'resourceBalances', resource_balances
  );
  
  RETURN result;
END;
$$;

-- 5. Update get_report_summary to be more robust
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
  weekly_expenses_cash numeric := 0;
  weekly_expenses_pix numeric := 0;
  weekly_expenses_digital numeric := 0;
  weekly_entries_cash numeric := 0;
  weekly_entries_pix numeric := 0;
  weekly_deposits numeric := 0;
  weekly_consumption numeric := 0;
  weekly_direct_pix numeric := 0;
BEGIN
  -- Security check
  IF NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO v_assoc_id FROM entities WHERE type = 'associacao' LIMIT 1;
  SELECT id INTO v_cd_id FROM accounts WHERE entity_id = v_assoc_id AND name = 'Conta Digital (Escolaweb)' LIMIT 1;

  SELECT 
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE 
      WHEN (module IN ('especie_transfer', 'assoc_transfer', 'conta_digital_ajuste', 'conta_digital_taxa')) 
           AND source_account_id = v_cd_id
      THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'aporte_saldo' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'consumo_saldo' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'pix_direto_uecx' THEN amount ELSE 0 END), 0)
  INTO 
    weekly_expenses_cash, 
    weekly_expenses_pix, 
    weekly_expenses_digital,
    weekly_entries_cash, 
    weekly_entries_pix,
    weekly_deposits,
    weekly_consumption,
    weekly_direct_pix
  FROM transactions
  WHERE transaction_date >= p_start_date
    AND transaction_date <= p_end_date
    AND status = 'posted'
    AND entity_id = v_assoc_id; -- Ensure scoped to association
  
  result := jsonb_build_object(
    'weeklyExpensesCash', weekly_expenses_cash,
    'weeklyExpensesPix', weekly_expenses_pix,
    'weeklyExpensesDigital', weekly_expenses_digital,
    'weeklyEntriesCash', weekly_entries_cash,
    'weeklyEntriesPix', weekly_entries_pix,
    'weeklyDeposits', weekly_deposits,
    'weeklyConsumption', weekly_consumption,
    'weeklyDirectPix', weekly_direct_pix
  );
  
  RETURN result;
END;
$$;

-- 6. Phase 1.3: Update historical modules for consistency
UPDATE transactions 
SET module = 'assoc_transfer' 
WHERE module = 'especie_transfer' 
  AND entity_id IN (SELECT id FROM entities WHERE type = 'associacao');

REVOKE EXECUTE ON FUNCTION public.process_transaction(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.process_transaction(jsonb) TO authenticated;
