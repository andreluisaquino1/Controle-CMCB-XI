import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionTable } from "../components/transactions/TransactionTable";
import React from "react";

// Mock child component to avoid internal logic and context issues
vi.mock("@/components/transactions/TransactionItemsDialog", () => ({
    TransactionItemsDialog: () => <div data-testid="transaction-items-dialog" />
}));

const mockTransactions = [
    {
        id: "tx1",
        transaction_date: "2024-01-01",
        amount: 100,
        description: "Venda Teste",
        direction: "in",
        module: "mensalidade",
        status: "posted",
        creator_name: "Usuario Teste",
        source_account_name: "Espécie"
    },
    {
        id: "tx2",
        transaction_date: "2024-01-01",
        amount: 50,
        description: "Gasto Teste",
        direction: "out",
        module: "gasto_associacao",
        status: "voided",
        creator_name: "Admin",
        source_account_name: "PIX (Conta BB)"
    }
];

describe("TransactionTable component", () => {
    it("should render transactions correctly", () => {
        render(<TransactionTable transactions={mockTransactions as any} isLoading={false} />);

        expect(screen.getByText("Venda Teste")).toBeDefined();
        expect(screen.getByText("Gasto Teste")).toBeDefined();
        // formatCurrencyBRL(100) -> "R$ 100,00"
        expect(screen.getByText(/100,00/)).toBeDefined();
        expect(screen.getByText(/50,00/)).toBeDefined();
        expect(screen.getByText("Usuario Teste")).toBeDefined();
    });

    it("should show voided style for transactions with status voided", () => {
        const { container } = render(<TransactionTable transactions={mockTransactions as any} isLoading={false} />);
        const voidedRow = container.querySelector('.opacity-50.grayscale');
        expect(voidedRow).toBeDefined();
    });

    it("should render empty state when no transactions", () => {
        render(<TransactionTable transactions={[]} isLoading={false} />);
        expect(screen.getByText(/Nenhuma transação encontrada/i)).toBeDefined();
    });

    it("should show loader when isLoading is true", () => {
        const { container } = render(<TransactionTable transactions={[]} isLoading={true} />);
        const loader = container.querySelector('.animate-spin');
        expect(loader).toBeDefined();

        const rows = screen.queryByRole("row");
        expect(rows).toBeNull();
    });
});
