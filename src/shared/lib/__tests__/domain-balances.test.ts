import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccountBalanceCents } from "@/domain/balances";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    maybeSingle: vi.fn()
                }))
            }))
        }))
    }
}));

describe("getAccountBalanceCents", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return balance in cents when account exists", async () => {
        const mockData = { balance_cents: 12500 };
        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: mockMaybeSingle
                })
            })
        } as unknown as ReturnType<typeof supabase.from>);

        const balance = await getAccountBalanceCents("test-account");
        expect(balance).toBe(12500);
        expect(supabase.from).toHaveBeenCalledWith("ledger_balances");
    });

    it("should return 0 when account does not exist", async () => {
        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: mockMaybeSingle
                })
            })
        } as unknown as ReturnType<typeof supabase.from>);

        const balance = await getAccountBalanceCents("non-existent-id");
        expect(balance).toBe(0);
    });

    it("should throw error when Supabase returns an error", async () => {
        const mockError = { message: "Database error" };
        const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

        vi.mocked(supabase.from).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    maybeSingle: mockMaybeSingle
                })
            })
        });

        await expect(getAccountBalanceCents("error-account")).rejects.toEqual(mockError);
    });
});
