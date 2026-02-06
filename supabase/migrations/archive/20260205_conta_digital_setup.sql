-- Migration: Setup Conta Digital (Escolaweb) and update Resource logic
-- Sequence:
-- 1. Rename existing 'PIX' to 'PIX (Conta BB)'
-- 2. Create 'Conta Digital (Escolaweb)'
-- 3. Update RPCs
-- 4. Update transaction_module enum

-- 1. Rename existing 'PIX' to 'PIX (Conta BB)'
UPDATE accounts 
SET name = 'PIX (Conta BB)' 
WHERE name = 'PIX' 
  AND entity_id IN (SELECT id FROM entities WHERE type = 'associacao');

-- 2. Create 'Conta Digital (Escolaweb)'
-- First, get the associacao entity id
DO $$
DECLARE
  v_associacao_id uuid;
BEGIN
  SELECT id INTO v_associacao_id FROM entities WHERE type = 'associacao' LIMIT 1;
  
  IF v_associacao_id IS NOT NULL THEN
    -- Check if it already exists to avoid duplicates
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'Conta Digital (Escolaweb)' AND entity_id = v_associacao_id) THEN
      INSERT INTO accounts (name, entity_id, balance, type, active)
      VALUES ('Conta Digital (Escolaweb)', v_associacao_id, 0, 'bank', true);
    END IF;
  END IF;
END $$;

-- 3. Update transaction_module enum to include new types
-- We need to check if they exist first since we can't easily ALTER TYPE in a transaction blocks with IF NOT EXISTS in some PG versions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'conta_digital_ajuste' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module ADD VALUE 'conta_digital_ajuste';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'aporte_estabelecimento_recurso' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module ADD VALUE 'aporte_estabelecimento_recurso';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'conta_digital_taxa' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module ADD VALUE 'conta_digital_taxa';
  END IF;
END $$;

-- 4. Recreate get_current_balances RPC to include Conta Digital
DROP FUNCTION IF EXISTS public.get_current_balances();

CREATE OR REPLACE FUNCTION public.get_current_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  especie_balance numeric := 0;
  pix_balance numeric := 0;
  conta_digital_balance numeric := 0;
  cofre_balance numeric := 0;
  merchant_balances jsonb;
  resource_balances jsonb;
  ue_accounts jsonb;
  cx_accounts jsonb;
BEGIN
  -- Get Association account balances in official order logic
  SELECT COALESCE(balance, 0) INTO especie_balance
  FROM accounts WHERE name = 'Espécie';
  
  SELECT COALESCE(balance, 0) INTO pix_balance
  FROM accounts WHERE name = 'PIX (Conta BB)';
  
  SELECT COALESCE(balance, 0) INTO conta_digital_balance
  FROM accounts WHERE name = 'Conta Digital (Escolaweb)';
  
  SELECT COALESCE(balance, 0) INTO cofre_balance
  FROM accounts WHERE name = 'Cofre';
  
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
  WHERE e.type = 'ue';
  
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
  WHERE e.type = 'cx';
  
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

-- 5. Recreate get_report_summary RPC to include Conta Digital
DROP FUNCTION IF EXISTS public.get_report_summary(date, date);

CREATE OR REPLACE FUNCTION public.get_report_summary(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  weekly_expenses_cash numeric := 0;
  weekly_expenses_pix numeric := 0;
  weekly_expenses_digital numeric := 0;
  weekly_entries_cash numeric := 0;
  weekly_entries_pix numeric := 0;
  weekly_deposits numeric := 0;
  weekly_consumption numeric := 0;
  weekly_direct_pix numeric := 0;
BEGIN
  -- Calculate period totals from transactions
  -- Note: Conta Digital outflows are transfers (especie_transfer) or fees (conta_digital_fee - to be created)
  -- But for "Saídas", we usually want association expenses.
  -- Phase 5 says "Saídas da Conta Digital devem considerar transferências + taxas"
  
  SELECT 
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN (module = 'especie_transfer' OR module = 'conta_digital_ajuste') AND source_account_id IN (SELECT id FROM accounts WHERE name = 'Conta Digital (Escolaweb)') THEN amount ELSE 0 END), 0),
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
    AND status = 'posted';
  
  -- Build result
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
