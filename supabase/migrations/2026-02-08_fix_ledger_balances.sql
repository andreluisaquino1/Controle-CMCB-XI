-- ============================================================================
-- FIX: Recreate ledger_balances view and update get_current_balances RPC
-- ============================================================================

-- 1. Drop existing view first because Postgres doesn't allow changing columns via 'OR REPLACE'
DROP VIEW IF EXISTS public.ledger_balances CASCADE;

-- 2. Define the view with 'account_id'
CREATE VIEW public.ledger_balances AS
 SELECT account_id,
    sum(delta_cents) AS balance_cents
   FROM ( SELECT ledger_transactions.source_account AS account_id,
            (- ledger_transactions.amount_cents) AS delta_cents
           FROM ledger_transactions
        UNION ALL
         SELECT ledger_transactions.destination_account AS account_id,
            ledger_transactions.amount_cents AS delta_cents
           FROM ledger_transactions
          WHERE (ledger_transactions.destination_account IS NOT NULL)) t
  GROUP BY account_id;

-- 3. Update the RPC to use the new column name
CREATE OR REPLACE FUNCTION public.get_current_balances() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_assoc uuid; BEGIN
  SELECT id INTO v_assoc FROM entities WHERE type = 'associacao' LIMIT 1;
  RETURN jsonb_build_object(
    'especieBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'cash'), 0),
    'pixBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'pix_bb'), 0),
    'contaDigitalBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'digital_escolaweb'), 0),
    'cofreBalance', COALESCE((SELECT balance_cents::numeric/100 FROM ledger_balances WHERE account_id = 'safe'), 0),
    'merchantBalances', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'balance', COALESCE(lb.balance_cents::numeric/100, 0))), '[]'::jsonb) 
                         FROM merchants m 
                         LEFT JOIN ledger_balances lb ON lb.account_id = m.id::text 
                         WHERE m.active = true),
    'resourceBalances', jsonb_build_object(
        'UE', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(lb.balance_cents::numeric/100, 0))) , '[]'::jsonb) 
               FROM accounts a 
               JOIN entities e ON e.id = a.entity_id 
               LEFT JOIN ledger_balances lb ON lb.account_id = a.id::text
               WHERE e.type = 'ue' AND a.active = true),
        'CX', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'balance', COALESCE(lb.balance_cents::numeric/100, 0))) , '[]'::jsonb) 
               FROM accounts a 
               JOIN entities e ON e.id = a.entity_id 
               LEFT JOIN ledger_balances lb ON lb.account_id = a.id::text
               WHERE e.type = 'cx' AND a.active = true)
    )
  );
END; $$;
