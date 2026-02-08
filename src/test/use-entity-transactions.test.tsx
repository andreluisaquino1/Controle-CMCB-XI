import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useSaldosTransactions } from "../hooks/use-entity-transactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactionMetadata } from "../hooks/use-transaction-metadata";
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

vi.mock("../hooks/use-transaction-metadata", () => ({
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
        (useAuth as any).mockReturnValue({ isDemo: false });
        (useTransactionMetadata as any).mockReturnValue({
            data: {
                profileNameMap: new Map(),
                accountNameMap: new Map(),
                merchantNameMap: new Map(),
            },
            isLoading: false
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
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: mockLedgerData, error: null }))
        };

        (supabase.from as any).mockReturnValue(mockQuery);

        const { result } = renderHook(() => useSaldosTransactions(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0].id).toBe("l1");
        expect(result.current.data![1].id).toBe("l2"); // Migrated one correctly identified
        expect(result.current.data![0].amount).toBe(100);
        expect(result.current.data![1].amount).toBe(50);
    });
});
