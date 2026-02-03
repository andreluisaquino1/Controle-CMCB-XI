import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Merchant } from "@/types";

export function useMerchants() {
  return useQuery({
    queryKey: ["merchants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data as Merchant[];
    },
  });
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
    onError: (error: any) => {
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
    onError: (error: any) => {
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
    onError: (error: any) => {
      toast.error(error.message || "Não foi possível desativar.");
    },
  });
}
