import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { extendedSupabase } from "@/integrations/supabase/extendedClient";
import { Transaction, TransactionWithCreator } from "@/types";
import { LedgerTransaction } from "@/domain/ledger";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { useTransactionMetadata } from "./use-transaction-metadata";
import {
  mapLedgerTransaction,
  mapLegacyTransaction,
  mapDemoTransaction,
  MapperMetadata
} from "@/shared/lib/mappers/transactionMapper";

export function useAssociacaoTransactions(startDate?: string, endDate?: string) {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "associacao", startDate, endDate],
    queryFn: async () => {
      let queryBuilder = extendedSupabase
        .from("ledger_transactions")
        .select("*")
        .or('metadata->>module.in.("mensalidade","mensalidade_pix","pix_nao_identificado","gasto_associacao","assoc_transfer","especie_transfer","especie_deposito_pix","especie_ajuste","pix_ajuste","cofre_ajuste","conta_digital_ajuste","conta_digital_taxa","taxa_pix_bb","ajuste_manual"),metadata->>modulo.in.("mensalidade","mensalidade_pix","pix_nao_identificado","gasto_associacao","assoc_transfer","especie_transfer","especie_deposito_pix","especie_ajuste","pix_ajuste","cofre_ajuste","conta_digital_ajuste","conta_digital_taxa","taxa_pix_bb","ajuste_manual"),metadata->>original_module.in.("mensalidade","mensalidade_pix","pix_nao_identificado","gasto_associacao","assoc_transfer","especie_transfer","especie_deposito_pix","especie_ajuste","pix_ajuste","cofre_ajuste","conta_digital_ajuste","conta_digital_taxa","taxa_pix_bb","ajuste_manual")')
        .order("created_at", { ascending: false });

      if (startDate) queryBuilder = queryBuilder.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) queryBuilder = queryBuilder.lte("created_at", `${endDate}T23:59:59`);

      const { data: ledgerData, error } = await queryBuilder.limit(200);

      if (error) throw error;

      return (ledgerData || [])
        .map((l) => mapLedgerTransaction(l as unknown as LedgerTransaction & Record<string, unknown>, meta as MapperMetadata))
        .sort((a, b) => {
          const dateA = a.transaction_date ? new Date(a.transaction_date) : new Date(a.created_at);
          const dateB = b.transaction_date ? new Date(b.transaction_date) : new Date(b.created_at);
          return dateB.getTime() - dateA.getTime();
        });
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

    const mapped = filtered.map(t => mapDemoTransaction(t, { accounts: demoAccounts, merchants: demoMerchants }));

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useRecursosTransactions(startDate?: string, endDate?: string) {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "recursos", startDate, endDate],
    queryFn: async () => {
      const { data: entities } = await supabase.from("entities").select("id, name, type, cnpj");
      const ueEntity = entities?.find(e => e.type === 'ue');
      const cxEntity = entities?.find(e => e.type === 'cx');

      const entityIds = [ueEntity?.id, cxEntity?.id].filter(Boolean) as string[];

      const { data: resourceAccounts } = await supabase
        .from("accounts")
        .select("id, name, entity_id")
        .in("entity_id", entityIds);

      const resourceAccountIds = resourceAccounts?.map(a => a.id) || [];
      if (resourceAccountIds.length === 0) return [];

      let queryBuilder = extendedSupabase
        .from("ledger_transactions")
        .select("*")
        .or(`source_account.in.(${resourceAccountIds.join(',')}),destination_account.in.(${resourceAccountIds.join(',')})`)
        .order("created_at", { ascending: false });

      if (startDate) queryBuilder = queryBuilder.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) queryBuilder = queryBuilder.lte("created_at", `${endDate}T23:59:59`);

      const { data: ledgerData, error } = await queryBuilder.limit(200);

      if (error) throw error;

      return (ledgerData || [])
        .map((l) => mapLedgerTransaction(l as unknown as LedgerTransaction & Record<string, unknown>, meta as MapperMetadata))
        .sort((a, b) => {
          const dateA = a.transaction_date ? new Date(a.transaction_date) : new Date(a.created_at);
          const dateB = b.transaction_date ? new Date(b.transaction_date) : new Date(b.created_at);
          return dateB.getTime() - dateA.getTime();
        });
    },
    enabled: !isDemo && !!meta,
  });

  if (isDemo) {
    const demoTransactions = getTransactions();
    const accounts = getAccounts();
    const merchants = getMerchants();

    const mapped = demoTransactions.filter(t => t.module === 'pix_direto_uecx')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => mapDemoTransaction(t, { accounts, merchants }));

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useSaldosTransactions(startDate?: string, endDate?: string) {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();
  const { data: meta } = useTransactionMetadata();

  const query = useQuery({
    queryKey: ["transactions", "saldos", startDate, endDate],
    queryFn: async () => {
      let legacyPromise = supabase
        .from("transactions")
        .select("*")
        .in("module", ["aporte_saldo", "consumo_saldo"])
        .order("transaction_date", { ascending: false });

      if (startDate) legacyPromise = legacyPromise.gte("transaction_date", startDate);
      if (endDate) legacyPromise = legacyPromise.lte("transaction_date", endDate);

      // limit applies after filter
      const legacyQuery = legacyPromise.limit(200);

      let ledgerPromise = extendedSupabase
        .from("ledger_transactions")
        .select("*")
        .or('metadata->>module.in.("aporte_saldo","consumo_saldo"),metadata->>modulo.in.("aporte_saldo","consumo_saldo"),metadata->>original_module.in.("aporte_saldo","consumo_saldo")')
        .order("created_at", { ascending: false });

      if (startDate) ledgerPromise = ledgerPromise.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) ledgerPromise = ledgerPromise.lte("created_at", `${endDate}T23:59:59`);

      const ledgerQuery = ledgerPromise.limit(200);

      const [legacyRes, ledgerRes] = await Promise.all([legacyQuery, ledgerQuery]);

      if (legacyRes.error) throw legacyRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      const legacyMapped = (legacyRes.data || []).map((t) => mapLegacyTransaction(t as unknown as Transaction, meta as MapperMetadata));
      const ledgerMapped = (ledgerRes.data || []).map((l) => mapLedgerTransaction(l as unknown as LedgerTransaction & Record<string, unknown>, meta as MapperMetadata));

      return [...legacyMapped, ...ledgerMapped]
        .sort((a, b) => {
          const dateA = a.transaction_date ? new Date(a.transaction_date) : new Date(a.created_at);
          const dateB = b.transaction_date ? new Date(b.transaction_date) : new Date(b.created_at);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 200);
    },
    enabled: !isDemo && !!meta,
  });

  if (isDemo) {
    const demoTransactions = getTransactions();
    const accounts = getAccounts();
    const merchants = getMerchants();

    const mapped = demoTransactions.filter(t => ['aporte_saldo', 'consumo_saldo'].includes(t.module))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(t => mapDemoTransaction(t, { accounts, merchants }));

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
      // Fetch Legacy Transactions
      let legacyQuery = supabase
        .from("transactions")
        .select("*")
        .eq("status", "posted")
        .order("transaction_date", { ascending: false });

      if (startDate) legacyQuery = legacyQuery.gte("transaction_date", startDate);
      if (endDate) legacyQuery = legacyQuery.lte("transaction_date", endDate);

      // Fetch Ledger Transactions
      let ledgerQuery = extendedSupabase
        .from("ledger_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (startDate) ledgerQuery = ledgerQuery.gte("created_at", `${startDate}T00:00:00`);
      if (endDate) ledgerQuery = ledgerQuery.lte("created_at", `${endDate}T23:59:59`);

      const [legacyRes, ledgerRes] = await Promise.all([legacyQuery, ledgerQuery]);

      if (legacyRes.error) throw legacyRes.error;
      if (ledgerRes.error) throw ledgerRes.error;

      const legacyMapped = (legacyRes.data || []).map((t) => mapLegacyTransaction(t as unknown as Transaction, meta as MapperMetadata));
      const ledgerMapped = (ledgerRes.data || []).map((l) => mapLedgerTransaction(l as unknown as LedgerTransaction & Record<string, unknown>, meta as MapperMetadata));

      // Combine and Sort
      return [...legacyMapped, ...ledgerMapped]
        .sort((a, b) =>
          new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime() ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
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
      .map(t => mapDemoTransaction(t, { accounts, merchants }));
    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }
  return query;
}
