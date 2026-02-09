import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";

/**
 * Extensão dos tipos do Supabase para incluir campos e funções que não foram
 * detectadas automaticamente pelo gerador (por exemplo, status no ledger ou novas RPCs).
 */

export interface ExtendedDatabase extends Database {
    public: Database["public"] & {
        Tables: Database["public"]["Tables"] & {
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
        Functions: Database["public"]["Functions"] & {
            approve_ledger_transaction: {
                Args: { p_id: string };
                Returns: Json;
            };
        };
    };
}

export type LedgerTransactionRow = ExtendedDatabase["public"]["Tables"]["ledger_transactions"]["Row"];
export type LedgerTransactionInsert = ExtendedDatabase["public"]["Tables"]["ledger_transactions"]["Insert"];
