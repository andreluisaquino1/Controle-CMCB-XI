import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  transaction_date: string;
  module: string;
  amount: number;
  direction: string;
  payment_method: string | null;
  shift: string | null;
  description: string | null;
  notes: string | null;
  status: string;
  created_by: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  merchant_id: string | null;
  origin_fund: string | null;
  entity_id: string | null;
  created_at: string;
}

interface TransactionWithCreator extends Transaction {
  creator_name: string | null;
  source_account_name: string | null;
  destination_account_name: string | null;
  merchant_name: string | null;
}

export function useAssociacaoTransactions() {
  return useQuery({
    queryKey: ["transactions", "associacao"],
    queryFn: async () => {
      // First get the associacao entity id
      const { data: entity } = await supabase
        .from("entities")
        .select("id")
        .eq("type", "associacao")
        .single();

      if (!entity) return [];

      // Get transactions for associacao
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("entity_id", entity.id)
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get profiles for creator names
      const { data: profiles } = await supabase.from("profiles").select("user_id, name");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

      // Get accounts for names
      const { data: accounts } = await supabase.from("accounts").select("id, name");
      const accountMap = new Map(accounts?.map((a) => [a.id, a.name]) || []);

      // Get merchants for names
      const { data: merchants } = await supabase.from("merchants").select("id, name");
      const merchantMap = new Map(merchants?.map((m) => [m.id, m.name]) || []);

      return (transactions || []).map((t): TransactionWithCreator => ({
        ...t,
        creator_name: profileMap.get(t.created_by) || null,
        source_account_name: t.source_account_id ? accountMap.get(t.source_account_id) || null : null,
        destination_account_name: t.destination_account_id ? accountMap.get(t.destination_account_id) || null : null,
        merchant_name: t.merchant_id ? merchantMap.get(t.merchant_id) || null : null,
      }));
    },
  });
}

export function useRecursosTransactions() {
  return useQuery({
    queryKey: ["transactions", "recursos"],
    queryFn: async () => {
      // Get transactions for recursos (pix_direto_uecx)
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("module", "pix_direto_uecx")
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get profiles for creator names
      const { data: profiles } = await supabase.from("profiles").select("user_id, name");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

      // Get accounts for names
      const { data: accounts } = await supabase.from("accounts").select("id, name, entity_id");
      const accountMap = new Map(accounts?.map((a) => [a.id, { name: a.name, entity_id: a.entity_id }]) || []);

      // Get entities
      const { data: entities } = await supabase.from("entities").select("id, name, type, cnpj");
      const entityMap = new Map(entities?.map((e) => [e.id, e]) || []);

      return (transactions || []).map((t): TransactionWithCreator & { entity_type: string | null, entity_cnpj: string | null } => {
        const accountInfo = t.source_account_id ? accountMap.get(t.source_account_id) : null;
        const entityInfo = accountInfo?.entity_id ? entityMap.get(accountInfo.entity_id) : null;

        return {
          ...t,
          creator_name: profileMap.get(t.created_by) || null,
          source_account_name: accountInfo?.name || null,
          destination_account_name: null,
          merchant_name: null,
          entity_type: entityInfo?.type || null,
          entity_cnpj: entityInfo?.cnpj || null,
        };
      });
    },
  });
}

export function useSaldosTransactions() {
  return useQuery({
    queryKey: ["transactions", "saldos"],
    queryFn: async () => {
      // Get transactions for saldos (aporte_saldo and consumo_saldo)
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .in("module", ["aporte_saldo", "consumo_saldo"])
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get profiles for creator names
      const { data: profiles } = await supabase.from("profiles").select("user_id, name");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

      // Get accounts for names
      const { data: accounts } = await supabase.from("accounts").select("id, name");
      const accountMap = new Map(accounts?.map((a) => [a.id, a.name]) || []);

      // Get merchants for names
      const { data: merchants } = await supabase.from("merchants").select("id, name");
      const merchantMap = new Map(merchants?.map((m) => [m.id, m.name]) || []);

      return (transactions || []).map((t): TransactionWithCreator => ({
        ...t,
        creator_name: profileMap.get(t.created_by) || null,
        source_account_name: t.source_account_id ? accountMap.get(t.source_account_id) || null : null,
        destination_account_name: t.destination_account_id ? accountMap.get(t.destination_account_id) || null : null,
        merchant_name: t.merchant_id ? merchantMap.get(t.merchant_id) || null : null,
      }));
    },
  });
}

export function useAllTransactionsWithCreator(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["transactions", "all-with-creator", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (startDate) {
        query = query.gte("transaction_date", startDate);
      }
      if (endDate) {
        query = query.lte("transaction_date", endDate);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Get profiles for creator names
      const { data: profiles } = await supabase.from("profiles").select("user_id, name");
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);

      // Get accounts for names
      const { data: accounts } = await supabase.from("accounts").select("id, name");
      const accountMap = new Map(accounts?.map((a) => [a.id, a.name]) || []);

      // Get merchants for names
      const { data: merchants } = await supabase.from("merchants").select("id, name");
      const merchantMap = new Map(merchants?.map((m) => [m.id, m.name]) || []);

      // Get entities
      const { data: entities } = await supabase.from("entities").select("id, name, type");
      const entityMap = new Map(entities?.map((e) => [e.id, e]) || []);

      return (transactions || []).map((t): TransactionWithCreator & { entity_name: string | null } => ({
        ...t,
        creator_name: profileMap.get(t.created_by) || null,
        source_account_name: t.source_account_id ? accountMap.get(t.source_account_id) || null : null,
        destination_account_name: t.destination_account_id ? accountMap.get(t.destination_account_id) || null : null,
        merchant_name: t.merchant_id ? merchantMap.get(t.merchant_id) || null : null,
        entity_name: t.entity_id ? entityMap.get(t.entity_id)?.name || null : null,
      }));
    },
  });
}
