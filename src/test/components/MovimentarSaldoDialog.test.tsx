import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MovimentarSaldoDialog } from "@/components/forms/MovimentarSaldoDialog";
import React from "react";
import { ACCOUNT_NAMES } from "@/lib/constants";

const mockAccounts = [
    { id: "a1", name: ACCOUNT_NAMES.ESPECIE, balance: 1000, active: true },
    { id: "a2", name: ACCOUNT_NAMES.PIX, balance: 500, active: true },
    { id: "a3", name: "Conta Digital (Escolaweb)", balance: 200, active: true }
];

const mockState = {
    date: "2024-01-01",
    de: "a1",
    para: "a2",
    valor: 100,
    taxa: 0,
    descricao: "Transferência Teste",
    obs: "Obs Teste",
};

const mockSetters = {
    setDate: vi.fn(),
    setDe: vi.fn(),
    setPara: vi.fn(),
    setValor: vi.fn(),
    setTaxa: vi.fn(),
    setDescricao: vi.fn(),
    setObs: vi.fn(),
};

describe("MovimentarSaldoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <MovimentarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Movimentar Saldo")).toBeDefined();
        expect(screen.getByText("De *")).toBeDefined();
        expect(screen.getByText("Para *")).toBeDefined();
    });

    it("should show impact preview correctly", () => {
        render(
            <MovimentarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, valor: 100, taxa: 5 }}
                setters={mockSetters}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Prévia de Impacto nos Saldos")).toBeDefined();
        // Source projected: 1000 - (100 + 5) = 895
        expect(screen.getByText("R$ 895,00")).toBeDefined();
        // Destination projected: 500 + 100 = 600
        expect(screen.getByText("R$ 600,00")).toBeDefined();
    });

    it("should open confirmation dialog on click", async () => {
        render(
            <MovimentarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        const confirmButton = screen.getByText("Confirmar Movimentação");
        fireEvent.click(confirmButton);

        expect(screen.getByText("Confirmar Movimentação?")).toBeDefined();
        expect(screen.getByText(/Você está transferindo/)).toBeDefined();
    });

    it("should call onSubmit when confirmed", async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        const onOpenChange = vi.fn();

        render(
            <MovimentarSaldoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={mockState}
                setters={mockSetters}
                accounts={mockAccounts as any}
                onSubmit={onSubmit}
                isLoading={false}
            />
        );

        // Open AlertDialoug
        fireEvent.click(screen.getByText("Confirmar Movimentação"));

        // Click action button in AlertDialog
        const actionButton = screen.getByText("Confirmar Transferência");
        fireEvent.click(actionButton);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should disable confirmation button if description is too short", () => {
        render(
            <MovimentarSaldoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, descricao: "abc" }}
                setters={mockSetters}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        const confirmButton = screen.getByText("Confirmar Movimentação");
        expect(confirmButton).toBeDisabled();
    });
});
