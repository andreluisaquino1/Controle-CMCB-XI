import { Transaction, TransactionWithCreator } from "@/types";
import { LedgerTransaction } from "@/domain/ledger";
import { LEDGER_KEY_TO_ACCOUNT_NAME } from "@/lib/constants";

export interface MapperMetadata {
    profileNameMap: Map<string, string>;
    accountNameMap: Map<string, string>;
    merchantNameMap: Map<string, string>;
    accountEntityMap?: Map<string, string>;
    entityTypeMap?: Map<string, string>;
    entityNameMap?: Map<string, string>;
    entities?: any[];
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
    source_account_name: t.source_account_id ? meta.accountNameMap.get(t.source_account_id) || meta.merchantNameMap.get(t.source_account_id) || t.source_account_id : null,
    destination_account_name: t.destination_account_id ? meta.accountNameMap.get(t.destination_account_id) || meta.merchantNameMap.get(t.destination_account_id) || t.destination_account_id : null,
    merchant_name: t.merchant_id ? meta.merchantNameMap.get(t.merchant_id) || t.merchant_id : null,
});

/**
 * Mapeia uma transação do Ledger para o formato TransactionWithCreator
 */
export const mapLedgerTransaction = (
    l: LedgerTransaction & Record<string, unknown>,
    meta: MapperMetadata
): TransactionWithCreator => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ledgerTx = l;

    // Mapear Tipo para Direção
    let direction: "in" | "out" | "transfer" = "out";
    if (l.type === 'income') direction = "in";
    else if (l.type === 'expense' || l.type === 'fee') direction = "out";
    else if (l.type === 'transfer') direction = "transfer";
    else if (l.type === 'adjustment') {
        direction = l.amount_cents > 0 ? "in" : "out";
    }

    const resolveAccountName = (key: string | null) => {
        if (!key) return null;
        return meta.accountNameMap.get(key) || meta.merchantNameMap.get(key) || LEDGER_KEY_TO_ACCOUNT_NAME[key] || key;
    };

    const resolveMerchantName = (key: string | null) => {
        if (!key) return null;
        return meta.merchantNameMap.get(key) || key;
    };

    const resolveEntityIdFromAccount = (key: string | null) => {
        if (!key) return null;
        if (meta.accountEntityMap?.has(key)) return meta.accountEntityMap.get(key);
        if (LEDGER_KEY_TO_ACCOUNT_NAME[key]) {
            return meta.entities?.find(e => e.type === 'associacao')?.id;
        }
        return null;
    };

    // Lógica de exibição de conta (priorizar real vs externo)
    const isSourceExternal = l.source_account.startsWith('ext:');
    const isDestExternal = l.destination_account?.startsWith('ext:');

    let displaySourceName = resolveAccountName(l.source_account);
    let displayDestName = resolveAccountName(l.destination_account);

    if (isSourceExternal && displayDestName) {
        displaySourceName = displayDestName;
    } else if (isDestExternal && displaySourceName) {
        displayDestName = displaySourceName;
    }

    const metadata = l.metadata as Record<string, unknown> || {};
    const mod = (l.module || metadata.module || metadata.modulo || metadata.original_module || 'outros') as string;

    const resolvedEntityId = l.entity_id || (metadata.entity_id as string) || resolveEntityIdFromAccount(l.source_account) || resolveEntityIdFromAccount(l.destination_account) || null;

    return {
        id: l.id,
        transaction_date: (metadata.transaction_date as string) || l.created_at,
        module: mod,
        amount: l.amount_cents / 100,
        direction,
        description: l.description,
        notes: (metadata.notes as string) || null,
        status: (l as Record<string, any>).status === 'voided' ? 'voided' : 'posted',
        ledger_status: (l as Record<string, any>).status as Transaction['ledger_status'],
        created_by: l.created_by,
        created_at: l.created_at,
        creator_name: meta.profileNameMap.get(l.created_by) || "Sistema",
        source_account_name: displaySourceName,
        destination_account_name: displayDestName,
        merchant_name: resolveMerchantName(metadata.merchant_id as string),
        source_account_id: null,
        destination_account_id: null,
        merchant_id: (metadata.merchant_id as string) || null,
        entity_id: resolvedEntityId,
        payment_method: l.payment_method || (metadata.payment_method as string) || null,
        shift: (metadata.shift as string) || (metadata.turno as string) || null,
        origin_fund: (metadata.origin_fund as string) || (resolvedEntityId ? meta.entityTypeMap?.get(resolvedEntityId as string)?.toUpperCase() : null) || null,
        entity_type: resolvedEntityId ? meta.entityTypeMap?.get(resolvedEntityId as string) as string : null,
        entity_name: resolvedEntityId ? meta.entityNameMap?.get(resolvedEntityId as string) as string : null,
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
