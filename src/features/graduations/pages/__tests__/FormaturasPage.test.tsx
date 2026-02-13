import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FormaturasPage from "@/features/graduations/pages/FormaturasPage";
import React from "react";
import { graduationModuleService } from "@/features/graduations/services";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock service
vi.mock("@/features/graduations/services", () => ({
    graduationModuleService: {
        listGraduations: vi.fn(),
        createGraduation: vi.fn(),
        updateGraduation: vi.fn(),
        softDeleteGraduation: vi.fn(),
    }
}));

// Mock Auth
vi.mock("@/features/auth/contexts/AuthContext", () => ({
    useAuth: vi.fn(() => ({
        isAdmin: true,
        user: { id: "u1" },
        loading: false,
    }))
}));

// Mock layout
vi.mock("@/shared/components/DashboardLayout", () => ({
    DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0
            }
        }
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                {children}
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe("FormaturasPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render the page title after loading", async () => {
        vi.mocked(graduationModuleService.listGraduations).mockResolvedValue([]);

        render(<FormaturasPage />, { wrapper: createWrapper() });

        // Component shows Loader2 initially. We need findBy.
        expect(await screen.findByText("Formaturas")).toBeDefined();
    });

    it("should render a list of graduations", async () => {
        const mockGrads = [
            { id: "1", name: "Formatura 2026", year: 2026, active: true, slug: "f2026", created_at: "" },
        ];
        vi.mocked(graduationModuleService.listGraduations).mockResolvedValue(mockGrads);

        render(<FormaturasPage />, { wrapper: createWrapper() });

        expect(await screen.findByText("Formatura 2026")).toBeDefined();
    });
});
