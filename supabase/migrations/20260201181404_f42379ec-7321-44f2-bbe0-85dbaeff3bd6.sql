-- Create RPC function for dashboard summary
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(start_date date, end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  bolsinha_balance numeric := 0;
  reserva_balance numeric := 0;
  pix_balance numeric := 0;
  weekly_expenses_cash numeric := 0;
  weekly_expenses_pix numeric := 0;
  weekly_entries_cash numeric := 0;
  weekly_entries_pix numeric := 0;
  weekly_deposits numeric := 0;
  weekly_consumption numeric := 0;
  weekly_direct_pix numeric := 0;
  merchant_balances jsonb;
  fiado_balances jsonb;
BEGIN
  -- Get account balances for Associação
  SELECT COALESCE(balance, 0) INTO bolsinha_balance
  FROM accounts WHERE name = 'Bolsinha (Espécie)';
  
  SELECT COALESCE(balance, 0) INTO reserva_balance
  FROM accounts WHERE name = 'Reserva (Espécie)';
  
  SELECT COALESCE(balance, 0) INTO pix_balance
  FROM accounts WHERE name = 'BB Associação (PIX)';
  
  -- Calculate weekly totals from transactions
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
  WHERE transaction_date >= start_date
    AND transaction_date <= end_date
    AND status = 'posted';
  
  -- Get merchant balances (saldo mode)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'balance', balance,
    'mode', mode
  )), '[]'::jsonb)
  INTO merchant_balances
  FROM merchants
  WHERE mode = 'saldo' AND active = true;
  
  -- Get fiado balances
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', name,
    'balance', balance,
    'mode', mode
  )), '[]'::jsonb)
  INTO fiado_balances
  FROM merchants
  WHERE mode = 'fiado' AND active = true;
  
  -- Build result
  result := jsonb_build_object(
    'bolsinhaBalance', bolsinha_balance,
    'reservaBalance', reserva_balance,
    'pixBalance', pix_balance,
    'weeklyExpensesCash', weekly_expenses_cash,
    'weeklyExpensesPix', weekly_expenses_pix,
    'weeklyEntriesCash', weekly_entries_cash,
    'weeklyEntriesPix', weekly_entries_pix,
    'weeklyDeposits', weekly_deposits,
    'weeklyConsumption', weekly_consumption,
    'weeklyDirectPix', weekly_direct_pix,
    'merchantBalances', merchant_balances,
    'fiadoBalances', fiado_balances,
    'periodStart', start_date,
    'periodEnd', end_date
  );
  
  RETURN result;
END;
$$;

-- Also update seed data account names to use constants
UPDATE accounts SET name = 'Bolsinha (Espécie)' WHERE name = 'Bolsinha';
UPDATE accounts SET name = 'Reserva (Espécie)' WHERE name = 'Reserva';