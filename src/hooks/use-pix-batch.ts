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

            // Loop through items and create Ledger Transactions locally
            // This replaces the RPC 'process_pix_fee_batch'
            const results = [];
            for (const item of payload.items) {
                // Validate item
                if (item.amount <= 0) continue;

                await createLedgerTransaction({
                    type: 'fee', // Using 'fee' type for PIX fees
                    source_account: LEDGER_KEYS.PIX, // Always PIX account
                    amount_cents: Math.round(item.amount * 100),
                    description: item.description,
                    metadata: {
                        modulo: 'taxa_pix_bb',
                        reference: payload.reference,
                        occurred_at: item.occurred_at,
                        batch_reference: payload.reference
                    }
                });
                results.push(item);
            }
            return results;
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] });
            queryClient.invalidateQueries({ queryKey: ["account_balances"] });
            // Keep legacy invalids just in case
            queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
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

            // @ts-expect-error - RPC not typed
            const { data, error } = await supabase.rpc("get_transaction_items", {
                p_parent_transaction_id: parentTransactionId,
            });

            if (error) throw error;
            return data as unknown as TransactionItem[];
        },
        enabled: !!parentTransactionId && !!user,
    });
}
