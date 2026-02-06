-- CMCB-XI Database: Business Logic (RPCs)
-- Order: 03

-- 1. TRANSACTION MANAGEMENT

-- Atomic Transaction Processor
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'User not active'; END IF;

  v_amount := (p_tx->>'amount')::numeric;
  v_direction := p_tx->>'direction';
  v_module := p_tx->>'module';
  v_source_account_id := (p_tx->>'source_account_id')::uuid;
  v_destination_account_id := (p_tx->>'destination_account_id')::uuid;
  v_merchant_id := (p_tx->>'merchant_id')::uuid;

  IF v_amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  INSERT INTO public.transactions (
    transaction_date, module, entity_id, source_account_id, 
    destination_account_id, merchant_id, amount, direction, 
    payment_method, origin_fund, capital_custeio, shift, 
    description, notes, created_by, status
  ) VALUES (
    COALESCE((p_tx->>'transaction_date')::date, CURRENT_DATE),
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
    v_user_id,
    'posted'
  ) RETURNING * INTO v_txn;

  -- Apply Balances
  IF v_direction = 'in' THEN
    UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_destination_account_id;
  ELSIF v_direction = 'out' THEN
    UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_source_account_id;
  ELSIF v_direction = 'transfer' THEN
    UPDATE public.accounts SET balance = balance - v_amount WHERE id = v_source_account_id;
    UPDATE public.accounts SET balance = balance + v_amount WHERE id = v_destination_account_id;
  END IF;

  IF v_merchant_id IS NOT NULL THEN
    IF v_module = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance + v_amount WHERE id = v_merchant_id;
    ELSIF v_module = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance - v_amount WHERE id = v_merchant_id;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id)
  VALUES (v_txn.id, 'create', '{}'::jsonb, row_to_json(v_txn)::jsonb, 'Atomic Creation', v_user_id);

  RETURN row_to_json(v_txn);
END;
$$;

-- Atomic Void Processor
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_txn FROM public.transactions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF v_txn.status = 'voided' THEN RAISE EXCEPTION 'Already voided'; END IF;

  -- Reverse Effects
  IF v_txn.direction = 'in' THEN
    UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.destination_account_id;
  ELSIF v_txn.direction = 'out' THEN
    UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.source_account_id;
  ELSIF v_txn.direction = 'transfer' THEN
    UPDATE public.accounts SET balance = balance + v_txn.amount WHERE id = v_txn.source_account_id;
    UPDATE public.accounts SET balance = balance - v_txn.amount WHERE id = v_txn.destination_account_id;
  END IF;

  IF v_txn.merchant_id IS NOT NULL THEN
    IF v_txn.module = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance - v_txn.amount WHERE id = v_txn.merchant_id;
    ELSIF v_txn.module = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance + v_txn.amount WHERE id = v_txn.merchant_id;
    END IF;
  END IF;

  UPDATE public.transactions SET status = 'voided', notes = COALESCE(notes, '') || ' | VOID: ' || p_reason WHERE id = p_id;

  INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id)
  VALUES (p_id, 'void', row_to_json(v_txn)::jsonb, '{"status": "voided"}'::jsonb, p_reason, v_user_id);

  RETURN row_to_json(v_txn);
END;
$$;

-- 2. DASHBOARD & DATA FETCHING

-- Hardened Dashboard Balances
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
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO v_assoc_id FROM entities WHERE type = 'associacao' LIMIT 1;

  SELECT COALESCE(balance, 0) INTO especie_balance FROM accounts WHERE entity_id = v_assoc_id AND name = 'Espécie';
  SELECT COALESCE(balance, 0) INTO pix_balance FROM accounts WHERE entity_id = v_assoc_id AND name = 'PIX (Conta BB)';
  SELECT COALESCE(balance, 0) INTO conta_digital_balance FROM accounts WHERE entity_id = v_assoc_id AND name = 'Conta Digital (Escolaweb)';
  SELECT COALESCE(balance, 0) INTO cofre_balance FROM accounts WHERE entity_id = v_assoc_id AND name = 'Cofre';
  
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'balance', balance, 'mode', mode)), '[]'::jsonb)
  INTO merchant_balances FROM merchants WHERE active = true;
  
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', a.balance, 'account_number', a.account_number) ORDER BY a.name), '[]'::jsonb)
  INTO ue_accounts FROM accounts a JOIN entities e ON e.id = a.entity_id WHERE e.type = 'ue' AND a.active = true;
  
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', a.balance, 'account_number', a.account_number) ORDER BY a.name), '[]'::jsonb)
  INTO cx_accounts FROM accounts a JOIN entities e ON e.id = a.entity_id WHERE e.type = 'cx' AND a.active = true;
  
  RETURN jsonb_build_object('especieBalance', especie_balance, 'pixBalance', pix_balance, 'contaDigitalBalance', conta_digital_balance, 'cofreBalance', cofre_balance, 'merchantBalances', merchant_balances, 'resourceBalances', jsonb_build_object('UE', ue_accounts, 'CX', cx_accounts));
END;
$$;

-- Hardened Period Report
CREATE OR REPLACE FUNCTION public.get_report_summary(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_assoc_id uuid;
  v_cd_id uuid;
  v_sum jsonb;
BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO v_assoc_id FROM entities WHERE type = 'associacao' LIMIT 1;
  SELECT id INTO v_cd_id FROM accounts WHERE entity_id = v_assoc_id AND name = 'Conta Digital (Escolaweb)' LIMIT 1;

  SELECT jsonb_build_object(
    'weeklyExpensesCash', COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    'weeklyExpensesPix', COALESCE(SUM(CASE WHEN module = 'gasto_associacao' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    'weeklyExpensesDigital', COALESCE(SUM(CASE WHEN (module IN ('especie_transfer', 'assoc_transfer', 'conta_digital_ajuste', 'conta_digital_taxa')) AND source_account_id = v_cd_id THEN amount ELSE 0 END), 0),
    'weeklyEntriesCash', COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'cash' THEN amount ELSE 0 END), 0),
    'weeklyEntriesPix', COALESCE(SUM(CASE WHEN module = 'mensalidade' AND payment_method = 'pix' THEN amount ELSE 0 END), 0),
    'weeklyDeposits', COALESCE(SUM(CASE WHEN module = 'aporte_saldo' THEN amount ELSE 0 END), 0),
    'weeklyConsumption', COALESCE(SUM(CASE WHEN module = 'consumo_saldo' THEN amount ELSE 0 END), 0),
    'weeklyDirectPix', COALESCE(SUM(CASE WHEN module = 'pix_direto_uecx' THEN amount ELSE 0 END), 0)
  ) INTO v_sum
  FROM transactions
  WHERE transaction_date >= p_start_date AND transaction_date <= p_end_date AND status = 'posted' AND entity_id = v_assoc_id;
  
  RETURN v_sum;
END;
$$;

-- 3. USER MANAGEMENT

-- Assign Demo Role
CREATE OR REPLACE FUNCTION public.assign_demo_role(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN RETURN 'User not found'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, 'demo') ON CONFLICT (user_id, role) DO NOTHING;
  UPDATE public.profiles SET active = true WHERE user_id = target_user_id;
  RETURN 'Demo role assigned to ' || target_email;
END;
$$;

-- Profile Auto-creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, active)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PERMISSIONS
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
GRANT EXECUTE ON FUNCTION public.get_current_balances() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_report_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_transaction(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_demo_role(text) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
