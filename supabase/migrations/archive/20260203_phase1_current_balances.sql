-- Migration: Phase 1 - Create get_current_balances RPC and rename accounts
-- This separates current balances from period-based reports

-- First, rename accounts to use proper nomenclature
UPDATE accounts SET name = 'Espécie' 
WHERE name IN ('Bolsinha (Espécie)', 'Bolsinha');

UPDATE accounts SET name = 'Cofre' 
WHERE name IN ('Reserva (Espécie)', 'Reserva');

UPDATE accounts SET name = 'PIX' 
WHERE name = 'BB Associação (PIX)';

-- Create function to get current balances (no period dependency)
CREATE OR REPLACE FUNCTION public.get_current_balances()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  especie_balance numeric := 0;
  cofre_balance numeric := 0;
  pix_balance numeric := 0;
  merchant_balances jsonb;
  resource_balances jsonb;
  ue_accounts jsonb;
  cx_accounts jsonb;
BEGIN
  -- Get Association account balances
  SELECT COALESCE(balance, 0) INTO especie_balance
  FROM accounts WHERE name = 'Espécie';
  
  SELECT COALESCE(balance, 0) INTO cofre_balance
  FROM accounts WHERE name = 'Cofre';
  
  SELECT COALESCE(balance, 0) INTO pix_balance
  FROM accounts WHERE name = 'PIX';
  
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
    'cofreBalance', cofre_balance,
    'pixBalance', pix_balance,
    'merchantBalances', merchant_balances,
    'resourceBalances', resource_balances
  );
  
  RETURN result;
END;
$$;

-- Create function to get report summary (period-based)
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
  weekly_entries_cash numeric := 0;
  weekly_entries_pix numeric := 0;
  weekly_deposits numeric := 0;
  weekly_consumption numeric := 0;
  weekly_direct_pix numeric := 0;
BEGIN
  -- Calculate period totals from transactions
  SELECT 
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'aporte_saldo' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'consumo_saldo' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'pix_direto_uecx' THEN amount ELSE 0 END), 0)
  INTO 
    weekly_expenses_cash, 
    weekly_expenses_pix, 
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
    'weeklyEntriesCash', weekly_entries_cash,
    'weeklyEntriesPix', weekly_entries_pix,
    'weeklyDeposits', weekly_deposits,
    'weeklyConsumption', weekly_consumption,
    'weeklyDirectPix', weekly_direct_pix
  );
  
  RETURN result;
END;
$$;

-- Update transaction modules enum to use especie-based naming
-- Note: We maintain backwards compatibility for now
ALTER TYPE transaction_module RENAME VALUE 'bolsinha_transfer' TO 'especie_transfer';
ALTER TYPE transaction_module RENAME VALUE 'bolsinha_deposito_pix' TO 'especie_deposito_pix';
ALTER TYPE transaction_module RENAME VALUE 'bolsinha_ajuste' TO 'especie_ajuste';
ALTER TYPE transaction_module RENAME VALUE 'reserva_ajuste' TO 'cofre_ajuste';
