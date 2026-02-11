import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { waitFor } from "@testing-library/dom";
import { useMerchants } from "@/hooks/use-merchants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
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

vi.mock("@/demo/useDemoData", () => ({
    useDemoData: vi.fn()
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
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

describe("useMerchants hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({ isDemo: false } as any);
        vi.mocked(useDemoData).mockReturnValue({ merchants: [] } as any);
    });

    it("should fetch merchants and merge with ledger balances", async () => {
        const mockMerchants = [
            { id: "m1", name: "Merchant 1", balance: 10, active: true },
            { id: "m2", name: "Merchant 2", balance: 20, active: true },
        ];
        const mockBalances = [
            { account_id: "m1", balance_cents: 10000 },
        ];

        // Mock first call: Fetch Merchants
        const mockMerchantsQuery = {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: mockMerchants, error: null }))
        };

        // Mock second call: Fetch Balances
        const mockBalancesQuery = {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: vi.fn((resolve) => resolve({ data: mockBalances, error: null }))
        };

        vi.mocked(supabase.from).mockImplementation(((table: string) => {
            if (table === "merchants") return mockMerchantsQuery as unknown as ReturnType<typeof supabase.from>;
            if (table === "ledger_balances") return mockBalancesQuery as unknown as ReturnType<typeof supabase.from>;
            return null as unknown as ReturnType<typeof supabase.from>;
        }) as any);

        const { result } = renderHook(() => useMerchants(), {
            wrapper: createWrapper(),
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toHaveLength(2);
        expect(result.current.data![0].balance).toBe(100); // Merged from ledger: 10000 / 100 = 100
        expect(result.current.data![1].balance).toBe(20);  // Fallback to table balance
    });

    it("should return demo data when isDemo is true", () => {
        const mockDemoMerchants = [{ id: "d1", name: "Demo Merchant", active: true }];
        vi.mocked(useAuth).mockReturnValue({ isDemo: true } as any);
        vi.mocked(useDemoData).mockReturnValue({ merchants: mockDemoMerchants } as any);

        const { result } = renderHook(() => useMerchants(), {
            wrapper: createWrapper(),
        });

        expect(result.current.data).toEqual(mockDemoMerchants);
        expect(supabase.from).not.toHaveBeenCalled();
    });
});
