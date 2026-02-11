import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAssociacaoActions } from "@/hooks/use-associacao-actions";
import { transactionService } from "@/services/transactionService";
import { toast } from "sonner";
import { Account, Entity } from "@/types";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

vi.mock("@/contexts/AuthContext", () => ({
    useAuth: vi.fn(() => ({
        isSecretaria: false,
        user: { id: "user-123" },
        profile: { role: "admin" }
    }))
}));

vi.mock("@/services/transactionService", () => ({
    transactionService: {
        createLedgerTransaction: vi.fn().mockResolvedValue(undefined),
        checkExistingMonthlyFee: vi.fn().mockResolvedValue({ data: [], error: null })
    }
}));

vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const mockAccounts: Account[] = [
    { id: "acc-esp", name: ACCOUNT_NAMES.ESPECIE, balance: 1000, entity_id: "ent-assoc", active: true, type: "cash", account_number: "", agency: "", bank: "" },
    { id: "acc-pix", name: ACCOUNT_NAMES.PIX, balance: 2000, entity_id: "ent-assoc", active: true, type: "bank", account_number: "", agency: "", bank: "" },
    { id: "acc-dig", name: ACCOUNT_NAMES.CONTA_DIGITAL, balance: 5000, entity_id: "ent-assoc", active: true, type: "bank", account_number: "", agency: "", bank: "" },
    { id: "acc-cof", name: ACCOUNT_NAMES.COFRE, balance: 500, entity_id: "ent-assoc", active: true, type: "cash_reserve", account_number: "", agency: "", bank: "" }
];

const mockEntity: Entity = { id: "ent-assoc", name: "Associação", type: "associacao", cnpj: "" };

describe("useAssociacaoActions hook", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should handle successful mensalidade submission", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

        await act(async () => {
            result.current.setters.setMensalidadeTurno("matutino");
            result.current.setters.setMensalidadeCash(100);
        });

        const success = await result.current.handlers.handleMensalidadeSubmit();

        expect(success).toBe(true);
        expect(transactionService.createLedgerTransaction).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
    });

    it("should fail mensalidade if turno is missing", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

        await act(async () => {
            result.current.setters.setMensalidadeCash(100);
        });

        const success = await result.current.handlers.handleMensalidadeSubmit();

        expect(success).toBe(false);
        expect(toast.error).toHaveBeenCalled();
    });

    it("should handle successful gasto submission", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

        await act(async () => {
            result.current.setters.setGastoValor(80);
            result.current.setters.setGastoDescricao("Material");
            result.current.setters.setGastoMeio("cash");
        });

        const success = await result.current.handlers.handleGastoSubmit();

        expect(success).toBe(true);
        expect(transactionService.createLedgerTransaction).toHaveBeenCalled();
    });

    it("should block transfer from Conta Digital to Especie", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

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
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

        await act(async () => {
            result.current.setters.setMovDe("acc-esp");
            result.current.setters.setMovPara("acc-pix");
            result.current.setters.setMovValor(100);
            result.current.setters.setMovDescricao("Transfer");
        });

        const success = await result.current.handlers.handleMovimentarSubmit();

        expect(success).toBe(true);
        expect(transactionService.createLedgerTransaction).toHaveBeenCalled();
    });

    it("should block transfer if insufficient balance", async () => {
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

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
        const { result } = renderHook(() => useAssociacaoActions(mockAccounts, mockEntity), { wrapper });

        await act(async () => {
            result.current.setters.setAjusteAccountId("acc-pix");
            result.current.setters.setAjusteValor(10);
            result.current.setters.setAjusteMotivo("Correção");
        });

        const success = await result.current.handlers.handleAjusteSubmit();

        expect(success).toBe(true);
        expect(transactionService.createLedgerTransaction).toHaveBeenCalled();
    });
});
