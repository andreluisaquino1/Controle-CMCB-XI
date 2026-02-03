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
