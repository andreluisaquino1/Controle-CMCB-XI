/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GastoAssociacaoDialog } from "../GastoAssociacaoDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { transactionService } from "@/features/transactions/services/transactionService";
import { toast } from "sonner";
import React from "react";
import { ACCOUNT_NAMES } from "@/shared/lib/constants";

// Mock services/hooks
vi.mock("@/features/transactions/services/transactionService", () => ({
    transactionService: {
        createLedgerTransaction: vi.fn().mockResolvedValue({ error: null }),
    }
}));

vi.mock("@/shared/hooks/use-accounts", () => ({
    useAssociacaoAccounts: vi.fn(() => ({
        data: [
            { id: "a1", name: ACCOUNT_NAMES.ESPECIE, balance: 1000, active: true },
            { id: "a2", name: ACCOUNT_NAMES.PIX, balance: 2000, active: true },
        ],
        isLoading: false
    })),
    useEntities: vi.fn(() => ({
        data: [{ id: "e1", type: "associacao", name: "Associação" }],
        isLoading: false
    }))
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    }
}));

// Mock complex form components to be simple inputs
vi.mock("@/shared/components/forms/CurrencyInput", () => ({
    CurrencyInput: ({ value, onChange, id }: any) => (
        <input
            id={id}
            aria-label="Valor"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
        />
    )
}));

vi.mock("@/shared/components/forms/DateInput", () => ({
    DateInput: ({ value, onChange, id }: any) => (
        <input
            id={id}
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("GastoAssociacaoDialog", () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        state: { date: "2024-01-01", meio: "cash", obs: "" },
        setters: { setDate: vi.fn(), setMeio: vi.fn(), setObs: vi.fn() },
        onSubmit: vi.fn(),
        isLoading: false,
        shortcuts: [],
        addShortcut: vi.fn(),
        removeShortcut: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render and allow adding multiple items", async () => {
        render(<GastoAssociacaoDialog {...defaultProps} />, { wrapper });

        expect(screen.getByText("Registrar Gasto (Lote)")).toBeDefined();

        const addButton = screen.getByText("Item");
        fireEvent.click(addButton);

        // Should now have 2 items (default is 1)
        const inputs = screen.getAllByPlaceholderText("Ex: Material");
        expect(inputs).toHaveLength(2);
    });

    it("should call transactionService on submit", async () => {
        render(<GastoAssociacaoDialog {...defaultProps} />, { wrapper });

        // Fill description
        const descInputs = screen.getAllByPlaceholderText("Ex: Material");
        fireEvent.change(descInputs[0], { target: { value: "Gasolina" } });

        // Fill amount (mocked CurrencyInput takes number directly from target.value)
        const amountInputs = screen.getAllByLabelText(/Valor/i);
        fireEvent.change(amountInputs[0], { target: { value: "50" } });

        const submitButton = screen.getByText("Lançar Gastos");
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(transactionService.createLedgerTransaction).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("1 despesas registradas.");
        });
    });
});
