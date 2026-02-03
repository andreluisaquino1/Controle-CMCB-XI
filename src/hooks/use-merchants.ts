import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Merchant {
  id: string;
  name: string;
  balance: number;
  active: boolean;
}

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
  const { toast } = useToast();
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
      toast({
        title: "Estabelecimento adicionado",
        description: `${variables.name} foi adicionado com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível adicionar o estabelecimento.",
        variant: "destructive",
      });
    },
  });
}
