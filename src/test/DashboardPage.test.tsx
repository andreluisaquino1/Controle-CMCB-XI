import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../pages/DashboardPage";
import React from "react";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useAssociacaoAccounts, useEntitiesWithAccounts } from "@/hooks/use-accounts";
import { useAssociacaoActions } from "@/hooks/use-associacao-actions";
import { useSaldosActions } from "@/hooks/use-saldos-actions";
import { useExpenseShortcuts } from "@/hooks/use-expense-shortcuts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/use-dashboard-data", () => ({
    useDashboardData: vi.fn()
}));

vi.mock("@/hooks/use-accounts", () => ({
    useAssociacaoAccounts: vi.fn(),
    useEntitiesWithAccounts: vi.fn()
}));

vi.mock("@/hooks/use-associacao-actions", () => ({
    useAssociacaoActions: vi.fn()
}));

vi.mock("@/hooks/use-saldos-actions", () => ({
    useSaldosActions: vi.fn()
}));

vi.mock("@/hooks/use-expense-shortcuts", () => ({
    useExpenseShortcuts: vi.fn(() => ({
        shortcuts: [],
        addShortcut: vi.fn(),
        removeShortcut: vi.fn()
    }))
}));

// Mock layout/components
vi.mock("@/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/components/ActionCard", () => ({
    ActionCard: ({ title, onClick }: any) => <div onClick={onClick} data-testid="action-card">{title}</div>
}));

// Mock Dialogs
vi.mock("@/components/forms/MensalidadeDialog", () => ({ MensalidadeDialog: () => <div>Mock Mensalidade</div> }));
vi.mock("@/components/forms/GastoAssociacaoDialog", () => ({ GastoAssociacaoDialog: () => <div>Mock Gasto Assoc</div> }));
vi.mock("@/components/forms/ConsumoSaldoDialog", () => ({ ConsumoSaldoDialog: () => <div>Mock Consumo Mer</div> }));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("DashboardPage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (useDashboardData as any).mockReturnValue({
            data: {
                especieBalance: 1000,
                pixBalance: 2000,
                contaDigitalBalance: 3000,
                cofreBalance: 500,
                merchantBalances: [
                    { id: "m1", name: "Merchant A", balance: 150 }
                ],
                resourceBalances: {
                    UE: [{ id: "ue1", name: "UE Acc 1", balance: 10000 }],
                    CX: [{ id: "cx1", name: "CX Acc 1", balance: 5000 }]
                }
            },
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        (useAssociacaoAccounts as any).mockReturnValue({
            data: [],
            isLoading: false
        });

        (useEntitiesWithAccounts as any).mockReturnValue({
            data: { entities: [], accounts: [] },
            isLoading: false
        });

        (useAssociacaoActions as any).mockReturnValue({
            state: { mensalidade: {}, gasto: {} },
            setters: {},
            handlers: { resetMensalidade: vi.fn(), resetGasto: vi.fn() },
            isLoading: false
        });

        (useSaldosActions as any).mockReturnValue({
            state: { aporte: {}, gasto: {} },
            setters: {},
            handlers: { resetGasto: vi.fn() },
            isLoading: false
        });
    });

    it("should render page header and summary totals", () => {
        render(<DashboardPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Resumo")).toBeDefined();
        expect(screen.getByText(/1\.000/)).toBeDefined(); // Especie
        expect(screen.getByText(/2\.000/)).toBeDefined(); // PIX
        expect(screen.getByText(/3\.000/)).toBeDefined(); // Conta Digital
        expect(screen.getByText(/500/)).toBeDefined();   // Cofre
    });

    it("should render quick action cards", () => {
        render(<DashboardPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Mensalidade")).toBeDefined();
        expect(screen.getByText("Despesa Associação")).toBeDefined();
        expect(screen.getByText("Gasto Estabelecimento")).toBeDefined();
    });

    it("should render merchant balances", () => {
        render(<DashboardPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Merchant A")).toBeDefined();
        expect(screen.getByText(/150/)).toBeDefined();
    });

    it("should render resource balances", () => {
        render(<DashboardPage />, { wrapper: createWrapper() });

        expect(screen.getByText("UE Acc 1")).toBeDefined();
        expect(screen.getByText("CX Acc 1")).toBeDefined();
        expect(screen.getByText(/10\.000/)).toBeDefined();
        expect(screen.getByText(/5\.000/)).toBeDefined();
    });
});
