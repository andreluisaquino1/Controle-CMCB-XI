import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AporteSaldoDialog } from "../components/forms/AporteSaldoDialog";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createLedgerTransaction } from "@/domain/ledger";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/domain/ledger", () => ({
    createLedgerTransaction: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useQueryClient: vi.fn(() => ({
            invalidateQueries: vi.fn(),
        })),
    };
});

const mockState = {
    date: "2024-01-01",
    origem: "ASSOC",
    conta: "acc1",
    merchant: "m1",
    valor: 100,
    descricao: "Depósito Teste",
    obs: "Obs Teste",
    capitalCusteio: "custeio",
};

const mockSetters = {
    setDate: vi.fn(),
    setOrigem: vi.fn(),
    setAccount: vi.fn(),
    setMerchant: vi.fn(),
    setValor: vi.fn(),
    setDescricao: vi.fn(),
    setObs: vi.fn(),
    setCapitalCusteio: vi.fn(),
};

const mockEntities = [{ id: "ent1", name: "Associação", type: "associacao" }];
const mockAccounts = [{ id: "acc1", name: "Espécie", entity_id: "ent1", balance: 1000 }];
const mockMerchants = [{ id: "m1", name: "Mercado A", balance: 50, active: true }];

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("AporteSaldoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <AporteSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                merchants={mockMerchants as any}
                onSubmit={vi.fn()}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText("Aportar Saldo")).toBeDefined();
        expect(screen.getByText("Origem do Recurso *")).toBeDefined();
        expect(screen.getByDisplayValue("Depósito Teste")).toBeDefined();
    });

    it("should call createLedgerTransaction on submit", async () => {
        const onSubmit = vi.fn();
        const onOpenChange = vi.fn();

        render(
            <AporteSaldoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                merchants={mockMerchants as any}
                onSubmit={onSubmit}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        const submitButton = screen.getByText("Registrar Aporte");
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(createLedgerTransaction).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Aporte registrado.");
            expect(onSubmit).toHaveBeenCalled();
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should disable submit button if description is too short", () => {
        const shortState = { ...mockState, descricao: "abc" };
        render(
            <AporteSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={shortState}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                merchants={mockMerchants as any}
                onSubmit={vi.fn()}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        const submitButton = screen.getByText("Registrar Aporte") as HTMLButtonElement;
        expect(submitButton.disabled).toBe(true);
    });
});
