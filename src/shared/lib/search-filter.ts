import { TransactionWithCreator } from "@/types";

/**
 * Checks whether a transaction matches a search term.
 * Searches across description, amount, merchant name, account names,
 * creator name, module, and notes/observation metadata.
 */
export function matchesSearchTerm(
    transaction: TransactionWithCreator,
    search: string
): boolean {
    if (!search) return true;

    const s = search.toLowerCase();
    const t = transaction;

    // Core fields
    if (t.description?.toLowerCase().includes(s)) return true;
    if (t.amount?.toString().includes(s)) return true;
    if (t.merchant_name?.toLowerCase().includes(s)) return true;
    if (t.source_account_name?.toLowerCase().includes(s)) return true;
    if (t.destination_account_name?.toLowerCase().includes(s)) return true;
    if (t.creator_name?.toLowerCase().includes(s)) return true;
    if (t.module?.toLowerCase().includes(s)) return true;
    if (t.notes?.toLowerCase().includes(s)) return true;

    return false;
}
