import { useState, useCallback, useMemo } from 'react';
import { Account, Entity, Transaction } from '@/types';
import { useCreateTransaction } from '@/hooks/use-transactions';
import { toast } from "sonner";
import { formatCurrencyBRL } from '@/lib/currency';
import { ACCOUNT_NAMES, ACCOUNT_NAME_TO_LEDGER_KEY, LEDGER_KEYS } from '@/lib/constants';
import { getTodayString } from '@/lib/date-utils';
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import {
    mensalidadeSchema,
    gastoAssociacaoSchema,
    movimentarSaldoSchema,
    ajusteSchema
} from "@/lib/schemas";
import { createLedgerTransaction } from "@/domain/ledger";
import { useQueryClient } from "@tanstack/react-query";

interface AssociacaoState {
    mensalidade: {
        date: string;
        turno: string;
        cash: number;
        pix: number;
        obs: string;
    };
    gasto: {
        date: string;
        meio: string;
        valor: number;
        descricao: string;
        obs: string;
    };
    mov: {
        date: string;
        de: string;
        para: string;
        valor: number;
        taxa: number;
        descricao: string;
        obs: string;
    };
    ajuste: {
        date: string;
        accountId: string;
        valor: number; // The difference to add/subtract
        motivo: string;
        obs: string;
    };
}

