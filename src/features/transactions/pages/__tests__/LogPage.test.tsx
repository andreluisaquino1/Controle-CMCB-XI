import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LogPage from "@/features/transactions/pages/LogPage";
import React from "react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock contexts/hooks
vi.mock("@/features/auth/contexts/AuthContext", () => ({
    useAuth: vi.fn()
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useQuery: vi.fn()
    };
});

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => ({
                    range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 }))
                }))
            })),
            neq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis()
        }))
    }
}));

// Mock layout/components
vi.mock("@/shared/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock("@/shared/lib/audit-utils", () => ({
    renderSecurityDiff: vi.fn(() => "Security Diff Text")
}));

// Mock demo data
vi.mock("@/demo/useDemoData", () => ({
    useDemoData: vi.fn(() => ({
        getLogs: vi.fn(() => []),
        getAccounts: vi.fn(() => [])
    }))
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("LogPage integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useAuth).mockReturnValue({ ...vi.mocked(useAuth)(), isDemo: false });

        // Default mock for useQuery
        vi.mocked(useQuery).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
            if (queryKey[0] === "users-list") return { data: [], isLoading: false } as any;
            if (queryKey[0] === "accounts-lookup") return { data: [], isLoading: false } as any;
            if (queryKey[0] === "audit-logs") return {
                data: {
                    logs: [
                        {
                            id: "l1",
                            created_at: new Date().toISOString(),
                            action: "VOID_LEDGER",
                            actor_profile: { name: "Test User" },
                            after: {
                                amount_cents: 5000,
                                description: "Estorno Teste",
                                module: "mensalidade",
                                type: "expense",
                                metadata: {
                                    void_reason: "Erro de teste"
                                }
                            }
                        }
                    ],
                    totalCount: 1
                },
                isLoading: false
            } as any;
            return { data: null, isLoading: false } as any;
        });
    });

    it("should render page header and filters", () => {
        render(<LogPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Trilha de Auditoria")).toBeDefined();
        expect(screen.getByText("Início")).toBeDefined();
        expect(screen.getByText("Fim")).toBeDefined();
        expect(screen.getByText("Usuário")).toBeDefined();
        expect(screen.getAllByText("Ação")).toHaveLength(2); // Label and Table Head
    });

    it("should render audit logs in the table", () => {
        render(<LogPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Histórico de Auditoria")).toBeDefined();
        expect(screen.getByText("Anulação")).toBeDefined();
        expect(screen.getByText("Test User")).toBeDefined();
        expect(screen.getByText("Estorno Teste")).toBeDefined();
        expect(screen.getByText(/"Erro de teste"/)).toBeDefined();
    });

    it("should render security logs differently", () => {
        vi.mocked(useQuery).mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
            if (queryKey[0] === "audit-logs") return {
                data: {
                    logs: [
                        {
                            id: "l2",
                            created_at: new Date().toISOString(),
                            action: "SECURITY_CHANGE",
                            actor_profile: { name: "Admin" },
                            before: {},
                            after: {}
                        }
                    ],
                    totalCount: 1
                },
                isLoading: false
            } as any;
            return { data: [], isLoading: false } as any;
        });

        render(<LogPage />, { wrapper: createWrapper() });

        expect(screen.getByText("Segurança")).toBeDefined();
        expect(screen.getByText("Security Diff Text")).toBeDefined();
    });
});
