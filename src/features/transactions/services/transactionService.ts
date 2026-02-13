import { extendedSupabase } from "@/integrations/supabase/extendedClient";
import { LedgerType, LedgerTransaction } from "@/domain/ledger";
import { LedgerStatus } from "@/shared/constants/ledger";
import type { Json } from "@/integrations/supabase/types";

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
        status?: LedgerStatus;
        created_at?: string;
        metadata?: Record<string, unknown>;
    }): Promise<LedgerTransaction> {
        if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) {
            throw new Error("O valor (em centavos) deve ser um número inteiro positivo.");
        }

        const { data: userData, error: userError } = await extendedSupabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId || userError) throw new Error("Usuário não autenticado no Supabase.");

        const { data, error } = await extendedSupabase.from("ledger_transactions").insert({
            created_at: input.created_at ? new Date(input.created_at).toISOString() : undefined,
            created_by: userId,
            type: input.type,
            source_account: input.source_account,
            destination_account: input.destination_account ?? null,
            amount_cents: input.amount_cents,
            description: input.description ?? null,
            reference_id: input.reference_id ?? null,
            status: input.status || LedgerStatus.VALIDATED,
            module: (input.metadata?.module as string) ?? null,
            entity_id: (input.metadata?.entity_id as string) ?? null,
            payment_method: (input.metadata?.payment_method as string) ?? null,
            metadata: (input.metadata as Json) ?? {},
        })
            .select()
            .single();

        if (error) {
            console.error("Erro ao inserir no Ledger:", error);
            throw error;
        }

        return data as unknown as LedgerTransaction;
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
    },

    /**
     * Verifica se já existe uma mensalidade para o turno e método na data
     */
    async checkExistingMonthlyFee(date: string, turno: string, method: "cash" | "pix"): Promise<{ id: string }[]> {
        const module = method === "cash" ? "mensalidade" : "mensalidade_pix";
        const { data, error } = await extendedSupabase
            .from("ledger_transactions")
            .select("id")
            .eq("status", "validated")
            .eq("metadata->>shift", turno)
            .gte("created_at", `${date}T00:00:00`)
            .lte("created_at", `${date}T23:59:59.999`)
            // Compatível com registros novos (coluna module) e antigos (metadata)
            .or(
                [
                    `module.eq.${module}`,
                    `metadata->>module.eq.${module}`,
                    `metadata->>modulo.eq.${module}`,
                    `metadata->>original_module.eq.${module}`,
                ].join(",")
            );

        if (error) throw error;
        return data || [];
    }
};
