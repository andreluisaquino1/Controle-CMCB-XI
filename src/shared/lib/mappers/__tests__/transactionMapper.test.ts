/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { mapLedgerTransaction, mapLegacyTransaction, MapperMetadata } from "../transactionMapper";
import { Transaction } from "@/types";
import { LedgerTransaction } from "@/domain/ledger";
import { LedgerStatus, TransactionModuleKey } from "@/shared/constants/ledger";

describe("transactionMapper", () => {
    const mockMeta: MapperMetadata = {
        profileNameMap: new Map([["u1", "User One"]]),
        accountNameMap: new Map([["acc1", "Account One"]]),
        merchantNameMap: new Map([["m1", "Merchant One"]]),
        entityTypeMap: new Map([["ent1", "ue"]]),
        entityNameMap: new Map([["ent1", "UE Test"]]),
    };

    describe("mapLegacyTransaction", () => {
        it("should map legacy transaction correctly", () => {
            const legacyTx: Transaction = {
                id: "tx1",
                amount: 100,
                description: "Legacy Test",
                created_at: "2024-01-01T10:00:00Z",
                created_by: "u1",
                source_account_id: "acc1",
                destination_account_id: "m1",
                merchant_id: "m1",
                status: "completed",
                transaction_date: "2024-01-01",
                module: "gasto",
                direction: "out",
                payment_method: "cash",
                shift: "matutino",
                entity_id: "ent1",
                notes: "",
                origin_fund: "fund",
                parent_transaction_id: null,
                ledger_status: "validated"
            };

            const result = mapLegacyTransaction(legacyTx, mockMeta);

            expect(result.creator_name).toBe("User One");
            expect(result.source_account_name).toBe("Account One");
            expect(result.destination_account_name).toBe("Merchant One");
            expect(result.merchant_name).toBe("Merchant One");
        });
    });

    describe("mapLedgerTransaction", () => {
        it("should map ledger transaction (income) correctly", () => {
            const ledgerTx: any = { // Using any to avoid complex nested partials for mock
                id: "ltx1",
                amount_cents: 5000,
                description: "Ledger Income",
                type: "income",
                status: LedgerStatus.VALIDATED,
                created_at: "2024-01-01T10:00:00Z",
                created_by: "u1",
                source_account: "ext:external",
                destination_account: "acc1",
                entity_id: "ent1",
                metadata: {
                    module: TransactionModuleKey.RECURSOS,
                    transaction_date: "2024-01-01"
                }
            };

            const result = mapLedgerTransaction(ledgerTx, mockMeta);

            expect(result.amount).toBe(50);
            expect(result.direction).toBe("in");
            expect(result.source_account_name).toBe("Account One"); // Prioritize internal account
            expect(result.destination_account_name).toBe("Account One");
            expect(result.creator_name).toBe("User One");
            expect(result.entity_name).toBe("UE Test");
        });

        it("should map adjustment based on amount sign", () => {
            const posAdj: any = {
                id: "adj1",
                amount_cents: 1000,
                type: "adjustment",
                status: LedgerStatus.VALIDATED,
                created_at: "2024-01-01T10:00:00Z",
                created_by: "u1",
                source_account: "acc1",
                metadata: {}
            };

            const negAdj: any = {
                id: "adj2",
                amount_cents: -1000,
                type: "adjustment",
                status: LedgerStatus.VALIDATED,
                created_at: "2024-01-01T10:00:00Z",
                created_by: "u1",
                source_account: "acc1",
                metadata: {}
            };

            expect(mapLedgerTransaction(posAdj, mockMeta).direction).toBe("in");
            expect(mapLedgerTransaction(negAdj, mockMeta).direction).toBe("out");
        });
    });
});
