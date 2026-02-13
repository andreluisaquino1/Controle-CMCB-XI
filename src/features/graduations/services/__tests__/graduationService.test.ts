/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { graduationService } from "../graduationService";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            eq: vi.fn(),
            order: vi.fn(),
            single: vi.fn(),
            maybeSingle: vi.fn(),
            limit: vi.fn(),
            in: vi.fn(),
        })),
        auth: {
            getUser: vi.fn(() => ({ data: { user: { id: "user-123" } } })),
        }
    }
}));

describe("graduationService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createGraduation", () => {
        it("should generate a correct slug and call insert", async () => {
            const mockData = { id: "1", name: "Formatura 2026", year: 2026, slug: "formatura-2026" };
            const fromSpy = vi.mocked(supabase.from);
            const selectSpy = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockData, error: null }) });
            const insertSpy = vi.fn().mockReturnValue({ select: selectSpy });

            fromSpy.mockReturnValue({ insert: insertSpy } as any);

            const result = await graduationService.createGraduation("Formatura 2026", 2026);

            expect(result.slug).toBe("formatura-2026");
            expect(insertSpy).toHaveBeenCalledWith({
                name: "Formatura 2026",
                year: 2026,
                active: true,
                slug: "formatura-2026"
            });
        });

        it("should normalize names for slugs (accents and special chars)", async () => {
            const mockData = { id: "1", name: "Açâo & Teste", year: 2026, slug: "acao-teste" };
            const fromSpy = vi.mocked(supabase.from);
            const selectSpy = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mockData, error: null }) });
            const insertSpy = vi.fn().mockReturnValue({ select: selectSpy });

            fromSpy.mockReturnValue({ insert: insertSpy } as any);

            await graduationService.createGraduation("Açâo & Teste", 2026);

            expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
                slug: "acao-teste"
            }));
        });
    });

    describe("generateCarnetForStudent", () => {
        it("should generate correct number of installments with due dates", async () => {
            // Mock student find
            const fromSpy = vi.mocked(supabase.from);

            // 1. mock student
            fromSpy.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { class_id: "c1" }, error: null })
                    })
                })
            } as any);

            // 2. mock class find
            fromSpy.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { graduation_id: "g1" }, error: null })
                    })
                })
            } as any);

            // 3. mock config find (via getcurrentcarnetconfig)
            fromSpy.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                            limit: vi.fn().mockReturnValue({
                                maybeSingle: vi.fn().mockResolvedValue({
                                    data: { id: "conf1", installments_count: 12, due_day: 10, installment_value: 50 },
                                    error: null
                                })
                            })
                        })
                    })
                })
            } as any);

            // 4. mock installments count check
            fromSpy.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ count: 0, error: null })
                })
            } as any);

            // 5. mock insert installments
            const insertSpy = vi.fn().mockResolvedValue({ error: null });
            fromSpy.mockReturnValueOnce({ insert: insertSpy } as any);

            await graduationService.generateCarnetForStudent("s1");

            expect(insertSpy).toHaveBeenCalled();
            const inserted = insertSpy.mock.calls[0][0] as any[];
            expect(inserted).toHaveLength(12);
            expect(inserted[0].due_date).toBe("2026-01-10");
            expect(inserted[11].due_date).toBe("2026-12-10");
        });
    });
});
