import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
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
        created_by: "Usuario Teste",
        source_account_name: "Espécie",
        destination_account_name: null,
        merchant_name: null,
        payment_method: "cash",
        shift: "matutino",
        created_at: "2024-01-01T10:00:00Z",
        notes: null,
        source_account_id: null,
        destination_account_id: null,
        merchant_id: null,
        origin_fund: null,
        entity_id: null,
        parent_transaction_id: null,
        creator_name: "Usuario Teste" // TransactionWithCreator field
    },
    {
        id: "tx2",
        transaction_date: "2024-01-01",
        amount: 50,
        description: "Gasto Teste",
        direction: "out",
        module: "gasto_associacao",
        status: "voided",
        created_by: "Admin",
        source_account_name: "PIX (Conta BB)",
        destination_account_name: null,
        merchant_name: "Mercado A",
        payment_method: "pix",
        shift: null,
        created_at: "2024-01-01T11:00:00Z",
        notes: null,
        source_account_id: null,
        destination_account_id: null,
        merchant_id: null,
        origin_fund: null,
        entity_id: null,
        parent_transaction_id: null,
        creator_name: "Admin" // TransactionWithCreator field
    }
];

describe("TransactionTable component", () => {
    it("should render transactions correctly", () => {
        render(<TransactionTable transactions={mockTransactions} isLoading={false} />);

        expect(screen.getByText("Venda Teste")).toBeDefined();
        expect(screen.getByText("Gasto Teste")).toBeDefined();
        // formatCurrencyBRL(100) -> "R$ 100,00"
        expect(screen.getByText(/100,00/)).toBeDefined();
        expect(screen.getByText(/50,00/)).toBeDefined();
        expect(screen.getByText("Usuario Teste")).toBeDefined();
    });

    it("should show voided style for transactions with status voided", () => {
        const { container } = render(<TransactionTable transactions={mockTransactions} isLoading={false} />);
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
