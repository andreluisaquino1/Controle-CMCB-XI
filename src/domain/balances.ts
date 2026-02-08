import { supabase } from "@/integrations/supabase/client";

/**
 * Obtém o saldo de uma conta específica a partir da view de Ledger.
 * O saldo é retornado em centavos (Cents).
 */
export async function getAccountBalanceCents(accountName: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("ledger_balances")
        .select("balance_cents")
        .eq("account_key", accountName)
        .maybeSingle();

    if (error) {
        console.error(`Erro ao buscar saldo da conta ${accountName}:`, error);
        throw error;
    }

    return Number(data?.balance_cents ?? 0);
}

