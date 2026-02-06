import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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

export function useCreatePixFeeBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            entityId,
            payload,
        }: {
            entityId: string;
            payload: PixFeeBatchPayload;
        }) => {
            // @ts-ignore - RPC not typed
            const { data, error } = await supabase.rpc("process_pix_fee_batch", {
                p_entity_id: entityId,
                p_payload: payload as any,
            });

            if (error) throw error;
            return data;
        },
        onSettled: () => {
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
    const { user } = useAuth();

    return useQuery({
        queryKey: ["transaction-items", parentTransactionId],
        queryFn: async () => {
            if (!parentTransactionId) return [];
            // @ts-ignore - RPC not typed
            const { data, error } = await supabase.rpc("get_transaction_items", {
                p_parent_transaction_id: parentTransactionId,
            });

            if (error) throw error;
            return data as TransactionItem[];
        },
        enabled: !!parentTransactionId && !!user,
    });
}
