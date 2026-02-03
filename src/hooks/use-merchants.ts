import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Merchant {
  id: string;
  name: string;
  balance: number;
  mode: "saldo";
  active: boolean;
}

export function useMerchants(mode?: "saldo") {
  return useQuery({
    queryKey: ["merchants", mode],
    queryFn: async () => {
      let query = supabase
        .from("merchants")
        .select("*")
        .eq("active", true)
        .order("name");

      if (mode) {
        query = query.eq("mode", mode);
      }

      const { data, error } = await query;
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
      mode,
    }: {
      name: string;
      mode: "saldo";
    }) => {
      const { data, error } = await supabase
        .from("merchants")
        .insert({ name, mode })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
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
