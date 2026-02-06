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
      let baseQuery = supabase
        .from("merchants")
        .select("*")
        .order("name");

      if (!includeInactive) {
        baseQuery = baseQuery.eq("active", true);
      }

      const { data, error } = await baseQuery;

      if (error) throw error;
      return data as Merchant[];
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
    }: {
      name: string;
    }) => {
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
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

  return useMutation({
    mutationFn: async (id: string) => {
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

  return useMutation({
    mutationFn: async (id: string) => {
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
