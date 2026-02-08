import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AssociacaoPage from "../pages/AssociacaoPage";
import React from "react";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { useAssociacaoTransactions } from "@/hooks/use-entity-transactions";
import { useAssociacaoActions } from "@/hooks/use-associacao-actions";
import { useExpenseShortcuts } from "@/hooks/use-expense-shortcuts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/use-accounts", () => ({
    useAssociacaoAccounts: vi.fn(),
    useEntities: vi.fn()
}));

vi.mock("@/hooks/use-entity-transactions", () => ({
    useAssociacaoTransactions: vi.fn()
}));

vi.mock("@/hooks/use-associacao-actions", () => ({
    useAssociacaoActions: vi.fn()
}));

vi.mock("@/hooks/use-transactions", () => ({
    useVoidTransaction: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isPending: false
    }))
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

vi.mock("@/components/transactions/TransactionTable", () => ({
    TransactionTable: () => <div data-testid="transaction-table">Mock Table</div>
}));

vi.mock("@/components/transactions/TransactionExportActions", () => ({
    TransactionExportActions: () => <div>Mock Export</div>
}));

// Mock Dialogs
vi.mock("@/components/forms/MensalidadeDialog", () => ({ MensalidadeDialog: () => <div>Mock Mensalidade</div> }));
vi.mock("@/components/forms/GastoAssociacaoDialog", () => ({ GastoAssociacaoDialog: () => <div>Mock Gasto</div> }));
vi.mock("@/components/forms/MovimentarSaldoDialog", () => ({ MovimentarSaldoDialog: () => <div>Mock Movimentar</div> }));
vi.mock("@/components/forms/AjustarSaldoDialog", () => ({ AjustarSaldoDialog: () => <div>Mock Ajustar</div> }));
vi.mock("@/components/forms/PixFeeBatchDialog", () => ({ PixFeeBatchDialog: () => <div>Mock Pix Fee</div> }));
vi.mock("@/components/forms/PixNaoIdentificadoDialog", () => ({ PixNaoIdentificadoDialog: () => <div>Mock Pix Nao Id</div> }));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("AssociacaoPage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (useAssociacaoAccounts as any).mockReturnValue({
            data: [
                { id: "acc-esp", name: "ESPECIE", balance: 1000 },
                { id: "acc-pix", name: "PIX", balance: 2500 },
                { id: "acc-dig", name: "CONTA_DIGITAL", balance: 5000 },
                { id: "acc-cof", name: "COFRE", balance: 100 }
            ],
            isLoading: false
        });

        (useEntities as any).mockReturnValue({
            data: [{ id: "ent-assoc", type: "associacao", name: "Associação CMCB-XI" }],
            isLoading: false
        });

        (useAssociacaoTransactions as any).mockReturnValue({
            data: [{ id: "t1", amount: 50, description: "Mensalidade Teste", created_at: new Date().toISOString() }],
            isLoading: false
        });

        (useAssociacaoActions as any).mockReturnValue({
            state: { mensalidade: {}, gasto: {}, mov: {}, ajuste: {} },
            setters: {},
            handlers: {
                resetMensalidade: vi.fn(),
                resetGasto: vi.fn(),
                resetMov: vi.fn(),
                resetAjuste: vi.fn(),
            },
            isLoading: false
        });
    });

    it("should render page header and balance cards", async () => {
        render(<AssociacaoPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Associação")).toBeDefined();
        expect(screen.getByText("Espécie")).toBeDefined();
        expect(screen.getByText("PIX (Conta BB)")).toBeDefined();
        expect(screen.getByText("Conta Digital (Escolaweb)")).toBeDefined();
        expect(screen.getByText("Cofre")).toBeDefined();
    });

    it("should render action cards", () => {
        render(<AssociacaoPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Mensalidades")).toBeDefined();
        expect(screen.getByText("Despesa Associação")).toBeDefined();
        expect(screen.getByText("Movimentar Saldo")).toBeDefined();
        expect(screen.getByText("PIX Fantasma")).toBeDefined();
        expect(screen.getByText("Taxas PIX")).toBeDefined();
        expect(screen.getByText("Ajustar Saldo")).toBeDefined();
    });

    it("should render the transaction history table", () => {
        render(<AssociacaoPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Histórico da Associação")).toBeDefined();
        expect(screen.getByTestId("transaction-table")).toBeDefined();
    });
});
