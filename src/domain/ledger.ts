import { supabase } from "@/integrations/supabase/client";

export type LedgerType = "income" | "expense" | "transfer" | "fee" | "adjustment";

export interface LedgerTransaction {
    id: string;
    created_at: string;
    created_by: string;
    type: LedgerType;
    source_account: string;
    destination_account: string | null;
    amount_cents: number;
    description: string | null;
    reference_id: string | null;
    metadata: Record<string, any>;
}

/**
 * Cria uma transação no Ledger imutável.
 * Substitui o modelo antigo de 'save transaction + update balance'.
 */
export async function createLedgerTransaction(input: {
    type: LedgerType;
    source_account: string;
    destination_account?: string | null;
    amount_cents: number;
    description?: string | null;
    reference_id?: string | null;
    metadata?: Record<string, unknown>;
}) {
    if (!Number.isInteger(input.amount_cents) || input.amount_cents <= 0) {
        throw new Error("O valor (em centavos) deve ser um número inteiro positivo.");
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId || userError) throw new Error("Usuário não autenticado no Supabase.");

    // @ts-ignore
    const { error } = await supabase.from("ledger_transactions").insert({
        created_by: userId,
        type: input.type,
        source_account: input.source_account,
        destination_account: input.destination_account ?? null,
        amount_cents: input.amount_cents,
        description: input.description ?? null,
        reference_id: input.reference_id ?? null,
        metadata: input.metadata ?? {},
    });

    if (error) {
        console.error("Erro ao inserir no Ledger:", error);
        throw error;
    }
}
