import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GastoRecursoDialog } from "@/components/forms/GastoRecursoDialog";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { transactionService } from "@/services/transactionService";
import { toast } from "sonner";

// Mock dependencies
vi.mock("@/services/transactionService", () => ({
    transactionService: {
        createLedgerTransaction: vi.fn(),
    }
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
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

// Mock crypto for randomUUID
if (typeof window !== 'undefined' && !window.crypto) {
    (window as any).crypto = {
        randomUUID: () => 'test-uuid-' + Math.random(),
    };
}

const mockState = {
    date: "2024-01-01",
    entityId: "e1",
    accountId: "a1",
    merchantId: "m1",
    notes: "Notes Test",
    capitalCusteio: "capital",
};

const mockSetters = {
    setDate: vi.fn(),
    setEntityId: vi.fn(),
    setAccountId: vi.fn(),
    setMerchantId: vi.fn(),
    setNotes: vi.fn(),
    setCapitalCusteio: vi.fn(),
};

const mockEntities = [
    { id: "e1", name: "UE Test", type: "ue", cnpj: "" },
    { id: "e2", name: "Associação", type: "associacao", cnpj: "" }
];

const mockAccounts = [
    { id: "a1", name: "Conta 1", entity_id: "e1", active: true, balance: 1000, type: "bank", agency: "", bank: "", account_number: "" },
    { id: "a2", name: "Conta 2", entity_id: "e1", active: true, balance: 500, type: "bank", agency: "", bank: "", account_number: "" }
];

const mockMerchants = [{ id: "m1", name: "Mercado A", active: true, balance: 0 }];

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("GastoRecursoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <GastoRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities}
                accounts={mockAccounts as any}
                merchants={mockMerchants}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText("Registrar Gastos de Recurso")).toBeDefined();
        expect(screen.getByText("Entidade *")).toBeDefined();
        expect(screen.getByText("Conta *")).toBeDefined();
        expect(screen.getByText("Estabelecimento (Para) *")).toBeDefined();
    });

    it("should handle adding and removing batch items", async () => {
        render(
            <GastoRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                merchants={mockMerchants as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        const addItemButton = screen.getByText("Item");
        fireEvent.click(addItemButton);

        // Should have 2 items now (1 initial + 1 added)
        expect(screen.getAllByLabelText(/Descrição \*/i)).toHaveLength(2);

        // Remove one
        const removeButtons = screen.getAllByRole("button").filter(b => b.className.includes("text-destructive"));
        fireEvent.click(removeButtons[0]);

        expect(screen.getAllByLabelText(/Descrição \*/i)).toHaveLength(1);
    });

    it("should call createLedgerTransaction for valid items on submit", async () => {
        const onOpenChange = vi.fn();
        (transactionService.createLedgerTransaction as any).mockResolvedValue({ data: {}, error: null });

        render(
            <GastoRecursoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities}
                accounts={mockAccounts as any}
                merchants={mockMerchants}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        // Fill one item
        const descInputs = screen.getAllByPlaceholderText("Ex: Produto X");
        const amountInputs = screen.getAllByPlaceholderText("0,00");

        fireEvent.change(descInputs[0], { target: { value: "Item Teste" } });
        fireEvent.change(amountInputs[0], { target: { value: "100,00" } });

        const submitButton = screen.getByText("Lançar Gastos");

        // Ensure not disabled
        expect(submitButton).not.toBeDisabled();

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(transactionService.createLedgerTransaction).toHaveBeenCalled();
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("gastos de recursos registrados"));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should show alert when balance will be negative", () => {
        render(
            <GastoRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, accountId: "a2" }}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                merchants={mockMerchants as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        const amountInput = screen.getByPlaceholderText("0,00");
        fireEvent.change(amountInput, { target: { value: "600,00" } }); // Balance is 500

        expect(screen.getByText("Esta operação deixará o saldo da conta negativo.")).toBeDefined();
    });
});
