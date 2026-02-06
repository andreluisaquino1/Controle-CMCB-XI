import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionWithCreator } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { useTransactionMetadata } from "./use-transaction-metadata";

// Helper to map transaction data
const mapTransaction = (
  t: Transaction,
  profileMap: Map<string, string>,
  accountMap: Map<string, string>,
  merchantMap: Map<string, string>
): TransactionWithCreator => ({
  ...t,
  creator_name: profileMap.get(t.created_by) || null,
  source_account_name: t.source_account_id ? accountMap.get(t.source_account_id) || null : null,
  destination_account_name: t.destination_account_id ? accountMap.get(t.destination_account_id) || null : null,
  merchant_name: t.merchant_id ? merchantMap.get(t.merchant_id) || null : null,
});

export function useAssociacaoTransactions() {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "associacao"],
    queryFn: async () => {
      const { data: entity } = await supabase.from("entities").select("id").eq("type", "associacao").single();
      if (!entity) return [];

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("entity_id", entity.id)
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (transactions || []).map(t => mapTransaction(
        t,
        meta?.profileNameMap || new Map(),
        meta?.accountNameMap || new Map(),
        meta?.merchantNameMap || new Map()
      ));
    },
    enabled: !isDemo && !!meta,
  });

  if (isDemo) {
    const demoAccounts = getAccounts();
    const demoTransactions = getTransactions();
    const demoMerchants = getMerchants();

    const associationAccounts = demoAccounts.filter(a => a.type === 'association').map(a => a.id);
    const filtered = demoTransactions.filter(t =>
      associationAccounts.includes(t.account_id) ||
      (t.source_account_id && associationAccounts.includes(t.source_account_id))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mapped = filtered.map(t => {
      const source = demoAccounts.find(a => a.id === t.source_account_id);
      const dest = demoAccounts.find(a => a.id === t.destination_account_id);
      const merchant = demoMerchants.find(m => m.id === t.merchant_id);

      return {
        ...t,
        direction: t.type === 'income' ? 'in' : 'out',
        source_account_name: source?.name || null,
        destination_account_name: dest?.name || demoAccounts.find(a => a.id === t.account_id)?.name || null,
        merchant_name: merchant?.name || null,
        creator_name: t.created_by_name || 'Usuário Demo',
        created_by: 'demo-user',
        status: 'posted',
        source_account_id: t.source_account_id || null, // Ensure compatibility
        destination_account_id: t.destination_account_id || null,
        merchant_id: t.merchant_id || null
      } as unknown as TransactionWithCreator;
    });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useRecursosTransactions() {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "recursos"],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("module", "pix_direto_uecx")
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Additional map for entities which is specific to this hook
      const { data: entities } = await supabase.from("entities").select("id, name, type, cnpj");
      const entityMap = new Map(entities?.map((e) => [e.id, e]) || []);

      return (transactions || []).map((t): TransactionWithCreator & { entity_type: string | null, entity_cnpj: string | null } => {
        // Reuse meta maps but we need entity logic here
        const entityId = meta?.accountEntityMap.get(t.source_account_id || '') || null;
        const entityInfo = entityId ? entityMap.get(entityId) : null;

        return {
          ...mapTransaction(t, meta?.profileNameMap || new Map(), meta?.accountNameMap || new Map(), meta?.merchantNameMap || new Map()),
          entity_type: entityInfo?.type || null,
          entity_cnpj: entityInfo?.cnpj || null,
        };
      });
    },
    enabled: !isDemo && !!meta,
  });

  if (isDemo) {
    const demoTransactions = getTransactions();
    const demoAccounts = getAccounts();

    const mapped = demoTransactions.filter(t => t.module === 'pix_direto_uecx')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => {
        const fallbackAccount = demoAccounts.find(a => a.id === t.account_id);
        const source = demoAccounts.find(a => a.id === t.source_account_id);
        return {
          ...t,
          direction: t.type === 'income' ? 'in' : 'out',
          source_account_name: source?.name || fallbackAccount?.name || null,
          creator_name: t.created_by_name || 'Usuário Demo',
          created_by: 'demo-user',
          status: 'posted',
          destination_account_name: null, merchant_name: null,
          entity_type: fallbackAccount?.entity_id === 'ent_ue' ? 'ue' : 'cx',
          entity_cnpj: '00.000.000/0001-99',
          source_account_id: t.source_account_id || t.account_id || null,
          destination_account_id: null, merchant_id: null
        } as unknown as TransactionWithCreator & { entity_type: string | null, entity_cnpj: string | null };
      });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useSaldosTransactions() {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "saldos"],
    queryFn: async () => {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .in("module", ["aporte_saldo", "consumo_saldo"])
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (transactions || []).map(t => mapTransaction(
        t, meta?.profileNameMap || new Map(), meta?.accountNameMap || new Map(), meta?.merchantNameMap || new Map()
      ));
    },
    enabled: !isDemo && !!meta,
  });

  if (isDemo) {
    const demoTransactions = getTransactions();
    const demoAccounts = getAccounts();
    const demoMerchants = getMerchants();

    const mapped = demoTransactions.filter(t => ['aporte_saldo', 'consumo_saldo'].includes(t.module))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => {
        const merchant = demoMerchants.find(m => m.id === t.merchant_id || m.id === t.account_id);
        const source = demoAccounts.find(a => a.id === t.source_account_id);
        const dest = demoAccounts.find(a => a.id === t.destination_account_id);

        return {
          ...t,
          direction: t.type === 'income' ? 'in' : 'out',
          creator_name: t.created_by_name || 'Usuário Demo',
          merchant_name: merchant?.name || null,
          source_account_name: source?.name || null,
          destination_account_name: dest?.name || null,
          created_by: 'demo-user', status: 'posted',
          source_account_id: t.source_account_id || null,
          destination_account_id: t.destination_account_id || null,
          merchant_id: t.merchant_id || null
        } as unknown as TransactionWithCreator;
      });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useAllTransactionsWithCreator(startDate?: string, endDate?: string) {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "all-with-creator", startDate, endDate],
    queryFn: async () => {
      let queryFn = supabase
        .from("transactions")
        .select("*")
        .eq("status", "posted")
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (startDate) queryFn = queryFn.gte("transaction_date", startDate);
      if (endDate) queryFn = queryFn.lte("transaction_date", endDate);

      const { data: transactions, error } = await queryFn;
      if (error) throw error;

      const { data: entities } = await supabase.from("entities").select("id, name, type");
      const entityMap = new Map(entities?.map((e) => [e.id, e]) || []);

      return (transactions || []).map((t): TransactionWithCreator & { entity_name: string | null } => ({
        ...mapTransaction(t, meta?.profileNameMap || new Map(), meta?.accountNameMap || new Map(), meta?.merchantNameMap || new Map()),
        entity_name: t.entity_id ? entityMap.get(t.entity_id)?.name || null : null,
      }));
    },
    enabled: !isDemo && !!meta,
  });

  if (isDemo) {
    if (!startDate || !endDate) return { ...query, data: [], isLoading: false };
    const transactions = getTransactions();
    const accounts = getAccounts();
    const merchants = getMerchants();

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const mapped = transactions
      .filter(t => { const d = new Date(t.date); return d >= start && d <= end; })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => {
        const source = accounts.find(a => a.id === t.source_account_id);
        const dest = accounts.find(a => a.id === t.destination_account_id);
        const merchant = merchants.find(m => m.id === t.merchant_id);
        const fallbackAccount = accounts.find(a => a.id === t.account_id);

        return {
          ...t,
          direction: t.type === 'income' ? 'in' : 'out',
          creator_name: t.created_by_name || 'Usuário Demo',
          created_by: 'demo-user', status: 'posted',
          source_account_name: source?.name || null,
          destination_account_name: dest?.name || fallbackAccount?.name || null,
          merchant_name: merchant?.name || null,
          entity_name: 'Associação CMCB-XI', entity_type: 'associacao', entity_cnpj: '00.000.000/0001-00',
          source_account_id: t.source_account_id || null, destination_account_id: t.destination_account_id || null, merchant_id: t.merchant_id || null, origin_fund: null, entity_id: null
        } as unknown as TransactionWithCreator & { entity_name: string | null };
      });
    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }
  return query;
}