export function useAssociacaoActions(
    accounts: Account[] | undefined,
    associacaoEntity?: Entity,
    onSuccess?: () => void
) {
    const queryClient = useQueryClient();
    const createTransaction = useCreateTransaction(); // Keep for legacy or mix? Actually we want to replace it.
    // We'll use local state for loading since we're calling async functions directly
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [state, setState] = useState<AssociacaoState>({
        mensalidade: { date: getTodayString(), turno: "", cash: 0, pix: 0, obs: "" },
        gasto: { date: getTodayString(), meio: "cash", valor: 0, descricao: "", obs: "" },
        mov: { date: getTodayString(), de: "", para: "", valor: 0, taxa: 0, descricao: "", obs: "" },
        ajuste: { date: getTodayString(), accountId: "", valor: 0, motivo: "", obs: "" },
    });

    const accountsMap = useMemo(() => {
        const map = new Map<string, Account>();
        accounts?.forEach(acc => map.set(acc.id, acc));
        return map;
    }, [accounts]);

    const especieAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE), [accounts]);
    const pixAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.PIX), [accounts]);
    const cofreAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.COFRE), [accounts]);
    const contaDigitalAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.CONTA_DIGITAL), [accounts]);

    const setters = useMemo(() => ({
        setMensalidadeDate: (date: string) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, date } })),
        setMensalidadeTurno: (turno: string) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, turno } })),
        setMensalidadeCash: (cash: number) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, cash } })),
        setMensalidadePix: (pix: number) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, pix } })),
        setMensalidadeObs: (obs: string) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, obs } })),
        setGastoDate: (date: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, date } })),
        setGastoMeio: (meio: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, meio } })),
        setGastoValor: (valor: number) => setState((s) => ({ ...s, gasto: { ...s.gasto, valor } })),
        setGastoDescricao: (descricao: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, descricao } })),
        setGastoObs: (obs: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, obs } })),
        setMovDate: (date: string) => setState((s) => ({ ...s, mov: { ...s.mov, date } })),
        setMovDe: (de: string) => setState((s) => ({ ...s, mov: { ...s.mov, de } })),
        setMovPara: (para: string) => setState((s) => ({ ...s, mov: { ...s.mov, para } })),
        setMovValor: (valor: number) => setState((s) => ({ ...s, mov: { ...s.mov, valor } })),
        setMovTaxa: (taxa: number) => setState((s) => ({ ...s, mov: { ...s.mov, taxa } })),
        setMovDescricao: (descricao: string) => setState((s) => ({ ...s, mov: { ...s.mov, descricao } })),
        setMovObs: (obs: string) => setState((s) => ({ ...s, mov: { ...s.mov, obs } })),
        setAjusteDate: (date: string) => setState((s) => ({ ...s, ajuste: { ...s.ajuste, date } })),
        setAjusteAccountId: (accountId: string) => setState((s) => ({ ...s, ajuste: { ...s.ajuste, accountId, valor: 0 } })),
        setAjusteValor: (valor: number) => setState((s) => ({ ...s, ajuste: { ...s.ajuste, valor } })),
        setAjusteMotivo: (motivo: string) => setState((s) => ({ ...s, ajuste: { ...s.ajuste, motivo } })),
        setAjusteObs: (obs: string) => setState((s) => ({ ...s, ajuste: { ...s.ajuste, obs } })),
    }), []);

    const resetMensalidade = useCallback(() => {
        setState((s) => ({ ...s, mensalidade: { date: getTodayString(), turno: "", cash: 0, pix: 0, obs: "" } }));
    }, []);

    const resetGasto = useCallback(() => {
        setState((s) => ({ ...s, gasto: { date: getTodayString(), meio: "cash", valor: 0, descricao: "", obs: "" } }));
    }, []);

    const resetMov = useCallback(() => {
        setState((s) => ({ ...s, mov: { date: getTodayString(), de: "", para: "", valor: 0, taxa: 0, descricao: "", obs: "" } }));
    }, []);

    const resetAjuste = useCallback(() => {
        setState((s) => ({ ...s, ajuste: { date: getTodayString(), accountId: "", valor: 0, motivo: "", obs: "" } }));
    }, []);

    const handleMensalidadeSubmit = async (): Promise<boolean> => {
        const result = mensalidadeSchema.safeParse(state.mensalidade);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        // We don't necessarily need accounts entities for Ledger if we use constants, but valid for checks
        if (!associacaoEntity) {
            toast.error("Entidade não encontrada.");
            return false;
        }

        // Helper
        const toCents = (val: number) => Math.round(val * 100);

        try {
            setIsSubmitting(true);

            // TODO: Check for existing transactions in Ledger? 
            // For now, let's just create.

            if (state.mensalidade.cash > 0) {
                await createLedgerTransaction({
                    type: "income",
                    source_account: LEDGER_KEYS.EXTERNAL_INCOME,
                    destination_account: ACCOUNT_NAME_TO_LEDGER_KEY[ACCOUNT_NAMES.ESPECIE],
                    amount_cents: toCents(state.mensalidade.cash),
                    description: `Mensalidade ${state.mensalidade.turno}`,
                    metadata: {
                        modulo: "mensalidade",
                        payment_method: "cash",
                        shift: state.mensalidade.turno,
                        notes: state.mensalidade.obs
                    }
                });
            }

            if (state.mensalidade.pix > 0) {
                await createLedgerTransaction({
                    type: "income",
                    source_account: LEDGER_KEYS.EXTERNAL_INCOME,
                    destination_account: ACCOUNT_NAME_TO_LEDGER_KEY[ACCOUNT_NAMES.PIX],
                    amount_cents: toCents(state.mensalidade.pix),
                    description: `Mensalidade ${state.mensalidade.turno} (PIX)`,
                    metadata: {
                        modulo: "mensalidade_pix",
                        payment_method: "pix",
                        shift: state.mensalidade.turno,
                        notes: state.mensalidade.obs
                    }
                });
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
                queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] }),
                queryClient.invalidateQueries({ queryKey: ["accounts"] })
            ]);

            toast.success("Mensalidade registrada.");
            resetMensalidade();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar mensalidade.");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleGastoSubmit = async (): Promise<boolean> => {
        const result = gastoAssociacaoSchema.safeParse(state.gasto);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        // Helper
        const toCents = (val: number) => Math.round(val * 100);

        // Mapping source account
        const sourceName = state.gasto.meio === "cash" ? ACCOUNT_NAMES.ESPECIE : ACCOUNT_NAMES.PIX;
        const sourceKey = ACCOUNT_NAME_TO_LEDGER_KEY[sourceName];

        try {
            setIsSubmitting(true);
            await createLedgerTransaction({
                type: "expense",
                source_account: sourceKey,
                destination_account: LEDGER_KEYS.EXTERNAL_EXPENSE,
                amount_cents: toCents(state.gasto.valor),
                description: state.gasto.descricao,
                metadata: {
                    modulo: "gasto_associacao",
                    payment_method: state.gasto.meio,
                    notes: state.gasto.obs
                }
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
                queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] }),
                queryClient.invalidateQueries({ queryKey: ["accounts"] })
            ]);

            toast.success("Gasto registrado.");
            resetGasto();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar gasto.");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleMovimentarSubmit = async (): Promise<boolean> => {
        const result = movimentarSaldoSchema.safeParse(state.mov);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        if (!associacaoEntity) return false;

        const sourceAccount = accounts?.find(a => a.id === state.mov.de);
        const destAccount = accounts?.find(a => a.id === state.mov.para);
        if (!sourceAccount || !destAccount) return false;

        const totalAmount = state.mov.valor + state.mov.taxa;

        if (totalAmount > sourceAccount.balance) {
            toast.error(`Saldo insuficiente em ${sourceAccount.name}. Necessário ${formatCurrencyBRL(totalAmount)}.`);
            return false;
        }

        // Phase 4: Rigid rules for Conta Digital
        if (sourceAccount.name === ACCOUNT_NAMES.CONTA_DIGITAL) {
            if (destAccount.name !== ACCOUNT_NAMES.PIX) {
                toast.error("A Conta Digital só pode movimentar para o PIX (Conta BB).");
                return false;
            }
        }

        // Mapping keys
        const sourceKey = ACCOUNT_NAME_TO_LEDGER_KEY[sourceAccount.name] || sourceAccount.name; // Fallback?
        const destKey = ACCOUNT_NAME_TO_LEDGER_KEY[destAccount.name] || destAccount.name;

        // Helper
        const toCents = (val: number) => Math.round(val * 100);

        try {
            setIsSubmitting(true);

            // 1. Create Transfer
            // Since createLedgerTransaction (singular) doesn't return the ID easily unless we mod it, 
            // maybe we can't link parent_id easily if the function doesn't return it.
            // Let's assume for now we don't link via parent_id or checking ledger.ts again if it returns data.
            // Line 26: const { error } = await supabase...insert(...) 
            // It does NOT select the inserted row. So we don't get the ID back.
            // We can add .select() to ledger.ts later if needed. 
            // For now, we'll just insert both.

            await createLedgerTransaction({
                type: "transfer",
                source_account: sourceKey,
                destination_account: destKey,
                amount_cents: toCents(state.mov.valor),
                description: state.mov.descricao,
                metadata: {
                    modulo: "assoc_transfer",
                    notes: state.mov.obs
                }
            });

            // 2. Register Taxa (Fee) if exists
            if (state.mov.taxa > 0) {
                await createLedgerTransaction({
                    type: "fee",
                    source_account: sourceKey, // Fee leaves the source account
                    destination_account: LEDGER_KEYS.EXTERNAL_EXPENSE,
                    amount_cents: toCents(state.mov.taxa),
                    description: `Taxa da movimentação: ${sourceAccount.name} -> ${destAccount.name}`,
                    metadata: {
                        modulo: "conta_digital_taxa",
                        related_transfer: `Transfer to ${destKey}`
                    }
                });
            }

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
                queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] }),
                queryClient.invalidateQueries({ queryKey: ["accounts"] })
            ]);

            toast.success("Movimentação registrada.");
            resetMov();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar movimentação.");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAjusteSubmit = async (): Promise<boolean> => {
        const result = ajusteSchema.safeParse(state.ajuste);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        const account = accountsMap.get(state.ajuste.accountId);
        if (!account || !associacaoEntity) {
            toast.error("Conta ou entidade não encontrada.");
            return false;
        }

        // Logic for adjustment:
        // Use 'income' for positive adjustment (Money In)
        // Use 'expense' for negative adjustment (Money Out)
        // This ensures the Balance View (SUM CASE) works correctly regardless of 'adjustment' type implementation details.

        const direction = state.ajuste.valor > 0 ? "in" : "out";
        const absAmount = Math.abs(state.ajuste.valor);
        const accountKey = ACCOUNT_NAME_TO_LEDGER_KEY[account.name] || account.name;

        // Helper
        const toCents = (val: number) => Math.round(val * 100);

        try {
            setIsSubmitting(true);

            await createLedgerTransaction({
                type: direction === 'in' ? 'income' : 'expense',
                source_account: direction === 'in' ? LEDGER_KEYS.EXTERNAL_INCOME : accountKey,
                destination_account: direction === 'in' ? accountKey : LEDGER_KEYS.EXTERNAL_EXPENSE,
                amount_cents: toCents(absAmount),
                description: `Ajuste: ${state.ajuste.motivo}`,
                metadata: {
                    modulo: "ajuste_manual",
                    original_type: "adjustment", // preserving intent
                    notes: state.ajuste.obs,
                    reason: state.ajuste.motivo
                }
            });

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["transactions"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
                queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] }),
                queryClient.invalidateQueries({ queryKey: ["accounts"] })
            ]);

            toast.success(`Ajuste de ${account.name} registrado.`);
            resetAjuste();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar ajuste.");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlers = useMemo(() => ({
        handleMensalidadeSubmit,
        handleGastoSubmit,
        handleMovimentarSubmit,
        handleAjusteSubmit,
        resetMensalidade,
        resetGasto,
        resetMov,
        resetAjuste
    }), [
        handleMensalidadeSubmit,
        handleGastoSubmit,
        handleMovimentarSubmit,
        handleAjusteSubmit,
        resetMensalidade,
        resetGasto,
        resetMov,
        resetAjuste
    ]);

    return {
        state,
        setters,
        handlers,
        isLoading: isSubmitting || createTransaction.isPending,
    };
}
