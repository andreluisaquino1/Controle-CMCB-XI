import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RelatoriosPage from "@/pages/RelatoriosPage";
import React from "react";
import { useDashboardData, useReportData } from "@/hooks/use-dashboard-data";
import { useAllTransactionsWithCreator } from "@/hooks/use-entity-transactions";
import { useEntities } from "@/hooks/use-accounts";
import { useReports } from "@/hooks/use-reports";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock hooks
vi.mock("@/hooks/use-dashboard-data", () => ({
    useDashboardData: vi.fn(),
    useReportData: vi.fn()
}));

vi.mock("@/hooks/use-entity-transactions", () => ({
    useAllTransactionsWithCreator: vi.fn()
}));

vi.mock("@/hooks/use-accounts", () => ({
    useEntities: vi.fn()
}));

vi.mock("@/hooks/use-reports", () => ({
    useReports: vi.fn()
}));

// Mock auth
vi.mock("@/contexts/AuthContext", () => ({
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
vi.mock("@/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/components/forms/DateInput", () => ({
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
