import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RelatoriosPage from "@/features/transactions/pages/RelatoriosPage";
import React from "react";
import { useDashboardData, useReportData } from "@/features/dashboard/hooks/use-dashboard-data";
import { useAllTransactionsWithCreator } from "@/features/transactions/hooks/use-entity-transactions";
import { useEntities } from "@/shared/hooks/use-accounts";
import { useReports } from "@/features/transactions/hooks/use-reports";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/features/dashboard/hooks/use-dashboard-data", () => ({
    useDashboardData: vi.fn(),
    useReportData: vi.fn()
}));

vi.mock("@/features/transactions/hooks/use-entity-transactions", () => ({
    useAllTransactionsWithCreator: vi.fn()
}));

vi.mock("@/shared/hooks/use-accounts", () => ({
    useEntities: vi.fn()
}));

vi.mock("@/features/transactions/hooks/use-reports", () => ({
    useReports: vi.fn()
}));

// Mock auth
vi.mock("@/features/auth/contexts/AuthContext", () => ({
    useAuth: vi.fn(() => ({
        user: { id: "user-123" },
        profile: { role: "admin" },
        isAdmin: true,
        isDemo: false,
        isSecretaria: false,
        loading: false,
    }))
}));

// Mock layout/components
vi.mock("@/shared/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/shared/components/forms/DateInput", () => ({
    DateInput: ({ value, onChange }: any) => <input type="date" value={value} onChange={(e) => onChange(e.target.value)} data-testid="date-input" />
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("RelatoriosPage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        vi.mocked(useDashboardData).mockReturnValue({
            data: {},
            isLoading: false
        } as ReturnType<typeof useDashboardData>);

        vi.mocked(useEntities).mockReturnValue({
            data: [{ id: "ent-assoc", type: "associacao", name: "Associação", cnpj: "" }],
            isLoading: false
        } as ReturnType<typeof useEntities>);

        vi.mocked(useReportData).mockReturnValue({
            data: { income: 0, expense: 0, balance: 0 },
            isLoading: false
        } as ReturnType<typeof useReportData>);

        vi.mocked(useAllTransactionsWithCreator).mockReturnValue({
            data: [{ id: "t1", amount: 100, description: "Relatorio Teste", transaction_date: new Date().toISOString(), module: "mensalidade", direction: "in" }],
            isLoading: false
        } as ReturnType<typeof useAllTransactionsWithCreator>);

        vi.mocked(useReports).mockReturnValue({
            getWhatsAppReportText: () => "Mock Report Text",
            copyReport: vi.fn(),
            openWhatsApp: vi.fn(),
            exportPDF: vi.fn()
        } as ReturnType<typeof useReports>);
    });

    it("should render page header and date controls", () => {
        render(<RelatoriosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Relatórios")).toBeDefined();
        expect(screen.getAllByTestId("date-input")).toHaveLength(2);
    });

    it("should render report preview section", () => {
        render(<RelatoriosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Preview do Relatório (WhatsApp)")).toBeDefined();
        expect(screen.getByText("Mock Report Text")).toBeDefined();
    });

    it("should render transactions table in history section", () => {
        render(<RelatoriosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Histórico do Período")).toBeDefined();
        expect(screen.getByText("Relatorio Teste")).toBeDefined();
        expect(screen.getByText(/100/)).toBeDefined();
    });

    it("should render action buttons", () => {
        render(<RelatoriosPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Copiar Texto")).toBeDefined();
        expect(screen.getByText("Abrir WhatsApp")).toBeDefined();
        expect(screen.getByText("Exportar PDF")).toBeDefined();
    });
});
