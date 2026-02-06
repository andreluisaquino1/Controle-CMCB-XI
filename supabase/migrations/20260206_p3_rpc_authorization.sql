-- Migration: Security Hardening (Phase 0.5)
-- Restrict SECURITY DEFINER functions and add internal authorization checks

-- 1. get_current_balances
-- Add internal check
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
  -- Security check: only active users can view balances
  IF NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: User is not active or not authenticated';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.get_current_balances() FROM public;
GRANT EXECUTE ON FUNCTION public.get_current_balances() TO authenticated;

-- 2. get_report_summary
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
  -- Security check: only active users can view reports
  IF NOT public.is_active_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: User is not active or not authenticated';
  END IF;

  SELECT 
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE 
      WHEN (module IN ('especie_transfer', 'assoc_transfer', 'conta_digital_ajuste', 'conta_digital_taxa')) 
           AND source_account_id IN (SELECT id FROM accounts WHERE name = 'Conta Digital (Escolaweb)') 
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
    AND status = 'posted';
  
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

REVOKE EXECUTE ON FUNCTION public.get_report_summary(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.get_report_summary(date, date) TO authenticated;

-- 3. is_active_user
REVOKE EXECUTE ON FUNCTION public.is_active_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;

-- 4. assign_demo_role
-- Add admin check
CREATE OR REPLACE FUNCTION public.assign_demo_role(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Security check: only admins can assign demo roles
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can assign demo roles';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RETURN 'User not found';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'demo')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles SET active = true WHERE user_id = target_user_id;

  RETURN 'Demo role assigned to ' || target_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_demo_role(text) FROM public;
GRANT EXECUTE ON FUNCTION public.assign_demo_role(text) TO authenticated;

-- 5. handle_new_user
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
-- Note: authenticated users don't need access to this, it's a trigger function
-- but it needs to be callable by the auth system (usually handled by search_path and ownership)
