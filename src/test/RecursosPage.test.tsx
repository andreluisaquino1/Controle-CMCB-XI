import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RecursosPage from "../pages/RecursosPage";
import React from "react";
import { useEntitiesWithAccounts } from "@/hooks/use-accounts";
import { useMerchants } from "@/hooks/use-merchants";
import { useRecursosTransactions } from "@/hooks/use-entity-transactions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/use-accounts", () => ({
    useEntitiesWithAccounts: vi.fn(),
    useCreateAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
    useUpdateAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
    useDeactivateAccount: vi.fn(() => ({ mutateAsync: vi.fn() })),
    useActivateAccount: vi.fn(() => ({ mutateAsync: vi.fn() }))
}));

vi.mock("@/hooks/use-merchants", () => ({
    useMerchants: vi.fn()
}));

vi.mock("@/hooks/use-entity-transactions", () => ({
    useRecursosTransactions: vi.fn()
}));

vi.mock("@/hooks/use-transactions", () => ({
    useCreateTransaction: vi.fn(() => ({ mutateAsync: vi.fn() })),
    useCreateResourceTransaction: vi.fn(() => ({ mutateAsync: vi.fn() })),
    useVoidTransaction: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isPending: false
    }))
}));

// Mock Ledger
vi.mock("@/domain/ledger", () => ({
    createLedgerTransaction: vi.fn()
}));

// Mock layout/components
vi.mock("@/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/components/ActionCard", () => ({
    ActionCard: ({ title, onClick }: any) => <div onClick={onClick} data-testid="action-card">{title}</div>
}));

vi.mock("@/components/transactions/TransactionTable", () => ({
    TransactionTable: () => <div data-testid="transaction-table">Mock Table</div>
}));

vi.mock("@/components/transactions/TransactionExportActions", () => ({
    TransactionExportActions: () => <div>Mock Export</div>
}));

// Mock Dialogs
vi.mock("@/components/forms/EntradaRecursoDialog", () => ({ EntradaRecursoDialog: () => <div>Mock Entrada</div> }));
vi.mock("@/components/forms/GastoRecursoDialog", () => ({ GastoRecursoDialog: () => <div>Mock Gasto</div> }));
vi.mock("@/components/forms/AccountDialog", () => ({ AccountDialog: () => <div>Mock Account Dialog</div> }));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("RecursosPage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (useEntitiesWithAccounts as any).mockReturnValue({
            data: {
                entities: [
                    { id: "ent-ue", name: "UE Test", type: "ue" },
                    { id: "ent-cx", name: "CX Test", type: "cx" }
                ],
                accounts: [
                    { id: "acc-pdde", name: "PDDE", balance: 5000, entity_id: "ent-ue", active: true },
                    { id: "acc-pnae", name: "PNAE", balance: 3000, entity_id: "ent-cx", active: true }
                ]
            },
            isLoading: false,
            refetch: vi.fn()
        });

        (useMerchants as any).mockReturnValue({
            data: [],
            isLoading: false
        });

        (useRecursosTransactions as any).mockReturnValue({
            data: [{ id: "t1", amount: 200, description: "Recurso Teste", created_at: new Date().toISOString() }],
            isLoading: false
        });
    });

    it("should render page header and entity columns", async () => {
        render(<RecursosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Recursos (UE e CX)")).toBeDefined();
        expect(screen.getByText("Unidade Executora")).toBeDefined();
        expect(screen.getByText("Caixa Escolar")).toBeDefined();
    });

    it("should render accounts with balances", () => {
        render(<RecursosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("PDDE")).toBeDefined();
        expect(screen.getByText("PNAE")).toBeDefined();
        expect(screen.getByText(/5\.000/)).toBeDefined();
        expect(screen.getByText(/3\.000/)).toBeDefined();
    });

    it("should render action cards for entry and expense", () => {
        render(<RecursosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Entrada de Recurso")).toBeDefined();
        expect(screen.getByText("Gasto de Recurso")).toBeDefined();
    });

    it("should render the transactions history table", () => {
        render(<RecursosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Histórico dos Recursos")).toBeDefined();
        expect(screen.getByTestId("transaction-table")).toBeDefined();
    });
});
