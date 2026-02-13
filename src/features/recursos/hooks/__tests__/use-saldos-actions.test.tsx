import { Entity } from "@/types";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaldosActions } from "@/features/recursos/hooks/use-saldos-actions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Mock hooks
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("@/features/merchants/hooks/use-merchants", () => ({
    useCreateMerchant: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
    useUpdateMerchant: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
    useDeactivateMerchant: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
    useActivateMerchant: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
}));

vi.mock("@/features/transactions/hooks/use-transactions", () => ({
    useCreateTransaction: vi.fn(() => ({ isPending: false })),
}));

vi.mock("@tanstack/react-query", () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn()
    }))
}));

const mockMerchants = [{ id: "m1", name: "Mercado A", balance: 100 }];
const mockEntities: Entity[] = [{ id: "e1", name: "Associação", type: "associacao", cnpj: "" }];

describe("useSaldosActions hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle adding a merchant", async () => {
        const { result } = renderHook(() => useSaldosActions(mockMerchants, mockEntities));

        await act(async () => {
            await result.current.handlers.handleAddMerchant("Novo Mercado");
        });

        expect(mockMutateAsync).toHaveBeenCalledWith({ name: "Novo Mercado" });
        expect(result.current.state.newMerchantName).toBe("");
    });

    it("should handle editing a merchant", async () => {
        const { result } = renderHook(() => useSaldosActions(mockMerchants, mockEntities));

        await act(async () => {
            await result.current.handlers.handleEditMerchant("m1", "Nome Editado");
        });

        expect(mockMutateAsync).toHaveBeenCalledWith({ id: "m1", name: "Nome Editado" });
        expect(result.current.state.editingMerchant).toBeNull();
    });

    it("should handle deleting (deactivating) a merchant", async () => {
        const { result } = renderHook(() => useSaldosActions(mockMerchants, mockEntities));

        await act(async () => {
            await result.current.handlers.handleDeleteMerchant("m1");
        });

        expect(mockMutateAsync).toHaveBeenCalledWith("m1");
        expect(result.current.state.deletingMerchant).toBeNull();
    });

    it("should validate and handle aporte submission (state reset)", async () => {
        const onSucc = vi.fn();
        const { result } = renderHook(() => useSaldosActions(mockMerchants, mockEntities, onSucc));

        await act(async () => {
            result.current.setters.setAporteOrigem("ASSOC");
            result.current.setters.setAporteAccount("acc1");
            result.current.setters.setAporteMerchant("m1");
            result.current.setters.setAporteValor(100);
            result.current.setters.setAporteDescricao("Aporte teste");
        });

        let success = false;
        await act(async () => {
            success = await result.current.handlers.handleAporteSubmit();
        });

        expect(success).toBe(true);
        expect(onSucc).toHaveBeenCalled();
        expect(result.current.state.aporte.valor).toBe(0); // Reset
    });

    it("should fail aporte submission on validation error", async () => {
        const { result } = renderHook(() => useSaldosActions(mockMerchants, mockEntities));

        await act(async () => {
            result.current.setters.setAporteValor(0); // Should fail Zod gt(0)
        });

        let success = true;
        await act(async () => {
            success = await result.current.handlers.handleAporteSubmit();
        });

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalled();
    });
});
