import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Account, DashboardData, Merchant } from "@/types";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";
import { useDemoData } from "@/demo/useDemoData";
import { transactionService } from "@/services/transactionService";

type TransactionModule = Database["public"]["Enums"]["transaction_module"];

interface CreateTransactionData {
  transaction_date: string;
  module: TransactionModule;
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
  parent_transaction_id?: string | null;
}

// useCreateTransaction and useCreateResourceTransaction were removed in favor of transactionService


export function useVoidTransaction() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const { voidTransaction } = useDemoData();

  return useMutation({
    mutationFn: async ({
      transactionId,
      reason,
    }: {
      transactionId: string;
      reason: string;
    }) => {
      if (isDemo) {
        voidTransaction(transactionId);
        return { success: true };
      }

      return transactionService.voidTransaction(transactionId, reason);
    },
    onError: (error: Error) => {
      console.error("Void error:", error);
      toast.error(error.message || "Não foi possível anular a transação.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["saldos-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recursos-transactions"] });
      toast.success("A transação foi anulada com sucesso.");
    },
  });
}
export function useApproveTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      return transactionService.approveTransaction(transactionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["all-transactions"] });
      toast.success("Transação validada com sucesso.");
    },
    onError: (error: Error) => {
      console.error("Approval error:", error);
      toast.error(error.message || "Não foi possível validar a transação.");
    },
  });
}
