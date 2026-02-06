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

  -- Validations (Fase 1.1)
  IF v_direction = 'in' AND v_destination_account_id IS NULL THEN 
    RAISE EXCEPTION 'Direction "in" requires destination_account_id'; 
  END IF;
  IF v_direction = 'out' AND v_source_account_id IS NULL THEN 
    RAISE EXCEPTION 'Direction "out" requires source_account_id'; 
  END IF;
  IF v_direction = 'transfer' AND (v_source_account_id IS NULL OR v_destination_account_id IS NULL) THEN 
    RAISE EXCEPTION 'Direction "transfer" requires both source and destination account IDs'; 
  END IF;

  -- Validate Account Existence
  IF v_source_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_source_account_id) THEN
    RAISE EXCEPTION 'Source account not found: %', v_source_account_id;
  END IF;
  IF v_destination_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = v_destination_account_id) THEN
    RAISE EXCEPTION 'Destination account not found: %', v_destination_account_id;
  END IF;

  INSERT INTO public.transactions (
    transaction_date, module, entity_id, source_account_id, 
    destination_account_id, merchant_id, amount, direction, 
    payment_method, origin_fund, capital_custeio, shift, 
    description, notes, created_by, status, parent_transaction_id
  ) VALUES (
    COALESCE((p_tx->>'transaction_date')::date, CURRENT_DATE),
    (p_tx->>'module')::public.transaction_module,
    (p_tx->>'entity_id')::uuid,
    v_source_account_id,
    v_destination_account_id,
    v_merchant_id,
    v_amount,
    v_direction::public.transaction_direction,
    p_tx->>'payment_method'::public.payment_method,
    (p_tx->>'origin_fund')::public.fund_origin,
    (p_tx->>'capital_custeio')::public.capital_custeio,
    (p_tx->>'shift')::public.shift_type,
    p_tx->>'description',
    p_tx->>'notes',
    v_user_id,
    'posted',
    (p_tx->>'parent_transaction_id')::uuid
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

-- Resource Transaction Processor (UE/CX)
CREATE OR REPLACE FUNCTION public.process_resource_transaction(p_tx jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_id uuid;
  v_entity_type text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'User not active'; END IF;

  v_account_id := (p_tx->>'source_account_id')::uuid;
  IF v_account_id IS NULL THEN RAISE EXCEPTION 'Source account ID is required for resource transactions'; END IF;
  
  SELECT e.type INTO v_entity_type
  FROM public.accounts a
  JOIN public.entities e ON e.id = a.entity_id
  WHERE a.id = v_account_id;

  IF v_entity_type NOT IN ('ue', 'cx') THEN
    RAISE EXCEPTION 'Access Denied: Account does not belong to Resource entities (UE/CX)';
  END IF;

  RETURN public.process_transaction(p_tx);
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
  IF NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'User not active'; END IF;

  CREATE OR REPLACE FUNCTION public.void_transaction(p_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_before jsonb; v_txn record; v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR NOT public.is_active_user(v_user_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    SELECT row_to_json(t)::jsonb INTO v_before FROM public.transactions t WHERE id = p_id FOR UPDATE;
    IF v_before IS NULL THEN RAISE EXCEPTION 'Transaction not found'; END IF;
    IF (v_before->>'status') = 'voided' THEN RAISE EXCEPTION 'Already voided'; END IF;
    
    -- Using v_before for logic
    IF (v_before->>'direction') = 'in' THEN UPDATE public.accounts SET balance = balance - (v_before->>'amount')::numeric WHERE id = (v_before->>'destination_account_id')::uuid;
    ELSIF (v_before->>'direction') = 'out' THEN UPDATE public.accounts SET balance = balance + (v_before->>'amount')::numeric WHERE id = (v_before->>'source_account_id')::uuid;
    ELSIF (v_before->>'direction') = 'transfer' THEN
      UPDATE public.accounts SET balance = balance + (v_before->>'amount')::numeric WHERE id = (v_before->>'source_account_id')::uuid;
      UPDATE public.accounts SET balance = balance - (v_before->>'amount')::numeric WHERE id = (v_before->>'destination_account_id')::uuid;
    END IF;
    
    IF (v_before->>'merchant_id') IS NOT NULL THEN
      IF (v_before->>'module') = 'aporte_saldo' THEN UPDATE public.merchants SET balance = balance - (v_before->>'amount')::numeric WHERE id = (v_before->>'merchant_id')::uuid;
      ELSIF (v_before->>'module') = 'consumo_saldo' THEN UPDATE public.merchants SET balance = balance + (v_before->>'amount')::numeric WHERE id = (v_before->>'merchant_id')::uuid;
      END IF;
    END IF;
    
    UPDATE public.transactions SET status = 'voided', notes = COALESCE(notes, '') || ' | VOID: ' || p_reason WHERE id = p_id RETURNING * INTO v_txn;
    INSERT INTO public.audit_logs (transaction_id, action, before_json, after_json, reason, user_id) 
    VALUES (p_id, 'void', v_before, row_to_json(v_txn)::jsonb, p_reason, v_user_id);
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

-- Hardened Period Report (using modules config)
CREATE OR REPLACE FUNCTION public.get_report_summary(p_start_date date, p_end_date date, p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cd_id uuid;
  v_summary record;
BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  -- Handle virtual account for digital fees/transfer context
  SELECT id INTO v_cd_id FROM accounts WHERE entity_id = p_entity_id AND name = 'Conta Digital (Escolaweb)' LIMIT 1;

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
    AND t.entity_id = p_entity_id;
  
  RETURN jsonb_build_object(
    'weeklyExpensesCash', v_summary.expenses_cash,
    'weeklyExpensesPix', v_summary.expenses_pix,
    'weeklyExpensesDigital', v_summary.expenses_digital,
    'weeklyEntriesCash', v_summary.entries_cash,
    'weeklyEntriesPix', v_summary.entries_pix,
    'weeklyDeposits', v_summary.deposits,
    'weeklyConsumption', v_summary.consumption,
    'weeklyDirectPix', v_summary.direct_pix
  );
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
GRANT EXECUTE ON FUNCTION public.get_report_summary(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_transaction(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_resource_transaction(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_demo_role(text) TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
