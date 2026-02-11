import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useSaldosTransactions } from "@/hooks/use-entity-transactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionMetadata } from "@/hooks/use-transaction-metadata";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn()
    }
}));

vi.mock("@/contexts/AuthContext", () => ({
    useAuth: vi.fn()
}));

vi.mock("@/hooks/use-transaction-metadata", () => ({
    useTransactionMetadata: vi.fn()
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }
};

describe("useSaldosTransactions hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ ...vi.mocked(useAuth)(), isDemo: false });
        vi.mocked(useTransactionMetadata).mockReturnValue({
            data: {
                profiles: [],
                accounts: [],
                merchants: [],
                profileNameMap: new Map(),
                accountNameMap: new Map(),
                merchantNameMap: new Map(),
                accountEntityMap: new Map(),
            },
            isLoading: false,
            refetch: vi.fn(),
            error: null
        });
    });

    it("should filter and map ledger transactions correctly (including migrated ones)", async () => {
        const mockLedgerData = [
            {
                id: "l1",
                type: "transfer",
                amount_cents: 10000,
                metadata: { modulo: "aporte_saldo" },
                created_at: "2026-02-08T00:00:00Z",
                created_by: "u1",
                source_account: "acc1",
                destination_account: "m1"
            },
            {
                id: "l2",
                type: "expense",
                amount_cents: 5000,
                metadata: { original_module: "consumo_saldo" }, // Migrated transaction
                created_at: "2026-02-07T00:00:00Z",
                created_by: "u1",
                source_account: "m1",
                destination_account: null
            },
            {
                id: "l3",
                type: "income",
                amount_cents: 2000,
                metadata: { modulo: "other" }, // Should be filtered out
                created_at: "2026-02-06T00:00:00Z",
                created_by: "u1",
                source_account: "ext",
                destination_account: "acc1"
            }
        ];

        const mockQuery = {
            select: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: mockLedgerData, error: null })),
            range: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockReturnThis(),
            csv: vi.fn().mockReturnThis(),
            abortSignal: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            match: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            like: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            contains: vi.fn().mockReturnThis(),
            containedBy: vi.fn().mockReturnThis(),
            rangeGt: vi.fn().mockReturnThis(),
            rangeGte: vi.fn().mockReturnThis(),
            rangeLt: vi.fn().mockReturnThis(),
            rangeLte: vi.fn().mockReturnThis(),
            rangeAdjacent: vi.fn().mockReturnThis(),
            overlaps: vi.fn().mockReturnThis(),
            textSearch: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            rpc: vi.fn().mockReturnThis(),
            returns: vi.fn().mockReturnThis(),
            explain: vi.fn().mockReturnThis(),
            throwOnError: vi.fn().mockReturnThis(),
        };

        vi.mocked(supabase.from).mockImplementation(((table: string) => {
            if (table === "transactions") {
                // Return empty for legacy to focus on ledger mapping in this test
                return { ...mockQuery, then: vi.fn((resolve) => resolve({ data: [], error: null })) } as any;
            }
            return mockQuery as any;
        }) as any);

        const { result } = renderHook(() => useSaldosTransactions(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(3);
        expect(result.current.data![0].id).toBe("l1");
        expect(result.current.data![1].id).toBe("l2"); // Migrated one correctly identified
        expect(result.current.data![2].id).toBe("l3");
        expect(result.current.data![0].amount).toBe(100);
        expect(result.current.data![1].amount).toBe(50);
    });
});
