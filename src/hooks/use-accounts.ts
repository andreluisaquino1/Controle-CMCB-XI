import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Account, Entity } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { MOCK_ENTITIES } from "@/demo/demoSeed";
import { demoStore } from "@/demo/demoStore";
import { ACCOUNT_NAME_TO_LEDGER_KEY } from "@/lib/constants";
import { accountService } from "@/services/accountService";

export function useAccounts(includeInactive = false) {
  const { isDemo } = useAuth();
  const { accounts } = useDemoData();

  const query = useQuery({
    queryKey: ["accounts", includeInactive],
    queryFn: async () => {
      const { accounts: accountsData } = await accountService.getEntitiesWithAccounts(includeInactive);
      const ledgerMap = await fetchLedgerBalancesMap();
      return mergeBalances(accountsData, ledgerMap);
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    const demoAccounts = accounts.length > 0 ? accounts : demoStore.getAccounts();
    const data = includeInactive ? demoAccounts : demoAccounts.filter(a => a.active);
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

      const { entities } = await accountService.getEntitiesWithAccounts(includeInactive);
      const filteredEntities = entities.filter(e => e.type === entityType);

      if (filteredEntities.length === 0) return [];
      const entityIds = filteredEntities.map(e => e.id);

      const { accounts: accountsData } = await accountService.getEntitiesWithAccounts(includeInactive);
      const filteredAccounts = accountsData.filter(a => entityIds.includes(a.entity_id));

      const ledgerMap = await fetchLedgerBalancesMap();
      return mergeBalances(filteredAccounts, ledgerMap);
    },
    enabled: !!entityType && !isDemo,
  });

  if (isDemo) {
    const demoAccounts = accounts.length > 0 ? accounts : demoStore.getAccounts();
    const entity = MOCK_ENTITIES.find(e => e.type === entityType);
    let filtered = entity ? demoAccounts.filter(a => a.entity_id === entity.id) : [];
    if (!includeInactive) filtered = filtered.filter(a => a.active);
    return { ...query, data: filtered as unknown as Account[], isLoading: false, isError: false };
  }

  return query;
}

export function useEntities() {
  const { isDemo } = useAuth();

  const query = useQuery({
    queryKey: ["entities"],
    queryFn: () => accountService.getEntities(),
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
      const { entities, accounts: accountsData } = await accountService.getEntitiesWithAccounts(includeInactive);
      const ledgerMap = await fetchLedgerBalancesMap();
      const mergedAccounts = mergeBalances(accountsData, ledgerMap);

      return {
        entities,
        accounts: mergedAccounts,
      };
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    const accountsData = demoAccounts.length > 0 ? demoAccounts : demoStore.getAccounts();
    const accounts = includeInactive ? accountsData : accountsData.filter(a => a.active);
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
      const entities = await accountService.getEntities();
      const entity = entities.find(e => e.type === "associacao");

      if (!entity) return [];

      const { accounts: accountsData } = await accountService.getEntitiesWithAccounts(false);
      const filteredAccounts = accountsData.filter(a => a.entity_id === entity.id);

      const ledgerMap = await fetchLedgerBalancesMap();
      return mergeBalances(filteredAccounts, ledgerMap);
    },
    enabled: !isDemo,
  });

  if (isDemo) {
    const accountsData = demoAccounts.length > 0 ? demoAccounts : demoStore.getAccounts();
    const assoc = MOCK_ENTITIES.find(e => e.type === 'associacao');
    const filtered = assoc ? accountsData.filter(a => a.entity_id === assoc.id) : [];
    return { ...query, data: filtered as unknown as Account[], isLoading: false };
  }

  return query;
}

// Mutations for Account Management

export function useCreateAccount() {
  const { isDemo } = useAuth();
  const { createAccount } = useDemoData();
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
      if (isDemo) {
        return createAccount(name, entity_id, account_number);
      }
      return accountService.createAccount({ name, account_number, entity_id });
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
  const { isDemo } = useAuth();
  const { updateAccount } = useDemoData();
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
      if (isDemo) {
        updateAccount(id, name, account_number);
        return;
      }
      return accountService.updateAccount(id, { name, account_number });
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
  const { isDemo } = useAuth();
  const { setAccountActive } = useDemoData();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        setAccountActive(id, false);
        return;
      }
      return accountService.setAccountActive(id, false);
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
  const { isDemo } = useAuth();
  const { setAccountActive } = useDemoData();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        setAccountActive(id, true);
        return;
      }
      return accountService.setAccountActive(id, true);
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

import { extendedSupabase } from "@/integrations/supabase/extendedClient";

// Helpers
async function fetchLedgerBalancesMap() {
  const { data, error } = await extendedSupabase.rpc("get_ledger_balance_map");
  if (error) throw error;

  const map = new Map<string, number>();
  (data ?? []).forEach((row) => {
    if (row.account_id) {
      map.set(row.account_id, (row.balance_cents || 0) / 100);
    }
  });
  return map;
}

function mergeBalances(accounts: Account[], ledgerMap: Map<string, number>): Account[] {
  return accounts.map(acc => {
    // First, try to match by account name (for Associação accounts)
    const ledgerKey = ACCOUNT_NAME_TO_LEDGER_KEY[acc.name];
    if (ledgerKey && ledgerMap.has(ledgerKey)) {
      return { ...acc, balance: ledgerMap.get(ledgerKey)! };
    }

    // For resource accounts (UE/CX), check if ledger has balance using account ID
    if (ledgerMap.has(acc.id)) {
      return { ...acc, balance: ledgerMap.get(acc.id)! };
    }

    // If mapped by name but no balance found, assume 0 (Ledger authority)
    if (ledgerKey) {
      return { ...acc, balance: 0 };
    }

    // For unmapped accounts without ledger data, keep original balance
    return acc;
  });
}
