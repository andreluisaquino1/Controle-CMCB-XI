import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { profileService, Profile } from "@/features/users/services/profileService";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signOut: vi.fn(),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            resetPasswordForEmail: vi.fn(),
        },
        from: vi.fn()
    }
}));

// Mock profileService
vi.mock("@/features/users/services/profileService", () => ({
    profileService: {
        getProfile: vi.fn(),
    }
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            gcTime: 0,
        }
    }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
);

describe("AuthContext", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient.clear();
    });

    it("should provide auth state (unauthenticated initially)", async () => {
        vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
    });

    it("should handle login and load profile", async () => {
        const mockUser = { id: "u1", email: "test@test.com" };
        const mockProfile: Profile = {
            id: "u1",
            user_id: "u1",
            name: "Test User",
            email: "test@test.com",
            active: true,
            created_at: new Date().toISOString(),
            role: "admin"
        };

        vi.mocked(supabase.auth.getSession).mockResolvedValue({
            data: { session: { user: mockUser } as any },
            error: null
        });

        vi.mocked(profileService.getProfile).mockResolvedValue(mockProfile);

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Wait for profile load
        await waitFor(() => {
            expect(result.current.profile).toEqual(mockProfile);
            expect(result.current.isAdmin).toBe(true);
        }, { timeout: 2000 });

        expect(result.current.user).toEqual(mockUser);
    });
});
