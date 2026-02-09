import { Transaction, TransactionWithCreator } from "@/types";
import { LedgerTransaction } from "@/domain/ledger";
import { LEDGER_KEY_TO_ACCOUNT_NAME } from "@/lib/constants";

export interface MapperMetadata {
    profileNameMap: Map<string, string>;
    accountNameMap: Map<string, string>;
    merchantNameMap: Map<string, string>;
    accountEntityMap?: Map<string, string>;
}

/**
 * Mapeia uma transação legada para o formato TransactionWithCreator
 */
export const mapLegacyTransaction = (
    t: Transaction,
    meta: MapperMetadata
): TransactionWithCreator => ({
    ...t,
    creator_name: meta.profileNameMap.get(t.created_by) || null,
    source_account_name: t.source_account_id ? meta.accountNameMap.get(t.source_account_id) || t.source_account_id : null,
    destination_account_name: t.destination_account_id ? meta.accountNameMap.get(t.destination_account_id) || t.destination_account_id : null,
    merchant_name: t.merchant_id ? meta.merchantNameMap.get(t.merchant_id) || t.merchant_id : null,
});

/**
 * Mapeia uma transação do Ledger para o formato TransactionWithCreator
 */
export const mapLedgerTransaction = (
    l: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    meta: MapperMetadata
): TransactionWithCreator => {
    const ledgerTx = l as LedgerTransaction;

    // Mapear Tipo para Direção
    let direction: "in" | "out" | "transfer" = "out";
    if (ledgerTx.type === 'income') direction = "in";
    else if (ledgerTx.type === 'expense' || ledgerTx.type === 'fee') direction = "out";
    else if (ledgerTx.type === 'transfer') direction = "transfer";
    else if (ledgerTx.type === 'adjustment') {
        direction = ledgerTx.amount_cents > 0 ? "in" : "out";
    }

    const resolveAccountName = (key: string | null) => {
        if (!key) return null;
        return meta.accountNameMap.get(key) || LEDGER_KEY_TO_ACCOUNT_NAME[key] || key;
    };

    const resolveMerchantName = (key: string | null) => {
        if (!key) return null;
        return meta.merchantNameMap.get(key) || key;
    };

    // Lógica de exibição de conta (priorizar real vs externo)
    const isSourceExternal = ledgerTx.source_account.startsWith('ext:');
    const isDestExternal = ledgerTx.destination_account?.startsWith('ext:');

    let displaySourceName = resolveAccountName(ledgerTx.source_account);
    let displayDestName = resolveAccountName(ledgerTx.destination_account);

    if (isSourceExternal && displayDestName) {
        displaySourceName = displayDestName;
    } else if (isDestExternal && displaySourceName) {
        displayDestName = displaySourceName;
    }

    const mod = (ledgerTx.metadata?.modulo || ledgerTx.metadata?.original_module || 'outros') as string;

    return {
        id: ledgerTx.id,
        transaction_date: (ledgerTx.metadata?.transaction_date as string) || ledgerTx.created_at,
        module: mod as any,
        amount: ledgerTx.amount_cents / 100,
        direction,
        description: ledgerTx.description,
        notes: (ledgerTx.metadata?.notes as string) || null,
        status: 'posted',
        ledger_status: (ledgerTx as any).status,
        created_by: ledgerTx.created_by,
        created_at: ledgerTx.created_at,
        creator_name: meta.profileNameMap.get(ledgerTx.created_by) || "Sistema",
        source_account_name: displaySourceName,
        destination_account_name: displayDestName,
        merchant_name: resolveMerchantName(ledgerTx.metadata?.merchant_id as string),
        source_account_id: null,
        destination_account_id: null,
        merchant_id: (ledgerTx.metadata?.merchant_id as string) || null,
        entity_id: null,
        payment_method: null,
        shift: null,
        origin_fund: null,
        parent_transaction_id: null
    } as TransactionWithCreator;
};

/**
 * Mapeia dados demo para o formato unificado
 */
export const mapDemoTransaction = (
    t: any,
    meta: { accounts: any[], merchants: any[] }
): TransactionWithCreator => {
    const source = meta.accounts.find(a => a.id === t.source_account_id);
    const dest = meta.accounts.find(a => a.id === t.destination_account_id);
    const merchant = meta.merchants.find(m => m.id === t.merchant_id);
    const fallbackAccount = meta.accounts.find(a => a.id === t.account_id);

    return {
        ...t,
        direction: t.type === 'income' ? 'in' : 'out',
        source_account_name: source?.name || null,
        destination_account_name: dest?.name || fallbackAccount?.name || null,
        merchant_name: merchant?.name || null,
        creator_name: t.created_by_name || 'Usuário Demo',
        created_by: 'demo-user',
        status: 'posted',
        source_account_id: t.source_account_id || null,
        destination_account_id: t.destination_account_id || null,
        merchant_id: t.merchant_id || null
    } as unknown as TransactionWithCreator;
};
