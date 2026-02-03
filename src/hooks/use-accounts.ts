import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Account {
  id: string;
  name: string;
  balance: number;
  type: string;
  entity_id: string;
  bank: string | null;
  agency: string | null;
  account_number: string | null;
}

interface Entity {
  id: string;
  name: string;
  type: string;
  cnpj: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useAccountsByEntityType(entityType: "associacao" | "ue" | "cx" | null) {
  return useQuery({
    queryKey: ["accounts", "by-entity-type", entityType],
    queryFn: async () => {
      if (!entityType) return [];
      
      // First get entity id by type
      const { data: entities, error: entityError } = await supabase
        .from("entities")
        .select("id")
        .eq("type", entityType);
      
      if (entityError) throw entityError;
      if (!entities || entities.length === 0) return [];
      
      const entityIds = entities.map(e => e.id);
      
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .in("entity_id", entityIds)
        .order("name");
      
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!entityType,
  });
}

export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Entity[];
    },
  });
}

export function useEntitiesWithAccounts() {
  return useQuery({
    queryKey: ["entities-with-accounts"],
    queryFn: async () => {
      const { data: entities, error: entitiesError } = await supabase
        .from("entities")
        .select("*")
        .order("name");

      if (entitiesError) throw entitiesError;

      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (accountsError) throw accountsError;

      return {
        entities: entities as Entity[],
        accounts: accounts as Account[],
      };
    },
  });
}

export function useAssociacaoAccounts() {
  return useQuery({
    queryKey: ["accounts", "associacao"],
    queryFn: async () => {
      // Get Associação entity
      const { data: entity, error: entityError } = await supabase
        .from("entities")
        .select("id")
        .eq("type", "associacao")
        .single();
      
      if (entityError) throw entityError;
      
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("entity_id", entity.id)
        .order("name");
      
      if (error) throw error;
      return data as Account[];
    },
  });
}

export function useUpdateMerchant() {
  const { toast } = useToast();
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Sucesso",
        description: "Estabelecimento atualizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar.",
        variant: "destructive",
      });
    },
  });
}

export function useDeactivateMerchant() {
  const { toast } = useToast();
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({
        title: "Sucesso",
        description: "Estabelecimento desativado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível desativar.",
        variant: "destructive",
      });
    },
  });
}
