import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import IntegridadePage from "../pages/IntegridadePage";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useQuery: vi.fn()
    };
});

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
    }
}));

// Mock layout/components
vi.mock("@/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("IntegridadePage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render page header and summary - status OK", () => {
        (useQuery as any).mockReturnValue({
            data: [
                { account_name: "acc1", ledger_balance: 100, transaction_sum: 100, difference: 0, status: 'ok' }
            ],
            isLoading: false,
            refetch: vi.fn()
        });

        render(<IntegridadePage />, { wrapper: createWrapper() });

        expect(screen.getByText("Relatório de Integridade")).toBeDefined();
        expect(screen.getByText("Status Geral: Sistema Íntegro")).toBeDefined();
        expect(screen.getByText("OK")).toBeDefined();
    });

    it("should render page header and summary - status ERROR", () => {
        (useQuery as any).mockReturnValue({
            data: [
                { account_name: "acc2", ledger_balance: 100, transaction_sum: 90, difference: 10, status: 'error' }
            ],
            isLoading: false,
            refetch: vi.fn()
        });

        render(<IntegridadePage />, { wrapper: createWrapper() });

        expect(screen.getByText("Status Geral: Inconsistências Encontradas")).toBeDefined();
        expect(screen.getByText("ERRO")).toBeDefined();
        expect(screen.getAllByText(/10/)).length.greaterThan(0); // Difference or formatted value
    });

    it("should render the detail table", () => {
        (useQuery as any).mockReturnValue({
            data: [
                { account_name: "ledger_key_1", ledger_balance: 500, transaction_sum: 500, difference: 0, status: 'ok' }
            ],
            isLoading: false,
            refetch: vi.fn()
        });

        render(<IntegridadePage />, { wrapper: createWrapper() });

        expect(screen.getByText("Detalhamento por Conta (Chave Ledger)")).toBeDefined();
        expect(screen.getByText("ledger_key_1")).toBeDefined();
        expect(screen.getAllByText(/500/)).toHaveLength(2); // Balance and Sum
    });
});
