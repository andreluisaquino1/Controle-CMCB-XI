import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/features/dashboard/pages/DashboardPage";
import React from "react";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { useAssociacaoAccounts, useEntitiesWithAccounts } from "@/shared/hooks/use-accounts";
import { useAssociacaoActions } from "@/features/associacao/hooks/use-associacao-actions";
import { useSaldosActions } from "@/features/recursos/hooks/use-saldos-actions";
import { useExpenseShortcuts } from "@/features/transactions/hooks/use-expense-shortcuts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/features/dashboard/hooks/use-dashboard-data", () => ({
    useDashboardData: vi.fn()
}));

vi.mock("@/shared/hooks/use-accounts", () => ({
    useAssociacaoAccounts: vi.fn(),
    useEntitiesWithAccounts: vi.fn()
}));

vi.mock("@/features/associacao/hooks/use-associacao-actions", () => ({
    useAssociacaoActions: vi.fn()
}));

vi.mock("@/features/recursos/hooks/use-saldos-actions", () => ({
    useSaldosActions: vi.fn()
}));

vi.mock("@/features/transactions/hooks/use-expense-shortcuts", () => ({
    useExpenseShortcuts: vi.fn(() => ({
        shortcuts: [],
        addShortcut: vi.fn(),
        removeShortcut: vi.fn()
    }))
}));

vi.mock("@/features/auth/contexts/AuthContext", () => ({
    useAuth: vi.fn(() => ({
        user: { id: "u1", email: "test@example.com" },
        profile: { id: "p1", full_name: "Test User", role: "admin" },
        isDemo: false
    }))
}));

// Mock layout/components
vi.mock("@/shared/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/shared/components/ActionCard", () => ({
    ActionCard: ({ title, onClick }: { title: string; onClick: () => void }) => <div onClick={onClick} data-testid="action-card">{title}</div>
}));

// Mock Dialogs
vi.mock("@/features/associacao/components/MensalidadeDialog", () => ({ MensalidadeDialog: () => <div>Mock Mensalidade</div> }));
vi.mock("@/features/associacao/components/GastoAssociacaoDialog", () => ({ GastoAssociacaoDialog: () => <div>Mock Gasto Assoc</div> }));
vi.mock("@/features/recursos/components/ConsumoSaldoDialog", () => ({ ConsumoSaldoDialog: () => <div>Mock Consumo Mer</div> }));

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
        vi.mocked(useDashboardData).mockReturnValue({
            data: {
                especieBalance: 1000,
                pixBalance: 2000,
                contaDigitalBalance: 3000,
                cofreBalance: 500,
                merchantBalances: [
                    { id: "m1", name: "Merchant A", balance: 150, active: true, mode: "active" }
                ],
                resourceBalances: {
                    UE: [{
                        id: "ue1", name: "UE Acc 1", balance: 10000,
                        type: "bank",
                        entity_id: "e1",
                        active: true,
                        agency: "",
                        bank: "",
                        account_number: ""
                    }],
                    CX: [{
                        id: "cx1", name: "CX Acc 1", balance: 5000,
                        type: "bank",
                        entity_id: "e1",
                        active: true,
                        agency: "",
                        bank: "",
                        account_number: ""
                    }]
                }
            },
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        vi.mocked(useAssociacaoAccounts).mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
            isError: false,
            isSuccess: true,
            refetch: vi.fn()
        } as any);

        vi.mocked(useEntitiesWithAccounts).mockReturnValue({
            data: { entities: [], accounts: [] },
            isLoading: false,
            error: null,
            isSuccess: true,
            isError: false
        } as any);

        vi.mocked(useAssociacaoActions).mockReturnValue({
            state: { mensalidade: {}, gasto: {}, mover: {}, ajuste: {}, receita: {} } as any,
            setters: {
                mensalidade: {},
                gasto: {},
                mover: {},
                ajuste: {},
                receita: {}
            } as any,
            handlers: {
                resetMensalidade: vi.fn(),
                resetGasto: vi.fn(),
                handleMensalidadeSubmit: vi.fn(),
                handleGastoSubmit: vi.fn(),
                handleMovimentarSubmit: vi.fn(),
                handleAjusteSubmit: vi.fn(),
                resetMov: vi.fn(),
                resetAjuste: vi.fn()
            },
            isLoading: false
        });

        vi.mocked(useSaldosActions).mockReturnValue({
            state: { aporte: {}, gasto: {}, consumo: {}, mover: {}, ajuste: {} } as any,
            setters: {
                aporte: {},
                gasto: {},
                consumo: {},
                mover: {},
                ajuste: {}
            } as any,
            handlers: {
                resetGasto: vi.fn(),
                handleAporteSubmit: vi.fn(),
                handleAddMerchant: vi.fn(),
                handleEditMerchant: vi.fn(),
                handleDeleteMerchant: vi.fn(),
                handleActivateMerchant: vi.fn(),
                handleGastoSubmit: vi.fn(), // Added this
                resetAporte: vi.fn()
            },
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
