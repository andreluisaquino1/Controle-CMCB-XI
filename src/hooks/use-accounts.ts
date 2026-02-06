import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Account, Entity } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { MOCK_ENTITIES } from "@/demo/demoSeed";

export function useAccounts(includeInactive = false) {
  const { isDemo } = useAuth();
  const { accounts } = useDemoData();

  const query = useQuery({
    queryKey: ["accounts", includeInactive],
    queryFn: async () => {
      let baseQuery = supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (!includeInactive) {
        baseQuery = baseQuery.eq("active", true);
      }

      const { data, error } = await baseQuery;

      if (error) throw error;
      return data as Account[];
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    const data = includeInactive ? accounts : accounts.filter(a => a.active);
    return { ...query, data: data as unknown as Account[], isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useAccountsByEntityType(entityType: "associacao" | "ue" | "cx" | null, includeInactive = false) {
  const { isDemo } = useAuth();
  const { accounts } = useDemoData();

  const query = useQuery({
    queryKey: ["accounts", "by-entity-type", entityType, includeInactive],
    queryFn: async () => {
      if (!entityType) return [];

      const { data: entities, error: entityError } = await supabase
        .from("entities")
        .select("id")
        .eq("type", entityType);

      if (entityError) throw entityError;
      if (!entities || entities.length === 0) return [];

      const entityIds = entities.map(e => e.id);

      let baseQuery = supabase
        .from("accounts")
        .select("*")
        .in("entity_id", entityIds)
        .order("name");

      if (!includeInactive) {
        baseQuery = baseQuery.eq("active", true);
      }

      const { data, error } = await baseQuery;

      if (error) throw error;
      return data as Account[];
    },
    enabled: !!entityType && !isDemo,
  });

  if (isDemo) {
    const entity = MOCK_ENTITIES.find(e => e.type === entityType);
    let filtered = entity ? accounts.filter(a => a.entity_id === entity.id) : [];
    if (!includeInactive) filtered = filtered.filter(a => a.active);
    return { ...query, data: filtered as unknown as Account[], isLoading: false, isError: false };
  }

  return query;
}

export function useEntities() {
  const { isDemo } = useAuth();

  const query = useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Entity[];
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    return { ...query, data: MOCK_ENTITIES as unknown as Entity[], isLoading: false };
  }

  return query;
}

export function useEntitiesWithAccounts(includeInactive = false) {
  const { isDemo } = useAuth();
  const { accounts: demoAccounts } = useDemoData();

  const query = useQuery({
    queryKey: ["entities-with-accounts", includeInactive],
    queryFn: async () => {
      const { data: entities, error: entitiesError } = await supabase
        .from("entities")
        .select("*")
        .order("name");

      if (entitiesError) throw entitiesError;

      let accQuery = supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (!includeInactive) {
        accQuery = accQuery.eq("active", true);
      }

      const { data: accounts, error: accountsError } = await accQuery;

      if (accountsError) throw accountsError;

      return {
        entities: entities as Entity[],
        accounts: accounts as Account[],
      };
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    const accounts = includeInactive ? demoAccounts : demoAccounts.filter(a => a.active);
    return {
      ...query,
      data: { entities: MOCK_ENTITIES as unknown as Entity[], accounts: accounts as unknown as Account[] },
      isLoading: false
    };
  }

  return query;
}

export function useAssociacaoAccounts() {
  const { isDemo } = useAuth();
  const { accounts: demoAccounts } = useDemoData();

  const query = useQuery({
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
    enabled: !isDemo,
  });

  if (isDemo) {
    const assoc = MOCK_ENTITIES.find(e => e.type === 'associacao');
    const filtered = assoc ? demoAccounts.filter(a => a.entity_id === assoc.id) : [];
    return { ...query, data: filtered as unknown as Account[], isLoading: false };
  }

  return query;
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
export function useActivateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .update({ active: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Conta reativada.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível reativar.");
    },
  });
}
