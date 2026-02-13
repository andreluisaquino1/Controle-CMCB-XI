/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockQueryResult } from "@/test/test-utils";
import { render, screen } from "@testing-library/react";
import SaldosPage from "@/features/recursos/pages/SaldosPage";
import React from "react";
import { useMerchants } from "@/features/merchants/hooks/use-merchants";
import { useEntitiesWithAccounts, useEntities } from "@/shared/hooks/use-accounts";
import { useSaldosTransactions } from "@/features/transactions/hooks/use-entity-transactions";
import { useSaldosActions } from "@/features/recursos/hooks/use-saldos-actions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/features/merchants/hooks/use-merchants", () => ({
    useMerchants: vi.fn()
}));

vi.mock("@/shared/hooks/use-accounts", () => ({
    useEntitiesWithAccounts: vi.fn(),
    useEntities: vi.fn()
}));

vi.mock("@/features/transactions/hooks/use-entity-transactions", () => ({
    useSaldosTransactions: vi.fn()
}));

vi.mock("@/features/transactions/hooks/use-transactions", () => ({
    useVoidTransaction: vi.fn(() => ({
        mutateAsync: vi.fn()
    }))
}));

vi.mock("@/features/recursos/hooks/use-saldos-actions", () => ({
    useSaldosActions: vi.fn()
}));

// Mock layout/components that might be complex
vi.mock("@/shared/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/features/recursos/components/AporteSaldoDialog", () => ({
    AporteSaldoDialog: () => <div>Mock Aporte</div>
}));

vi.mock("@/features/recursos/components/ConsumoSaldoDialog", () => ({
    ConsumoSaldoDialog: () => <div>Mock Consumo</div>
}));

vi.mock("@/shared/components/ActionCard", () => ({
    ActionCard: () => <div>Mock Action Card</div>
}));

vi.mock("@/features/transactions/components/TransactionExportActions", () => ({
    TransactionExportActions: () => <div>Mock Export</div>
}));

// Mock components that use complex libs (like Recharts which often breaks in JSDOM)
vi.mock("@/features/transactions/components/TransactionTable", () => ({
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
        vi.mocked(useMerchants).mockReturnValue(createMockQueryResult([
            { id: "m1", name: "Merchant Test", balance: 500, active: true }
        ]));

        vi.mocked(useEntitiesWithAccounts).mockReturnValue(createMockQueryResult({ entities: [], accounts: [] }));

        vi.mocked(useEntities).mockReturnValue(createMockQueryResult([]));

        vi.mocked(useSaldosTransactions).mockReturnValue(createMockQueryResult([{
            id: "t1", amount: 100, description: "Test Transaction", created_at: new Date().toISOString(),
            creator_name: "User", source_account_name: "Source", destination_account_name: "Dest",
            merchant_name: "Merch", payment_method: "cash", shift: "matutino", created_by: "user-id",
            transaction_date: "2024-01-01", type: "expense", status: "completed", account_id: "acc-1", entity_id: "ent-1",
            category_id: "cat-1",
            module: "gasto", direction: "out", notes: "", source_account_id: "acc-source",
            destination_account_id: "acc-dest", merchant_id: "merch-1", origin_fund: "fund",
            parent_transaction_id: null
        }]));

        vi.mocked(useSaldosActions).mockReturnValue({
            state: { aporte: {}, gasto: {}, newMerchantName: "", editingMerchant: null, deletingMerchant: null } as any,
            setters: {
                setAporteDate: vi.fn(),
                setGastoDate: vi.fn(),
                setNewMerchantName: vi.fn()
            } as any,
            handlers: {
                resetGasto: vi.fn(),
                handleAporteSubmit: vi.fn(),
                handleAddMerchant: vi.fn(),
                handleEditMerchant: vi.fn(),
                handleDeleteMerchant: vi.fn(),
                handleActivateMerchant: vi.fn(),
                resetAporte: vi.fn()
            },
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
