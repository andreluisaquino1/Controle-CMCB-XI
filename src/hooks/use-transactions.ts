import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Account, DashboardData, Merchant } from "@/types";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";
import { useDemoData } from "@/demo/useDemoData";

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

export function useCreateTransaction() {
  const { user, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const { addTransaction } = useDemoData();

  return useMutation({
    mutationFn: async ({
      transaction,
    }: {
      transaction: CreateTransactionData;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      if (isDemo) {
        const mockTx = {
          id: crypto.randomUUID(),
          date: transaction.transaction_date,
          description: transaction.description || 'Lançamento Demo',
          amount: transaction.amount,
          type: transaction.direction === 'in' ? 'income' : 'expense',
          category: transaction.module,
          account_id: transaction.destination_account_id || transaction.source_account_id || '',
          merchant_id: transaction.merchant_id || undefined,
          source_account_id: transaction.source_account_id || undefined,
          destination_account_id: transaction.destination_account_id || undefined,
          module: transaction.module
        };
        // @ts-ignore
        addTransaction(mockTx);
        return mockTx as any;
      }

      const { data: txn, error: txnError } = await supabase
        .rpc("process_transaction", {
          p_tx: {
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
            parent_transaction_id: transaction.parent_transaction_id || null,
          }
        })
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

        // Generic balance adjustment based on direction and account name
        if (transaction.direction === "in" || transaction.direction === "out") {
          const isAdd = transaction.direction === "in";
          const accId = isAdd ? transaction.destination_account_id : transaction.source_account_id;

          if (accId && previousAccounts) {
            const acc = previousAccounts.find(a => a.id === accId);
            if (acc) {
              if (acc.name === ACCOUNT_NAMES.ESPECIE) newDashboard.especieBalance += (isAdd ? amount : -amount);
              else if (acc.name === ACCOUNT_NAMES.PIX) newDashboard.pixBalance += (isAdd ? amount : -amount);
              else if (acc.name === ACCOUNT_NAMES.COFRE) newDashboard.cofreBalance += (isAdd ? amount : -amount);
              else if (acc.name === ACCOUNT_NAMES.CONTA_DIGITAL) newDashboard.contaDigitalBalance += (isAdd ? amount : -amount);
            }
          }
        }

        if ((transaction.direction === "transfer" || transaction.module === "assoc_transfer") && transaction.source_account_id && transaction.destination_account_id) {
          const srcAcc = previousAccounts?.find(a => a.id === transaction.source_account_id);
          const dstAcc = previousAccounts?.find(a => a.id === transaction.destination_account_id);

          if (srcAcc) {
            if (srcAcc.name === ACCOUNT_NAMES.ESPECIE) newDashboard.especieBalance -= amount;
            else if (srcAcc.name === ACCOUNT_NAMES.PIX) newDashboard.pixBalance -= amount;
            else if (srcAcc.name === ACCOUNT_NAMES.COFRE) newDashboard.cofreBalance -= amount;
            else if (srcAcc.name === ACCOUNT_NAMES.CONTA_DIGITAL) newDashboard.contaDigitalBalance -= amount;
          }
          if (dstAcc) {
            if (dstAcc.name === ACCOUNT_NAMES.ESPECIE) newDashboard.especieBalance += amount;
            else if (dstAcc.name === ACCOUNT_NAMES.PIX) newDashboard.pixBalance += amount;
            else if (dstAcc.name === ACCOUNT_NAMES.COFRE) newDashboard.cofreBalance += amount;
            else if (dstAcc.name === ACCOUNT_NAMES.CONTA_DIGITAL) newDashboard.contaDigitalBalance += amount;
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

          if (transaction.direction === "transfer" || transaction.module === "assoc_transfer") {
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

export function useCreateResourceTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transaction,
    }: {
      transaction: any;
    }) => {
      const { data: txn, error: txnError } = await supabase
        .rpc("process_resource_transaction", {
          p_tx: transaction
        })
        .single();

      if (txnError) throw txnError;
      return txn;
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
    onError: (error: Error) => {
      console.error("Resource Transaction error:", error);
      toast.error(error.message || "Não foi possível registrar a operação de recurso.");
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
      const { data, error } = await supabase.rpc("void_transaction", {
        p_id: transactionId,
        p_reason: reason,
      });

      if (error) throw error;
      return data;
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
