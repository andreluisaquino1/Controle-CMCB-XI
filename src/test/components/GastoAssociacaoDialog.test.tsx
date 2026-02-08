import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GastoAssociacaoDialog } from "@/components/forms/GastoAssociacaoDialog";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createLedgerTransaction } from "@/domain/ledger";
import { toast } from "sonner";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { ACCOUNT_NAMES } from "@/lib/constants";

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
    useAssociacaoAccounts: vi.fn(() => ({
        data: [
            { id: "a1", name: ACCOUNT_NAMES.ESPECIE, balance: 1000, active: true },
            { id: "a2", name: ACCOUNT_NAMES.PIX, balance: 500, active: true }
        ],
        isLoading: false
    })),
    useEntities: vi.fn(() => ({
        data: [{ id: "e1", name: "Associação", type: "associacao" }],
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

// Mock crypto for randomUUID
if (typeof window !== 'undefined' && !window.crypto) {
    (window as any).crypto = {
        randomUUID: () => 'test-uuid-' + Math.random(),
    };
}

const mockState = {
    date: "2024-01-01",
    meio: "cash",
    obs: "Obs Teste",
};

const mockSetters = {
    setDate: vi.fn(),
    setMeio: vi.fn(),
    setObs: vi.fn(),
};

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("GastoAssociacaoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <GastoAssociacaoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
                shortcuts={[]}
                addShortcut={vi.fn()}
                removeShortcut={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        expect(screen.getByText("Registrar Gasto (Lote)")).toBeDefined();
        expect(screen.getByText("Meio de Pagamento *")).toBeDefined();
    });

    it("should handle adding and removing batch items", async () => {
        render(
            <GastoAssociacaoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
                shortcuts={[]}
                addShortcut={vi.fn()}
                removeShortcut={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const addItemButton = screen.getByText("Item");
        fireEvent.click(addItemButton);

        // Should have 2 items now
        expect(screen.getAllByLabelText(/Descrição \*/i)).toHaveLength(2);

        // Remove one
        const removeButtons = screen.getAllByRole("button").filter(b => b.className.includes("text-destructive"));
        fireEvent.click(removeButtons[0]);

        expect(screen.getAllByLabelText(/Descrição \*/i)).toHaveLength(1);
    });

    it("should call createLedgerTransaction for valid items on submit", async () => {
        const onOpenChange = vi.fn();
        (createLedgerTransaction as any).mockResolvedValue({ data: {}, error: null });

        render(
            <GastoAssociacaoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={mockState}
                setters={mockSetters}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
                shortcuts={[]}
                addShortcut={vi.fn()}
                removeShortcut={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const descInputs = screen.getAllByPlaceholderText("Ex: Material");
        const amountInputs = screen.getAllByPlaceholderText("0,00");

        fireEvent.change(descInputs[0], { target: { value: "Item Teste" } });
        fireEvent.change(amountInputs[0], { target: { value: "50,00" } });

        const submitButton = screen.getByText("Lançar Gastos");
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(createLedgerTransaction).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("despesas registradas"));
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should show warning when balance is insufficient", async () => {
        (useAssociacaoAccounts as any).mockReturnValue({
            data: [{ id: "a1", name: ACCOUNT_NAMES.ESPECIE, balance: 10, active: true }],
            isLoading: false
        });

        render(
            <GastoAssociacaoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
                shortcuts={[]}
                addShortcut={vi.fn()}
                removeShortcut={vi.fn()}
            />,
            { wrapper: createWrapper() }
        );

        const descInputs = screen.getAllByPlaceholderText("Ex: Material");
        const amountInputs = screen.getAllByPlaceholderText("0,00");

        fireEvent.change(descInputs[0], { target: { value: "Item Caro" } });
        fireEvent.change(amountInputs[0], { target: { value: "100,00" } }); // Balance is 10

        const submitButton = screen.getByText("Lançar Gastos");
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("Saldo insuficiente"));
        });
    });
});
