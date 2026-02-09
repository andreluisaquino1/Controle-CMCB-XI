import { supabase } from "@/integrations/supabase/client";
import { Account, Entity } from "@/types";

export const accountService = {
    /**
     * Busca todas as entidades
     */
    async getEntities(): Promise<Entity[]> {
        const { data, error } = await supabase
            .from("entities")
            .select("*")
            .order("name");

        if (error) throw error;
        return data as Entity[];
    },

    /**
     * Busca entidades e suas contas, opcionalmente incluindo inativas
     */
    async getEntitiesWithAccounts(includeInactive = false): Promise<{ entities: Entity[], accounts: Account[] }> {
        const { data: entities, error: entitiesError } = await supabase
            .from("entities")
            .select("*")
            .order("name");

        if (entitiesError) throw entitiesError;

        let accQuery = supabase
            .from("accounts")
            .select("*")
            .order("name");

        if (!includeInactive) {
            accQuery = accQuery.eq("active", true);
        }

        const { data: accountsData, error: accountsError } = await accQuery;
        if (accountsError) throw accountsError;

        return {
            entities: entities as Entity[],
            accounts: accountsData as Account[],
        };
    },

    /**
     * Cria uma nova conta
     */
    async createAccount(data: { name: string; account_number?: string; entity_id: string }): Promise<Account> {
        const { data: account, error } = await supabase
            .from("accounts")
            .insert({
                name: data.name,
                account_number: data.account_number || null,
                entity_id: data.entity_id,
                active: true,
                balance: 0,
                type: 'bank'
            })
            .select()
            .single();

        if (error) throw error;
        return account as Account;
    },

    /**
     * Atualiza uma conta existente
     */
    async updateAccount(id: string, data: { name: string; account_number?: string }): Promise<void> {
        const { error } = await supabase
            .from("accounts")
            .update({
                name: data.name,
                account_number: data.account_number || null,
            })
            .eq("id", id);

        if (error) throw error;
    },

    /**
     * Altera o status ativo de uma conta
     */
    async setAccountActive(id: string, active: boolean): Promise<void> {
        const { error } = await supabase
            .from("accounts")
            .update({ active })
            .eq("id", id);

        if (error) throw error;
    }
};
