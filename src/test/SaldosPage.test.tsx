import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SaldosPage from "../pages/SaldosPage";
import React from "react";
import { useMerchants } from "@/hooks/use-merchants";
import { useEntitiesWithAccounts, useEntities } from "@/hooks/use-accounts";
import { useSaldosTransactions } from "@/hooks/use-entity-transactions";
import { useSaldosActions } from "@/hooks/use-saldos-actions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/use-merchants", () => ({
    useMerchants: vi.fn()
}));

vi.mock("@/hooks/use-accounts", () => ({
    useEntitiesWithAccounts: vi.fn(),
    useEntities: vi.fn()
}));

vi.mock("@/hooks/use-entity-transactions", () => ({
    useSaldosTransactions: vi.fn()
}));

vi.mock("@/hooks/use-transactions", () => ({
    useVoidTransaction: vi.fn(() => ({
        mutateAsync: vi.fn()
    }))
}));

vi.mock("@/hooks/use-saldos-actions", () => ({
    useSaldosActions: vi.fn()
}));

// Mock layout/components that might be complex
vi.mock("@/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/components/forms/AporteSaldoDialog", () => ({
    AporteSaldoDialog: () => <div>Mock Aporte</div>
}));

vi.mock("@/components/forms/ConsumoSaldoDialog", () => ({
    ConsumoSaldoDialog: () => <div>Mock Consumo</div>
}));

vi.mock("@/components/ActionCard", () => ({
    ActionCard: () => <div>Mock Action Card</div>
}));

vi.mock("@/components/transactions/TransactionExportActions", () => ({
    TransactionExportActions: () => <div>Mock Export</div>
}));

// Mock components that use complex libs (like Recharts which often breaks in JSDOM)
vi.mock("@/components/transactions/TransactionTable", () => ({
    TransactionTable: () => <div data-testid="transaction-table">Mock Table</div>
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("SaldosPage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (useMerchants as any).mockReturnValue({
            data: [{ id: "m1", name: "Merchant Test", balance: 500, active: true }],
            isLoading: false,
            refetch: vi.fn()
        });

        (useEntitiesWithAccounts as any).mockReturnValue({
            data: { entities: [], accounts: [] },
            isLoading: false
        });

        (useEntities as any).mockReturnValue({
            data: [],
            isLoading: false
        });

        (useSaldosTransactions as any).mockReturnValue({
            data: [{ id: "t1", amount: 100, description: "Test Transaction", created_at: new Date().toISOString() }],
            isLoading: false
        });

        (useSaldosActions as any).mockReturnValue({
            state: { aporte: {}, gasto: {}, newMerchantName: "", editingMerchant: null, deletingMerchant: null },
            setters: {},
            handlers: {},
            isLoading: false
        });
    });

    it("should render page header and merchant balance cards", async () => {
        render(<SaldosPage />, { wrapper: createWrapper() });

        expect(await screen.findByText(/Saldos nos Estabelecimentos/i)).toBeDefined();
        expect(await screen.findByText(/Merchant Test/i)).toBeDefined();
        expect(await screen.findByText(/500/)).toBeDefined();
    });

    it("should render the transaction history section", async () => {
        render(<SaldosPage />, { wrapper: createWrapper() });

        expect(await screen.findByText(/Histórico de Saldos nos Estabelecimentos/i)).toBeDefined();
        expect(screen.getByTestId("transaction-table")).toBeDefined();
    });
});
