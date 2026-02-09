import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";

/**
 * Extensão dos tipos do Supabase para incluir campos e funções que não foram
 * detectadas automaticamente pelo gerador (por exemplo, status no ledger ou novas RPCs).
 */

export interface ExtendedDatabase extends Database {
    public: Database["public"] & {
        Tables: Database["public"]["Tables"] & {
            /**
             * Tabela `settings` não veio no types gerado.
             */
            settings: {
                Row: {
                    key: string;
                    value: string | null;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    key: string;
                    value?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    key?: string;
                    value?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Relationships: [];
            };
            ledger_transactions: {
                Row: Database["public"]["Tables"]["ledger_transactions"]["Row"] & {
                    status: "pending" | "validated" | "voided";
                };
                Insert: Database["public"]["Tables"]["ledger_transactions"]["Insert"] & {
                    status?: "pending" | "validated" | "voided";
                };
                Update: Database["public"]["Tables"]["ledger_transactions"]["Update"] & {
                    status?: "pending" | "validated" | "voided";
                };
            };
        };
        Views: Database["public"]["Views"] & {
            ledger_balances: {
                Row: {
                    account_id: string;
                    balance_cents: number;
                };
            };
        };
        Functions: Database["public"]["Functions"] & {
            approve_ledger_transaction: {
                Args: { p_id: string };
                Returns: Json;
            };
            /**
             * RPC para reset de dados (demo/admin).
             */
            reset_all_data: {
                Args: Record<string, never>;
                Returns: Json;
            };
        };
    };
}

export type LedgerTransactionRow = ExtendedDatabase["public"]["Tables"]["ledger_transactions"]["Row"];
export type LedgerTransactionInsert = ExtendedDatabase["public"]["Tables"]["ledger_transactions"]["Insert"];
