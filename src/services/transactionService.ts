import { supabase } from "@/integrations/supabase/client";
import { LedgerType, LedgerTransaction } from "@/domain/ledger";
import { ExtendedDatabase } from "@/integrations/supabase/database.extension";
import { type SupabaseClient } from "@supabase/supabase-js";

const extendedSupabase = supabase as unknown as SupabaseClient<ExtendedDatabase>;

export const transactionService = {
    /**
     * Cria uma transação no Ledger
     */
    async createLedgerTransaction(input: {
        type: LedgerType;
        source_account: string;
        destination_account?: string | null;
        amount_cents: number;
        description?: string | null;
        reference_id?: string | null;
        status?: "pending" | "validated" | "voided";
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) {
            throw new Error("O valor (em centavos) deve ser um número inteiro positivo.");
        }

        const { data: userData, error: userError } = await extendedSupabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId || userError) throw new Error("Usuário não autenticado no Supabase.");

        const { error } = await extendedSupabase.from("ledger_transactions").insert({
            created_by: userId,
            type: input.type,
            source_account: input.source_account,
            destination_account: input.destination_account ?? null,
            amount_cents: input.amount_cents,
            description: input.description ?? null,
            reference_id: input.reference_id ?? null,
            status: input.status || "validated",
            module: (input.metadata as any)?.module ?? null,
            entity_id: (input.metadata as any)?.entity_id ?? null,
            payment_method: (input.metadata as any)?.payment_method ?? null,
            metadata: (input.metadata as any) ?? {},
        });

        if (error) {
            console.error("Erro ao inserir no Ledger:", error);
            throw error;
        }
    },

    /**
     * Anula uma transação via RPC
     */
    async voidTransaction(transactionId: string, reason: string): Promise<void> {
        const { error } = await extendedSupabase.rpc("void_transaction", {
            p_id: transactionId,
            p_reason: reason,
        });

        if (error) throw error;
    },

    /**
     * Aprova uma transação pendente via RPC
     */
    async approveTransaction(transactionId: string): Promise<void> {
        const { error } = await extendedSupabase.rpc("approve_ledger_transaction", {
            p_id: transactionId,
        });

        if (error) throw error;
    }
};
