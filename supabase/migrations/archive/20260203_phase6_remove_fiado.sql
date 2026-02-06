-- Migration: Phase 6 - Remove Fiado completely from database
-- Based on user decision to remove Fiado entirely

-- Drop old get_dashboard_summary function that references fiado
DROP FUNCTION IF EXISTS public.get_dashboard_summary(date, date);

-- Remove fiado merchants (soft delete first, then hard delete if no transactions)
UPDATE merchants SET active = false WHERE mode = 'fiado';

-- Remove fiado from merchant_mode enum
-- First, update any remaining fiado merchants to saldo
UPDATE merchants SET mode = 'saldo' WHERE mode = 'fiado';

-- Now we can safely alter the enum by recreating it
ALTER TYPE merchant_mode RENAME TO merchant_mode_old;
CREATE TYPE merchant_mode AS ENUM ('saldo');

-- Update the merchants table to use new enum
ALTER TABLE merchants 
  ALTER COLUMN mode TYPE merchant_mode 
  USING mode::text::merchant_mode;

-- Drop old enum
DROP TYPE merchant_mode_old;

-- Remove fiado-related transaction modules
-- First check if any transactions exist with fiado modules
DO $$
DECLARE
  fiado_count integer;
BEGIN
  SELECT COUNT(*) INTO fiado_count
  FROM transactions
  WHERE module IN ('fiado_registro', 'fiado_pagamento');
  
  IF fiado_count > 0 THEN
    RAISE NOTICE 'Found % fiado transactions. Marking as voided.', fiado_count;
    UPDATE transactions 
    SET status = 'voided', 
        notes = COALESCE(notes || ' | ', '') || 'Voided during Fiado removal'
    WHERE module IN ('fiado_registro', 'fiado_pagamento');
  END IF;
END $$;

-- Now safe to remove from enum
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

-- Update transactions table
ALTER TABLE transactions 
  ALTER COLUMN module TYPE transaction_module 
  USING CASE 
    WHEN module::text IN ('fiado_registro', 'fiado_pagamento') THEN NULL
    ELSE module::text::transaction_module
  END;

-- Drop old enum
DROP TYPE transaction_module_old;

-- Add comment documenting the change
COMMENT ON TYPE transaction_module IS 'Transaction modules - Fiado removed on 2026-02-03';
COMMENT ON TYPE merchant_mode IS 'Merchant modes - Only saldo supported, Fiado removed on 2026-02-03';
