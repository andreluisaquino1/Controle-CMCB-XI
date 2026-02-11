import { supabase } from "@/integrations/supabase/client";
import { extendedSupabase } from "@/integrations/supabase/extendedClient";
import { Merchant } from "@/types";

interface LedgerBalanceRow {
    account_id?: string;
    account_key?: string;
    account?: string;
    balance_cents?: number;
}

export const merchantService = {
    /**
     * Busca todos os estabelecimentos e seus saldos no Ledger
     */
    async getAllMerchants(includeInactive = false): Promise<Merchant[]> {
        // 1. Fetch Merchants
        let baseQuery = supabase
            .from("merchants")
            .select("*")
            .order("name");

        if (!includeInactive) {
            baseQuery = baseQuery.eq("active", true);
        }

        const { data: merchantsData, error: merchantsError } = await baseQuery;
        if (merchantsError) throw merchantsError;

        // 2. Fetch Ledger Balances for these merchants
        const merchantIds = merchantsData.map(m => m.id);

        const { data: balancesData, error: balancesError } = await extendedSupabase
            .from("ledger_balances")
            .select("*")
            .in("account_id", merchantIds);

        if (balancesError) {
            console.error("Erro ao buscar saldos do Ledger:", balancesError);
            // Non-critical: use merchant table balance as fallback
        }

        const balanceMap = new Map<string, number>();
        if (balancesData && Array.isArray(balancesData)) {
            (balancesData as unknown as LedgerBalanceRow[]).forEach((b) => {
                const accountId = b.account_id || b.account_key || b.account;
                const balance = (Number(b.balance_cents) || 0) / 100;
                if (accountId) {
                    balanceMap.set(accountId, balance);
                }
            });
        }

        return merchantsData.map(m => ({
            ...m,
            balance: balanceMap.has(m.id) ? (balanceMap.get(m.id) ?? 0) : (Number(m.balance) || 0)
        })) as Merchant[];
    },

    /**
     * Cria um novo estabelecimento
     */
    async createMerchant(name: string): Promise<Merchant> {
        const { data, error } = await supabase
            .from("merchants")
            .insert({ name })
            .select()
            .single();

        if (error) throw error;
        return data as Merchant;
    },

    /**
     * Atualiza um estabelecimento
     */
    async updateMerchant(id: string, name: string): Promise<void> {
        const { error } = await supabase
            .from("merchants")
            .update({ name })
            .eq("id", id);

        if (error) throw error;
    },

    /**
     * Altera o status ativo de um estabelecimento
     */
    async setMerchantActive(id: string, active: boolean): Promise<void> {
        const { error } = await supabase
            .from("merchants")
            .update({ active })
            .eq("id", id);

        if (error) throw error;
    }
};
