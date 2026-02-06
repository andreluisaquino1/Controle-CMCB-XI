-- Migration: Association Optimizations
-- Phase 1 & 3: Standardize modules and link transactions

-- 1. Add assoc_transfer to transaction_module enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'assoc_transfer' AND enumtypid = 'transaction_module'::regtype) THEN
    ALTER TYPE transaction_module ADD VALUE 'assoc_transfer';
  END IF;
END $$;

-- 2. Add parent_transaction_id to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS parent_transaction_id uuid REFERENCES transactions(id);

-- 3. Add comment to clarify usage
COMMENT ON COLUMN transactions.parent_transaction_id IS 'Reference to the main transaction for related entries like taxes or fees.';

-- 4. Update get_report_summary to include the new module and ensure Conta Digital logic is robust
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
