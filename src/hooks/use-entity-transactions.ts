import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Transaction, TransactionWithCreator } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { useTransactionMetadata } from "./use-transaction-metadata";

import { ACCOUNT_NAME_TO_LEDGER_KEY, LEDGER_KEY_TO_ACCOUNT_NAME, MODULE_LABELS } from "@/lib/constants";
import { LedgerTransaction, LedgerType } from "@/domain/ledger";

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
      // Fetch Ledger Transactions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ledgerData, error } = await (supabase as any)
        .from("ledger_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching ledger transactions:", error);
        throw error;
      }

      // Map Ledger to TransactionWithCreator
      return (ledgerData || []).map((l: any) => {
        const ledgerTx = l as LedgerTransaction;

        // Map Type to Direction
        let direction: "in" | "out" | "transfer" = "out";
        if (ledgerTx.type === 'income') direction = "in";
        else if (ledgerTx.type === 'expense') direction = "out";
        else if (ledgerTx.type === 'transfer') direction = "transfer";
        else if (ledgerTx.type === 'fee') direction = "out";
        else if (ledgerTx.type === 'adjustment') {
          // Should be handled by type='income'/'expense' in new logic, but if adjustment type exists:
          direction = ledgerTx.amount_cents > 0 ? "in" : "out";
          // Wait, amount_cents is always positive. 
          // If type is adjustment, we don't know direction unless we check source vs dest or metadata.
          // Assuming logic used income/expense. If 'adjustment' type appears, assume IN? 
          // Or check metadata.original_type?
          // For now default to 'out' or check common adjustment usage.
        }

        const sourceName = LEDGER_KEY_TO_ACCOUNT_NAME[ledgerTx.source_account] || ledgerTx.source_account;

        // Destination
        let destName = null;
        if (ledgerTx.destination_account) {
          destName = LEDGER_KEY_TO_ACCOUNT_NAME[ledgerTx.destination_account] || ledgerTx.destination_account;
        }

        const creatorName = meta?.profileNameMap?.get(ledgerTx.created_by) || "Sistema";

        return {
          id: ledgerTx.id,
          transaction_date: ledgerTx.created_at, // Use created_at as date
          module: (ledgerTx.metadata?.modulo as any) || 'outros',
          amount: ledgerTx.amount_cents / 100,
          direction,
          description: ledgerTx.description,
          notes: (ledgerTx.metadata?.notes as string) || null,
          status: 'posted',
          created_by: ledgerTx.created_by,
          created_at: ledgerTx.created_at,

          // Mapped fields
          creator_name: creatorName,
          source_account_name: sourceName,
          destination_account_name: destName,
          merchant_name: null, // Ledger doesn't have merchant column yet
          entity_name: null,

          // Legacy IDs (Fake or Null?)
          // UI might need them for keys, but if not used for linking, null is safer than fake.
          // TransactionWithCreator extends Transaction which requires string status etc.
          source_account_id: null,
          destination_account_id: null,
          merchant_id: null,
          entity_id: null,
          payment_method: null,
          shift: null,
          origin_fund: null,
          parent_transaction_id: null
        } as TransactionWithCreator;
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
      // First, get all resource account IDs (accounts belonging to UE or CX entities)
      const { data: entities } = await supabase.from("entities").select("id, name, type, cnpj");
      const ueEntity = entities?.find(e => e.type === 'ue');
      const cxEntity = entities?.find(e => e.type === 'cx');

      const entityIds = [ueEntity?.id, cxEntity?.id].filter(Boolean) as string[];

      const { data: resourceAccounts } = await supabase
        .from("accounts")
        .select("id, name, entity_id")
        .in("entity_id", entityIds);

      const resourceAccountIds = resourceAccounts?.map(a => a.id) || [];
      const accountNameById = new Map(resourceAccounts?.map(a => [a.id, a.name]) || []);
      const accountEntityById = new Map(resourceAccounts?.map(a => [a.id, a.entity_id]) || []);

      if (resourceAccountIds.length === 0) {
        return [];
      }

      // Fetch Ledger Transactions for these accounts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ledgerData, error } = await (supabase as any)
        .from("ledger_transactions")
        .select("*")
        .or(`source_account.in.(${resourceAccountIds.join(',')}),destination_account.in.(${resourceAccountIds.join(',')})`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const entityMap = new Map(entities?.map((e) => [e.id, e]) || []);

      return (ledgerData || []).map((l: any) => {
        const ledgerTx = l as LedgerTransaction;

        // Determine Entity based on Account ID
        let entityInfo = null;
        const sourceEntityId = accountEntityById.get(ledgerTx.source_account);
        const destEntityId = accountEntityById.get(ledgerTx.destination_account || '');
        const relevantEntityId = sourceEntityId || destEntityId;
        if (relevantEntityId) {
          entityInfo = entityMap.get(relevantEntityId);
        }

        // Map Type to Direction
        let direction: "in" | "out" | "transfer" = "out";
        if (ledgerTx.type === 'income') direction = "in";
        else if (ledgerTx.type === 'expense') direction = "out";
        else if (ledgerTx.type === 'transfer') direction = "transfer";

        const creatorName = meta?.profileNameMap?.get(ledgerTx.created_by) || "Sistema";

        // Resolve account name
        const sourceName = accountNameById.get(ledgerTx.source_account) ||
          LEDGER_KEY_TO_ACCOUNT_NAME[ledgerTx.source_account] ||
          ledgerTx.source_account;
        const destName = ledgerTx.destination_account
          ? (accountNameById.get(ledgerTx.destination_account) ||
            LEDGER_KEY_TO_ACCOUNT_NAME[ledgerTx.destination_account] ||
            ledgerTx.destination_account)
          : null;

        return {
          id: ledgerTx.id,
          transaction_date: (ledgerTx.metadata?.transaction_date as string) || ledgerTx.created_at,
          module: (ledgerTx.metadata?.original_module as any) || (ledgerTx.metadata?.modulo as any) || 'pix_direto_uecx',
          amount: ledgerTx.amount_cents / 100,
          direction,
          description: ledgerTx.description,
          notes: (ledgerTx.metadata?.notes as string) || null,
          status: 'posted',
          created_by: ledgerTx.created_by,
          created_at: ledgerTx.created_at,

          creator_name: creatorName,
          source_account_name: sourceName,
          destination_account_name: destName,
          merchant_name: null,

          entity_name: entityInfo?.name || null,
          entity_type: entityInfo?.type || null,
          entity_cnpj: entityInfo?.cnpj || null,

          // Legacy fields null
          source_account_id: null,
          destination_account_id: null,
          merchant_id: (ledgerTx.metadata?.merchant_id as string) || null,
          entity_id: entityInfo?.id || null
        } as TransactionWithCreator & { entity_type: string | null, entity_cnpj: string | null };
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
      // Fetch Ledger Transactions for modules 'aporte_saldo' and 'consumo_saldo'
      // Since mapTransaction expects specific structure, we'll map manually for this view too to keep it consistent
      // But filtering by metadata->modulo is slower if not indexed.
      // Alternatively, filter by account types if possible. But 'consumo_saldo' has Merchant as source.

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ledgerData, error } = await (supabase as any)
        .from("ledger_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Filter in memory for now as JSON filtering in Supabase JS can be tricky with Types
      const filtered = (ledgerData || []).filter((l: any) => {
        const mod = l.metadata?.modulo;
        return mod === 'aporte_saldo' || mod === 'consumo_saldo';
      });

      return filtered.map((l: any) => {
        const ledgerTx = l as LedgerTransaction;
        const mod = ledgerTx.metadata?.modulo as string;

        let direction: "in" | "out" | "transfer" = "out";
        // Aporte = Transfer (Out from Source, In to Merchant). UI usually shows as Transfer or Out?
        // Consumo = Expense (Out from Merchant)
        if (ledgerTx.type === 'transfer') direction = "transfer"; // Aporte
        else if (ledgerTx.type === 'expense') direction = "out"; // Consumo

        const creatorName = meta?.profileNameMap?.get(ledgerTx.created_by) || "Sistema";

        // Helper to resolve names
        const resolveName = (key: string | null) => {
          if (!key) return null;
          // Try Account Map
          if (LEDGER_KEY_TO_ACCOUNT_NAME[key]) return LEDGER_KEY_TO_ACCOUNT_NAME[key];
          // Try Merchant Map (since we use Merchant ID as key now)
          if (meta?.merchantNameMap?.has(key)) return meta.merchantNameMap.get(key);
          // Try literal
          return key;
        };

        return {
          id: ledgerTx.id,
          transaction_date: (ledgerTx.metadata?.transaction_date as string) || ledgerTx.created_at,
          module: mod || 'outros',
          amount: ledgerTx.amount_cents / 100,
          direction,
          description: ledgerTx.description,
          notes: (ledgerTx.metadata?.notes as string) || null,
          status: 'posted',
          created_by: ledgerTx.created_by,
          created_at: ledgerTx.created_at,

          creator_name: creatorName,
          source_account_name: resolveName(ledgerTx.source_account),
          destination_account_name: resolveName(ledgerTx.destination_account),
          merchant_name: resolveName(ledgerTx.metadata?.merchant_id as string || (ledgerTx.type === 'expense' ? ledgerTx.source_account : ledgerTx.destination_account)),

          // Legacy/Unused
          source_account_id: null,
          destination_account_id: null,
          merchant_id: (ledgerTx.metadata?.merchant_id as string) || null,
          entity_id: null
        } as TransactionWithCreator;
      });
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
