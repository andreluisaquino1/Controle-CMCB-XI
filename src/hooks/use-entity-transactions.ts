import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Transaction, TransactionWithCreator } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";

export function useAssociacaoTransactions() {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();

  const query = useQuery({
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
    enabled: !isDemo,
  });

  if (isDemo) {
    // Use direct getters for synchronous data access
    const demoAccounts = getAccounts();
    const demoTransactions = getTransactions();
    const demoMerchants = getMerchants();

    // Filter transactions for Association accounts
    const associationAccounts = demoAccounts.filter(a => a.type === 'association').map(a => a.id);

    const filtered = demoTransactions.filter(t =>
      associationAccounts.includes(t.account_id) ||
      (t.source_account_id && associationAccounts.includes(t.source_account_id))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mapped = filtered.map(t => {
      const source = demoAccounts.find(a => a.id === t.source_account_id);
      const dest = demoAccounts.find(a => a.id === t.destination_account_id);
      const merchant = demoMerchants.find(m => m.id === t.merchant_id);
      const fallbackAccount = demoAccounts.find(a => a.id === t.account_id);

      return {
        id: t.id,
        transaction_date: t.date,
        module: t.module,
        amount: t.amount,
        direction: t.type === 'income' ? 'in' : 'out',
        payment_method: 'pix',
        shift: 'matutino',
        description: t.description,
        notes: '',
        status: 'posted',
        created_by: 'demo-user',
        source_account_id: t.source_account_id || null,
        destination_account_id: t.destination_account_id || null,
        merchant_id: t.merchant_id || null,
        origin_fund: null,
        entity_id: 'ent_associacao',
        created_at: t.created_at || new Date().toISOString(),
        creator_name: t.created_by_name || 'Usuário Demo',
        source_account_name: source?.name || null,
        destination_account_name: dest?.name || fallbackAccount?.name || null,
        merchant_name: merchant?.name || null,
      } as TransactionWithCreator;
    });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useRecursosTransactions() {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts } = useDemoData();

  const query = useQuery({
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
    enabled: !isDemo,
  });

  if (isDemo) {
    // Use direct getters for synchronous data access
    const demoTransactions = getTransactions();
    const demoAccounts = getAccounts();

    const filtered = demoTransactions.filter(t => t.module === 'pix_direto_uecx')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mapped = filtered.map(t => {
      const source = demoAccounts.find(a => a.id === t.source_account_id);
      const fallbackAccount = demoAccounts.find(a => a.id === t.account_id);

      return {
        id: t.id,
        transaction_date: t.date,
        module: t.module,
        amount: t.amount,
        direction: t.type === 'income' ? 'in' : 'out',
        payment_method: 'pix',
        shift: 'matutino',
        description: t.description,
        notes: '',
        status: 'posted',
        created_by: 'demo-user',
        source_account_id: t.source_account_id || t.account_id || null,
        destination_account_id: null,
        merchant_id: null,
        origin_fund: null,
        entity_id: fallbackAccount?.entity_id || null,
        created_at: t.created_at || new Date().toISOString(),
        creator_name: t.created_by_name || 'Usuário Demo',
        source_account_name: source?.name || fallbackAccount?.name || null,
        destination_account_name: null,
        merchant_name: null,
        entity_type: fallbackAccount?.entity_id === 'ent_ue' ? 'ue' : 'cx',
        entity_cnpj: '00.000.000/0001-99'
      } as TransactionWithCreator & { entity_type: string | null, entity_cnpj: string | null };
    });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useSaldosTransactions() {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();

  const query = useQuery({
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
    enabled: !isDemo,
  });

  if (isDemo) {
    // Use direct getters for synchronous data access
    const demoTransactions = getTransactions();
    const demoAccounts = getAccounts();
    const demoMerchants = getMerchants();

    const filtered = demoTransactions.filter(t => ['aporte_saldo', 'consumo_saldo'].includes(t.module))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mapped = filtered.map(t => {
      const source = demoAccounts.find(a => a.id === t.source_account_id);
      const dest = demoAccounts.find(a => a.id === t.destination_account_id);
      // Fix: Check matches in merchant_id OR account_id (for direct merchant account txs like Aportes)
      const merchant = demoMerchants.find(m => m.id === t.merchant_id || m.id === t.account_id);

      return {
        id: t.id,
        transaction_date: t.date,
        module: t.module,
        amount: t.amount,
        direction: t.type === 'income' ? 'in' : 'out',
        payment_method: 'pix',
        shift: 'matutino',
        description: t.description,
        notes: '',
        status: 'posted',
        created_by: 'demo-user',
        source_account_id: t.source_account_id || null,
        destination_account_id: t.destination_account_id || null,
        merchant_id: t.merchant_id || null,
        origin_fund: null,
        entity_id: 'ent_associacao',
        created_at: t.created_at || new Date().toISOString(),
        creator_name: t.created_by_name || 'Usuário Demo',
        source_account_name: source?.name || null,
        destination_account_name: dest?.name || null,
        merchant_name: merchant?.name || null,
      } as TransactionWithCreator;
    });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useAllTransactionsWithCreator(startDate?: string, endDate?: string) {
  const { isDemo } = useAuth();
  const { getTransactions, getAccounts, getMerchants } = useDemoData();

  const query = useQuery({
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
    enabled: !isDemo,
  });

  if (isDemo) {
    if (!startDate || !endDate) return { ...query, data: [], isLoading: false };

    // Use direct getters for synchronous data access
    const transactions = getTransactions();
    const accounts = getAccounts();
    const merchants = getMerchants();

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const mapped = filtered.map(t => {
      const source = accounts.find(a => a.id === t.source_account_id);
      const dest = accounts.find(a => a.id === t.destination_account_id);
      const merchant = merchants.find(m => m.id === t.merchant_id);
      const fallbackAccount = accounts.find(a => a.id === t.account_id);

      return {
        id: t.id,
        transaction_date: t.date,
        module: t.module,
        amount: t.amount,
        direction: t.type === 'income' ? 'in' : 'out',
        payment_method: 'pix',
        shift: 'matutino',
        description: t.description,
        notes: '',
        status: 'posted',
        created_by: 'demo-user',
        source_account_id: t.source_account_id || null,
        destination_account_id: t.destination_account_id || null,
        merchant_id: t.merchant_id || null,
        origin_fund: null,
        entity_id: null,
        created_at: new Date().toISOString(),
        creator_name: 'Usuário Demo',
        source_account_name: source?.name || null,
        destination_account_name: dest?.name || fallbackAccount?.name || null,
        merchant_name: merchant?.name || null,
        entity_name: 'Associação CMCB-XI',
        entity_type: 'associacao',
        entity_cnpj: '00.000.000/0001-00'
      } as unknown as TransactionWithCreator & { entity_name: string | null };
    });

    return { ...query, data: mapped, isLoading: false, isError: false, error: null };
  }

  return query;
}
