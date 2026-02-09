import { extendedSupabase } from "@/integrations/supabase/extendedClient";

/**
 * Busca saldo em centavos a partir da view `ledger_balances`.
 *
 * OBS: o ledger usa `account_id` como identificador. Para contas "reais",
 * isso normalmente será o UUID da conta (accounts.id). Para contas lógicas
 * da Associação, pode ser uma key (ex: 'cash', 'pix_bb', etc).
 */
export async function getAccountBalanceCents(accountId: string) {
    const { data, error } = await extendedSupabase
        .from("ledger_balances")
        .select("balance_cents")
        .eq("account_id", accountId)
        .maybeSingle();


    if (error) {
        console.error(`Erro ao buscar saldo da conta ${accountId}:`, error);
        throw error;
    }

    return Number(data?.balance_cents ?? 0);
}
