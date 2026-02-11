import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AjustarSaldoDialog } from "@/components/forms/AjustarSaldoDialog";
import React from "react";

const mockAccounts = [
    {
        id: "a1",
        name: "Conta 1",
        active: true,
        balance: 1000,
        type: "bank",
        agency: "0001",
        bank: "Bank A",
        account_number: "12345",
        entity_id: "e1",
        created_at: "",
        updated_at: ""
    },
];

const mockState = {
    date: "2024-01-01",
    accountId: "a1",
    valor: 0,
    motivo: "Ajuste Teste",
    obs: "Obs Teste",
};

const mockSetters = {
    setDate: vi.fn(),
    setAccountId: vi.fn(),
    setValor: vi.fn(),
    setMotivo: vi.fn(),
    setObs: vi.fn(),
};

describe("AjustarSaldoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <AjustarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                accounts={mockAccounts}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Ajustar Saldo da Conta")).toBeDefined();
        expect(screen.getByText("Conta a Ajustar *")).toBeDefined();
    });

    it("should calculate final balance when adjustment is entered", async () => {
        render(
            <AjustarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                accounts={mockAccounts}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        const adjustmentInput = screen.getByLabelText("Valor do Ajuste (R$)");
        fireEvent.change(adjustmentInput, { target: { value: "100,00" } });

        // Verify the setValor was called with the parsed value
        expect(mockSetters.setValor).toHaveBeenLastCalledWith(100);
    });

    it("should open confirmation dialog and call onSubmit", async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        const onOpenChange = vi.fn();

        render(
            <AjustarSaldoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={{ ...mockState, valor: 100 }}
                setters={mockSetters}
                accounts={mockAccounts}
                onSubmit={onSubmit}
                isLoading={false}
            />
        );

        fireEvent.click(screen.getByText("Registrar Ajuste"));

        expect(screen.getByText("Confirmar Ajuste de Saldo?")).toBeDefined();

        fireEvent.click(screen.getByText("Confirmar Ajuste"));

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should disable submit button if reason is too short", () => {
        render(
            <AjustarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, motivo: "abc" }} // 3 chars, needs 5
                setters={mockSetters}
                accounts={mockAccounts}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Registrar Ajuste")).toBeDisabled();
    });
});
