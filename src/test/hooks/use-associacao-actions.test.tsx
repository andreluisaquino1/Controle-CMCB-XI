import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssociacaoActions } from "@/hooks/use-associacao-actions";
import { toast } from "sonner";
import { createLedgerTransaction } from "@/domain/ledger";
import { useQueryClient } from "@tanstack/react-query";
import { ACCOUNT_NAMES } from "@/lib/constants";

// Mock dependencies
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock("@/domain/ledger", () => ({
    createLedgerTransaction: vi.fn()
}));

vi.mock("@tanstack/react-query", () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: vi.fn()
    }))
}));

vi.mock("@/hooks/use-transactions", () => ({
    useCreateTransaction: vi.fn(() => ({
        isPending: false
    }))
}));

const mockAccounts = [
    { id: "acc-esp", name: ACCOUNT_NAMES.ESPECIE, balance: 1000 },
    { id: "acc-pix", name: ACCOUNT_NAMES.PIX, balance: 2000 },
    { id: "acc-dig", name: ACCOUNT_NAMES.CONTA_DIGITAL, balance: 5000 },
    { id: "acc-cof", name: ACCOUNT_NAMES.COFRE, balance: 500 }
];

const mockEntity = { id: "ent-assoc", name: "Associação", type: "associacao" };

describe("useAssociacaoActions hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle successful mensalidade submission", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setMensalidadeTurno("matutino");
            result.current.setters.setMensalidadeCash(100);
        });

        const success = await result.current.handlers.handleMensalidadeSubmit();

        expect(success).toBe(true);
        expect(createLedgerTransaction).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
    });

    it("should fail mensalidade if turno is missing", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setMensalidadeCash(100);
        });

        const success = await result.current.handlers.handleMensalidadeSubmit();

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalled();
    });

    it("should handle successful gasto submission", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setGastoValor(80);
            result.current.setters.setGastoDescricao("Material");
            result.current.setters.setGastoMeio("cash");
        });

        const success = await result.current.handlers.handleGastoSubmit();

        expect(success).toBe(true);
        expect(createLedgerTransaction).toHaveBeenCalled();
    });

    it("should block transfer from Conta Digital to Especie", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setMovDe("acc-dig");
            result.current.setters.setMovPara("acc-esp");
            result.current.setters.setMovValor(100);
            result.current.setters.setMovDescricao("Transfer");
        });

        const success = await result.current.handlers.handleMovimentarSubmit();

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalled();
    });

    it("should handle successful transfer", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setMovDe("acc-esp");
            result.current.setters.setMovPara("acc-pix");
            result.current.setters.setMovValor(100);
            result.current.setters.setMovDescricao("Transfer");
        });

        const success = await result.current.handlers.handleMovimentarSubmit();

        expect(success).toBe(true);
        expect(createLedgerTransaction).toHaveBeenCalled();
    });

    it("should block transfer if insufficient balance", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setMovDe("acc-esp");
            result.current.setters.setMovPara("acc-pix");
            result.current.setters.setMovValor(5000);
        });

        const success = await result.current.handlers.handleMovimentarSubmit();

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalled();
    });

    it("should handle manual adjustment", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts as any, mockEntity as any));

        await act(async () => {
            result.current.setters.setAjusteAccountId("acc-pix");
            result.current.setters.setAjusteValor(10);
            result.current.setters.setAjusteMotivo("Correção");
        });

        const success = await result.current.handlers.handleAjusteSubmit();

        expect(success).toBe(true);
        expect(createLedgerTransaction).toHaveBeenCalled();
    });
});
