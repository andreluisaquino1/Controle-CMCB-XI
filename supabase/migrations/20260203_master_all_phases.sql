-- MASTER MIGRATION SCRIPT
-- Run all Phase migrations in order
-- This consolidates all improvements for CMCB-XI project

-- ============================================================================
-- PHASE 1: Create RPCs and Rename Accounts
-- ============================================================================

-- Rename accounts to proper nomenclature
UPDATE accounts SET name = 'Espécie'  
WHERE name IN ('Bolsinha (Espécie)', 'Bolsinha');

UPDATE accounts SET name = 'Cofre' 
WHERE name IN ('Reserva (Espécie)', 'Reserva');

UPDATE accounts SET name = 'PIX' 
WHERE name = 'BB Associação (PIX)';

-- Create get_current_balances RPC (no period dependency)
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

-- Create get_report_summary RPC (period-based)
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

-- Update transaction modules enum
DO $$
BEGIN
  -- Check if old values exist and rename them
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bolsinha_transfer' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module RENAME VALUE 'bolsinha_transfer' TO 'especie_transfer';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bolsinha_deposito_pix' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module RENAME VALUE 'bolsinha_deposito_pix' TO 'especie_deposito_pix';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bolsinha_ajuste' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module RENAME VALUE 'bolsinha_ajuste' TO 'especie_ajuste';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'reserva_ajuste' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module RENAME VALUE 'reserva_ajuste' TO 'cofre_ajuste';
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: Remove Fiado Completely
-- ============================================================================

-- Drop old get_dashboard_summary that references fiado
DROP FUNCTION IF EXISTS public.get_dashboard_summary(date, date);

-- Soft delete fiado merchants
UPDATE merchants SET active = false WHERE mode = 'fiado';

-- Update fiado merchants to saldo before enum change
UPDATE merchants SET mode = 'saldo' WHERE mode = 'fiado';

-- Recreate merchant_mode enum without fiado
ALTER TYPE merchant_mode RENAME TO merchant_mode_old;
CREATE TYPE merchant_mode AS ENUM ('saldo');

ALTER TABLE merchants 
  ALTER COLUMN mode TYPE merchant_mode 
  USING mode::text::merchant_mode;

DROP TYPE merchant_mode_old;

-- Mark fiado transactions as voided
UPDATE transactions 
SET status = 'voided', 
    notes = COALESCE(notes || ' | ', '') || 'Voided during Fiado removal'
WHERE module IN ('fiado_registro', 'fiado_pagamento')
  AND status = 'posted';

-- Recreate transaction_module enum without fiado
ALTER TYPE transaction_module RENAME TO transaction_module_old;
CREATE TYPE transaction_module AS ENUM (
  'mensalidade',
  'gasto_associacao',
  'especie_transfer',
  'especie_deposito_pix',
  'especie_ajuste',
  'cofre_ajuste',
  'aporte_saldo',
  'consumo_saldo',
  'pix_direto_uecx'
);

ALTER TABLE transactions 
  ALTER COLUMN module TYPE transaction_module 
  USING CASE 
    WHEN module::text IN ('fiado_registro', 'fiado_pagamento') THEN NULL
    ELSE module::text::transaction_module
  END;

DROP TYPE transaction_module_old;

-- Add documentation comments
COMMENT ON TYPE transaction_module IS 'Transaction modules - Fiado removed on 2026-02-03';
COMMENT ON TYPE merchant_mode IS 'Merchant modes - Only saldo supported, Fiado removed on 2026-02-03';

-- ============================================================================
-- PHASE 8: Admin Role-Based Authorization
-- ============================================================================

-- Grant admin role to the designated user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'andreluis_57@hotmail.com'
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User not found. Admin role will be granted on first login.';
  END IF;
END $$;

-- Update RLS policy for profiles (admins can view all)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins and users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR auth.uid() = user_id
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RPCs exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_current_balances', 'get_report_summary')
ORDER BY routine_name;

-- Check account names
SELECT name, type 
FROM accounts 
WHERE entity_id IN (SELECT id FROM entities WHERE type = 'associacao')
ORDER BY name;

-- Check admin role
SELECT u.email, ur.role 
FROM user_roles ur 
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- Check merchant modes
SELECT DISTINCT mode FROM merchants;

-- Check transaction modules
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'transaction_module'::regtype
ORDER BY enumlabel;
