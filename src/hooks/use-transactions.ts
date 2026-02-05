import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Account, DashboardData, Merchant } from "@/types";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";

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
}

export function useCreateTransaction() {
  const { user } = useAuth();
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
          module: transaction.module,
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
    onMutate: async ({ transaction }) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-data"] });
      await queryClient.cancelQueries({ queryKey: ["accounts"] });
      await queryClient.cancelQueries({ queryKey: ["merchants"] });

      const previousDashboard = queryClient.getQueryData<DashboardData>(["dashboard-data"]);
      const previousAccounts = queryClient.getQueryData<Account[]>(["accounts"]);
      const previousMerchants = queryClient.getQueryData<Merchant[]>(["merchants"]);

      if (previousDashboard) {
        const newDashboard = { ...previousDashboard };
        const amount = Number(transaction.amount);

        if (transaction.module === "mensalidade") {
          if (transaction.payment_method === "cash") {
            newDashboard.especieBalance += amount;
          } else if (transaction.payment_method === "pix") {
            newDashboard.pixBalance += amount;
          }
        }

        if (transaction.direction === "in" || transaction.direction === "out") {
          const isAdd = transaction.direction === "in";
          const accId = isAdd ? transaction.destination_account_id : transaction.source_account_id;

          if (accId && previousAccounts) {
            const acc = previousAccounts.find(a => a.id === accId);
            if (acc) {
              if (acc.name === ACCOUNT_NAMES.ESPECIE) newDashboard.especieBalance += (isAdd ? amount : -amount);
              if (acc.name === ACCOUNT_NAMES.PIX) newDashboard.pixBalance += (isAdd ? amount : -amount);
              if (acc.name === ACCOUNT_NAMES.COFRE) newDashboard.cofreBalance += (isAdd ? amount : -amount);
            }
          }
        }

        if (transaction.direction === "transfer" && transaction.source_account_id && transaction.destination_account_id) {
          const srcAcc = previousAccounts?.find(a => a.id === transaction.source_account_id);
          const dstAcc = previousAccounts?.find(a => a.id === transaction.destination_account_id);

          if (srcAcc) {
            if (srcAcc.name === ACCOUNT_NAMES.ESPECIE) newDashboard.especieBalance -= amount;
            if (srcAcc.name === ACCOUNT_NAMES.PIX) newDashboard.pixBalance -= amount;
            if (srcAcc.name === ACCOUNT_NAMES.COFRE) newDashboard.cofreBalance -= amount;
          }
          if (dstAcc) {
            if (dstAcc.name === ACCOUNT_NAMES.ESPECIE) newDashboard.especieBalance += amount;
            if (dstAcc.name === ACCOUNT_NAMES.PIX) newDashboard.pixBalance += amount;
            if (dstAcc.name === ACCOUNT_NAMES.COFRE) newDashboard.cofreBalance += amount;
          }
        }

        if (transaction.merchant_id) {
          const mIdx = newDashboard.merchantBalances.findIndex(m => m.id === transaction.merchant_id);
          if (mIdx !== -1) {
            const m = { ...newDashboard.merchantBalances[mIdx] };
            if (transaction.module === "aporte_saldo" || transaction.module === "aporte_estabelecimento_recurso") {
              m.balance += amount;
            } else if (transaction.module === "consumo_saldo") {
              m.balance -= amount;
            }
            newDashboard.merchantBalances[mIdx] = m;
          }
        }

        queryClient.setQueryData(["dashboard-data"], newDashboard);
      }

      if (previousAccounts) {
        const newAccounts = previousAccounts.map(acc => {
          const amount = Number(transaction.amount);
          let newBalance = acc.balance;

          if (transaction.direction === "transfer") {
            if (acc.id === transaction.source_account_id) newBalance -= amount;
            if (acc.id === transaction.destination_account_id) newBalance += amount;
          } else if (transaction.direction === "in" && acc.id === transaction.destination_account_id) {
            newBalance += amount;
          } else if (transaction.direction === "out" && acc.id === transaction.source_account_id) {
            newBalance -= amount;
          }

          return { ...acc, balance: newBalance };
        });
        queryClient.setQueryData(["accounts"], newAccounts);
      }

      return { previousDashboard, previousAccounts, previousMerchants };
    },
    onError: (error: Error, __, context) => {
      console.error("Transaction error:", error);
      if (context) {
        queryClient.setQueryData(["dashboard-data"], context.previousDashboard);
        queryClient.setQueryData(["accounts"], context.previousAccounts);
        queryClient.setQueryData(["merchants"], context.previousMerchants);
      }
      toast.error(error.message || "Não foi possível registrar a operação.");
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
    },
  });
}

export function useVoidTransaction() {
  const { user } = useAuth();
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
