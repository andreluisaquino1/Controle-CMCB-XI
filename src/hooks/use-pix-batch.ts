import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";

export interface PixFeeItem {
    amount: number;
    description: string;
    occurred_at?: string;
}

export interface PixFeeBatchPayload {
    items: PixFeeItem[];
    reference?: string;
    occurred_at?: string;
}

export interface TransactionItem {
    id: string;
    amount: number;
    description: string | null;
    occurred_at: string | null;
    created_at: string;
}

import { createLedgerTransaction } from "@/domain/ledger";
import { LEDGER_KEYS } from "@/lib/constants";

export function useCreatePixFeeBatch() {
    const { isDemo } = useAuth();
    const { addTransaction } = useDemoData();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            entityId,
            payload,
        }: {
            entityId: string;
            payload: PixFeeBatchPayload;
        }) => {
            if (isDemo) {
                // In demo, we just create a single representative transaction for the batch or individual ones.
                // To keep it simple, one transaction for the sum.
                const total = payload.items.reduce((acc, item) => acc + item.amount, 0);
                const mockTx = {
                    id: crypto.randomUUID(),
                    date: payload.occurred_at || new Date().toISOString(),
                    description: payload.reference || 'Lote de Taxas PIX Demo',
                    amount: total,
                    type: 'expense' as const,
                    category: 'taxa',
                    account_id: 'acc_pix', // Defaulting to PIX account for fees
                    module: 'taxas_pix'
                };
                addTransaction(mockTx);
                return mockTx;
            }

            // Aggregate all items into a single Ledger Transaction
            const validItems = payload.items.filter(item => item.amount > 0);
            if (validItems.length === 0) return [];

            const totalAmountCents = validItems.reduce((acc, item) => acc + Math.round(item.amount * 100), 0);
            const itemCount = validItems.length;
            const summaryDescription = `Lote de Tarifas PIX (${itemCount} itens)${payload.reference ? ` - ${payload.reference}` : ""}`;

            await createLedgerTransaction({
                type: 'fee',
                source_account: LEDGER_KEYS.PIX,
                amount_cents: totalAmountCents,
                description: summaryDescription,
                metadata: {
                    modulo: 'taxa_pix_bb',
                    batch_reference: payload.reference,
                    item_count: itemCount,
                    items: validItems.map(item => ({
                        amount: item.amount,
                        description: item.description,
                        occurred_at: item.occurred_at
                    }))
                }
            });

            return validItems;
        },
        onSettled: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
                queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] }),
                queryClient.invalidateQueries({ queryKey: ["accounts"] }),
                queryClient.invalidateQueries({ queryKey: ["all-transactions"] })
            ]);
            toast.success("Taxas PIX lançadas com sucesso!");
        },
        onError: (error: Error) => {
            console.error("Pix Batch error:", error);
            toast.error(error.message || "Erro ao lançar taxas.");
        },
    });
}

export function useTransactionItems(parentTransactionId: string | null) {
    const { user, isDemo } = useAuth();

    return useQuery({
        queryKey: ["transaction-items", parentTransactionId],
        queryFn: async () => {
            if (!parentTransactionId) return [];
            if (isDemo) return []; // Demo doesn't track child items yet for simplicity

            const { data, error } = await supabase.rpc("get_transaction_items", {
                p_parent_transaction_id: parentTransactionId,
            });

            if (error) throw error;
            return data as unknown as TransactionItem[];
        },
        enabled: !!parentTransactionId && !!user,
    });
}
