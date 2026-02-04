import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Account, Entity } from "@/types";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("active", true)
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
        .eq("active", true)
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
        .eq("active", true)
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
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data as Account[];
    },
  });
}

// Mutations for Account Management

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      account_number,
      entity_id,
    }: {
      name: string;
      account_number?: string;
      entity_id: string;
    }) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          name,
          account_number: account_number || null,
          entity_id,
          active: true,
          balance: 0,
          type: 'bank' // Using a valid bank type
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Conta adicionada com sucesso.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível adicionar a conta.");
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      account_number,
    }: {
      id: string;
      name: string;
      account_number?: string;
    }) => {
      const { error } = await supabase
        .from("accounts")
        .update({
          name,
          account_number: account_number || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Conta atualizada.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível atualizar.");
    },
  });
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Conta desativada.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível desativar.");
    },
  });
}
