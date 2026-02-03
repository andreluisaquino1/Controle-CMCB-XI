import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CreateTransactionData {
  transaction_date: string;
  module: string;
  entity_id?: string | null;
  source_account_id?: string | null;
  destination_account_id?: string | null;
  merchant_id?: string | null;
  amount: number;
  direction: "in" | "out" | "transfer";
  payment_method?: "cash" | "pix" | null;
  origin_fund?: "UE" | "CX" | null;
  capital_custeio?: "capital" | "custeio" | null;
  shift?: "matutino" | "vespertino" | null;
  description?: string | null;
  notes?: string | null;
}

interface UpdateAccountBalance {
  accountId: string;
  amount: number;
  operation: "add" | "subtract";
}

interface UpdateMerchantBalance {
  merchantId: string;
  amount: number;
  operation: "add" | "subtract";
}

export function useCreateTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transaction,
    }: {
      transaction: CreateTransactionData;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data: txn, error: txnError } = await supabase
        .from("transactions")
        .insert([{
          transaction_date: transaction.transaction_date,
          module: transaction.module as any,
          entity_id: transaction.entity_id || null,
          source_account_id: transaction.source_account_id || null,
          destination_account_id: transaction.destination_account_id || null,
          merchant_id: transaction.merchant_id || null,
          amount: transaction.amount,
          direction: transaction.direction,
          payment_method: transaction.payment_method || null,
          origin_fund: transaction.origin_fund || null,
          capital_custeio: transaction.capital_custeio || null,
          shift: transaction.shift || null,
          description: transaction.description || null,
          notes: transaction.notes || null,
          created_by: user.id,
        }])
        .select()
        .single();

      if (txnError) throw txnError;
      return txn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["saldos-transactions"] });
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível registrar a operação.",
        variant: "destructive",
      });
    },
  });
}

export function useVoidTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      reason,
    }: {
      transactionId: string;
      reason: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data: originalTxn, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "voided",
          edited_reason: reason,
        })
        .eq("id", transactionId);

      if (updateError) throw updateError;

      const { error: auditError } = await supabase.from("audit_logs").insert({
        transaction_id: transactionId,
        action: "void",
        before_json: originalTxn,
        after_json: { ...originalTxn, status: "voided", edited_reason: reason },
        reason,
        user_id: user.id,
      });

      if (auditError) throw auditError;

      return originalTxn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["saldos-transactions"] });
      toast({
        title: "Transação anulada",
        description: "A transação foi anulada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Void error:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível anular a transação.",
        variant: "destructive",
      });
    },
  });
}
