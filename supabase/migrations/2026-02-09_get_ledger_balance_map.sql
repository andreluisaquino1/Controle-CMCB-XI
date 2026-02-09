CREATE OR REPLACE FUNCTION public.get_ledger_balance_map()
RETURNS TABLE (
    account_id text,
    balance_cents bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT account_id, balance_cents
    FROM ledger_balances;
$$;

GRANT EXECUTE ON FUNCTION public.get_ledger_balance_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ledger_balance_map() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ledger_balance_map() TO anon;
