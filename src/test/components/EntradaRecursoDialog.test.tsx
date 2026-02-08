import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EntradaRecursoDialog } from "@/components/forms/EntradaRecursoDialog";
import React from "react";

const mockEntities = [
    { id: "e1", name: "UE Test", type: "ue" },
    { id: "e2", name: "Associação", type: "associacao" }
];

const mockAccounts = [
    { id: "a1", name: "Conta 1", entity_id: "e1", active: true, balance: 1000 },
];

const mockState = {
    date: "2024-01-01",
    entityId: "e1",
    accountId: "a1",
    amount: 100,
    description: "Repasse PDDE Teste",
    notes: "Notes Test",
};

const mockSetters = {
    setDate: vi.fn(),
    setEntityId: vi.fn(),
    setAccountId: vi.fn(),
    setAmount: vi.fn(),
    setDescription: vi.fn(),
    setNotes: vi.fn(),
};

describe("EntradaRecursoDialog component", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render correctly when open", () => {
        render(
            <EntradaRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Nova Entrada de Recurso")).toBeDefined();
        expect(screen.getByText("Entidade *")).toBeDefined();
        expect(screen.getByText("Conta *")).toBeDefined();
    });

    it("should call onSubmit when clicking 'Registrar Entrada'", async () => {
        const onSubmit = vi.fn().mockResolvedValue(true);
        const onOpenChange = vi.fn();

        render(
            <EntradaRecursoDialog
                open={true}
                onOpenChange={onOpenChange}
                state={mockState}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                onSubmit={onSubmit}
                isLoading={false}
            />
        );

        const submitButton = screen.getByText("Registrar Entrada");
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it("should disable submit button if description is too short", () => {
        render(
            <EntradaRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, description: "PDDE" }} // 4 chars, needs 5
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        const submitButton = screen.getByText("Registrar Entrada");
        expect(submitButton).toBeDisabled();
    });

    it("should disable submit button if entity or account is missing", () => {
        const { rerender } = render(
            <EntradaRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, entityId: "" }}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Registrar Entrada")).toBeDisabled();

        rerender(
            <EntradaRecursoDialog
                open={true}
                onOpenChange={vi.fn()}
                state={{ ...mockState, accountId: "" }}
                setters={mockSetters}
                entities={mockEntities as any}
                accounts={mockAccounts as any}
                onSubmit={vi.fn().mockResolvedValue(true)}
                isLoading={false}
            />
        );

        expect(screen.getByText("Registrar Entrada")).toBeDisabled();
    });
});
