import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Merchant } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";

export function useMerchants(includeInactive = false) {
  const { isDemo } = useAuth();
  const { merchants } = useDemoData();

  const query = useQuery({
    queryKey: ["merchants", includeInactive],
    queryFn: async () => {
      // 1. Fetch Merchants
      let baseQuery = supabase
        .from("merchants")
        .select("*")
        .order("name");

      if (!includeInactive) {
        baseQuery = baseQuery.eq("active", true);
      }

      const { data: merchantsData, error: merchantsError } = await baseQuery;
      if (merchantsError) throw merchantsError;

      // 2. Fetch Ledger Balances for these merchants
      // We assume the Ledger Account ID for a merchant IS the merchant.id
      const merchantIds = merchantsData.map(m => m.id);

      // Fetch all columns to be safe about column names (account vs account_key)
      const { data: balancesData, error: balancesError } = await supabase
        .from("ledger_balances")
        .select("*")
        .in("account", merchantIds); // Try 'account' first as per SQL file

      if (balancesError) {
        // If 'account' column fails, maybe try generic select if needed, but for now log warning
        console.warn("Could not fetch ledger balances for merchants", balancesError);
      }

      const balanceMap = new Map();
      if (balancesData) {
        balancesData.forEach((b: any) => {
          // Handle potential column name differences
          const accountId = b.account || b.account_key || b.account_id;
          const balance = (b.balance_cents || 0) / 100;
          if (accountId) {
            balanceMap.set(accountId, balance);
          }
        });
      }

      return merchantsData.map(m => ({
        ...m,
        balance: balanceMap.has(m.id) ? balanceMap.get(m.id) : (Number(m.balance) || 0) // Prefer Ledger, fallback to table
      })) as Merchant[];
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    const data = includeInactive ? merchants : merchants.filter(m => m.active);
    return { ...query, data: data as unknown as Merchant[], isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useCreateMerchant() {
  const { isDemo } = useAuth();
  const { createMerchant } = useDemoData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
    }: {
      name: string;
    }) => {
      if (isDemo) {
        return createMerchant(name);
      }
      const { data, error } = await supabase
        .from("merchants")
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`${variables.name} foi adicionado com sucesso.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível adicionar o estabelecimento.");
    },
  });
}

export function useUpdateMerchant() {
  const { isDemo } = useAuth();
  const { updateMerchant } = useDemoData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (isDemo) {
        updateMerchant(id, name);
        return;
      }
      const { error } = await supabase
        .from("merchants")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Estabelecimento atualizado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível atualizar.");
    },
  });
}

export function useDeactivateMerchant() {
  const queryClient = useQueryClient();
  const { isDemo } = useAuth();
  const { setMerchantActive } = useDemoData();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        setMerchantActive(id, false);
        return;
      }
      const { error } = await supabase
        .from("merchants")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Estabelecimento desativado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível desativar.");
    },
  });
}
export function useActivateMerchant() {
  const queryClient = useQueryClient();
  const { isDemo } = useAuth();
  const { setMerchantActive } = useDemoData();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        setMerchantActive(id, true);
        return;
      }
      const { error } = await supabase
        .from("merchants")
        .update({ active: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Estabelecimento reativado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível reativar.");
    },
  });
}
