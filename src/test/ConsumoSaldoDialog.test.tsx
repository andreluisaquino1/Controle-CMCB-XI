import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConsumoSaldoDialog } from "../components/forms/ConsumoSaldoDialog";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createLedgerTransaction } from "@/domain/ledger";
import { toast } from "sonner";
import { useEntities } from "@/hooks/use-accounts";

// Mock dependencies
vi.mock("@/domain/ledger", () => ({
    createLedgerTransaction: vi.fn(),
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    },
}));

vi.mock("@/hooks/use-accounts", () => ({
    useEntities: vi.fn(() => ({
        data: [{ id: "ent1", name: "Associação", type: "associacao" }],
        isLoading: false
    })),
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
    merchant: "m1",
    valor: 0,
    descricao: "",
    obs: "Obs Teste",
};

const mockSetters = {
    setDate: vi.fn(),
    setMerchant: vi.fn(),
    setValor: vi.fn(),
    setDescricao: vi.fn(),
    setObs: vi.fn(),
};

const mockMerchants = [{ id: "m1", name: "Mercado A", balance: 50, active: true }];

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("ConsumoSaldoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <ConsumoSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                merchants={mockMerchants as any}
                onSubmit={vi.fn()}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText("Registrar Gastos")).toBeDefined();
        expect(screen.getByText("Estabelecimento *")).toBeDefined();
    });

    it("should handle adding and removing batch items", async () => {
        render(
            <ConsumoSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                merchants={mockMerchants as any}
                onSubmit={vi.fn()}
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

        render(
            <ConsumoSaldoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={{ ...mockState, merchant: "m1" }}
                setters={mockSetters}
                merchants={mockMerchants as any}
                onSubmit={vi.fn()}
                isLoading={false}
            />,
            { wrapper: createWrapper() }
        );

        // Fill one item
        const descInputs = screen.getAllByPlaceholderText("Ex: Produto X");
        const amountInputs = screen.getAllByPlaceholderText("0,00"); // CurrencyInput placeholder

        fireEvent.change(descInputs[0], { target: { value: "Item 1" } });
        // CurrencyInput handling is indirect. 
        // In the mock state of the component, it uses batchItems.
        // Since we are mocking the whole component, we need to check if fireEvent works on inputs.

        // Actually, the component uses internal state for batchItems.
        // To test it, we need to interact with the real inputs.
        fireEvent.change(amountInputs[0], { target: { value: "10" } }); // Should update to 10 via CurrencyInput

        const submitButton = screen.getByText("Lançar Gastos");
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(createLedgerTransaction).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("consumos registrados"));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });
});
