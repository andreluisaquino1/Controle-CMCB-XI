export type LedgerType = "income" | "expense" | "transfer" | "fee" | "adjustment";

export interface LedgerTransaction {
    id: string;
    created_at: string;
    created_by: string;
    type: LedgerType;
    source_account: string;
    destination_account: string | null;
    amount_cents: number;
    description: string | null;
    reference_id: string | null;
    status: string;
    module: string | null;
    entity_id: string | null;
    payment_method: string | null;
    metadata: Record<string, unknown>;
}
