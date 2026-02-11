import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockQueryResult } from "../test-utils";
import { render, screen } from "@testing-library/react";
import AssociacaoPage from "@/pages/AssociacaoPage";
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
    })),
    useApproveTransaction: vi.fn(() => ({
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

// Mock auth
vi.mock("@/contexts/AuthContext", () => ({
    useAuth: vi.fn(() => ({
        user: { id: "user-123" },
        profile: { role: "admin" },
        isAdmin: true,
        isDemo: false,
        isSecretaria: false,
        loading: false,
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
        vi.mocked(useAssociacaoAccounts).mockReturnValue(createMockQueryResult([
            { id: "acc-esp", name: "ESPECIE", balance: 1000, entity_id: "ent-assoc", active: true, type: "cash", agency: "", bank: "", account_number: "" },
            { id: "acc-pix", name: "PIX", balance: 2500, entity_id: "ent-assoc", active: true, type: "bank", agency: "0001", bank: "BB", account_number: "123" },
            { id: "acc-dig", name: "CONTA_DIGITAL", balance: 5000, entity_id: "ent-assoc", active: true, type: "bank", agency: "0001", bank: "Inter", account_number: "456" },
            { id: "acc-cof", name: "COFRE", balance: 100, entity_id: "ent-assoc", active: true, type: "cash", agency: "", bank: "", account_number: "" }
        ]));

        vi.mocked(useEntities).mockReturnValue(createMockQueryResult([
            { id: "ent-assoc", type: "associacao", name: "Associação CMCB-XI", cnpj: "00.000.000/0001-00" }
        ]));

        vi.mocked(useAssociacaoTransactions).mockReturnValue(createMockQueryResult([{
            id: "t1", amount: 50, description: "Mensalidade Teste", created_at: new Date().toISOString(),
            creator_name: "User", source_account_name: "Source", destination_account_name: "Dest",
            merchant_name: "Merch", payment_method: "cash", shift: "matutino", created_by: "user-id",
            transaction_date: "2024-01-01", type: "income", status: "completed",
            account_id: "acc-1", entity_id: "ent-assoc", category_id: "cat-1",
            module: "mensalidade", direction: "in", notes: "", source_account_id: "acc-source",
            destination_account_id: "acc-dest", merchant_id: "merch-1", origin_fund: "fund",
            parent_transaction_id: null
        }]));

        vi.mocked(useAssociacaoActions).mockReturnValue({
            state: { mensalidade: {}, gasto: {}, mov: {}, ajuste: {} } as any,
            setters: {} as any,
            handlers: {
                resetMensalidade: vi.fn(),
                resetGasto: vi.fn(),
                handleMensalidadeSubmit: vi.fn(),
                handleGastoSubmit: vi.fn(),
                handleMovimentarSubmit: vi.fn(),
                handleAjusteSubmit: vi.fn(),
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
