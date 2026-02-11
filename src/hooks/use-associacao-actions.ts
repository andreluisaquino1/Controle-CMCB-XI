import { useState, useCallback, useMemo } from 'react';
import { Account, Entity, Transaction } from '@/types';
// import { useCreateTransaction } from '@/hooks/use-transactions'; // REMOVED - Using transactionService instead
import { toast } from "sonner";
import { formatCurrencyBRL } from '@/lib/currency';
import { ACCOUNT_NAMES, ACCOUNT_NAME_TO_LEDGER_KEY, LEDGER_KEYS } from '@/lib/constants';
import { getTodayString } from '@/lib/date-utils';
import { transactionService } from "@/services/transactionService";
import {
    mensalidadeSchema,
    gastoAssociacaoSchema,
    movimentarSaldoSchema,
    ajusteSchema
} from "@/lib/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

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
    const { isSecretaria } = useAuth();
    // const createTransaction = useCreateTransaction(); // REMOVED
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

    const handleMensalidadeSubmit = useCallback(async (): Promise<boolean> => {
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

            // 1. Check for existing monthly fee (Cash) if cash > 0
            if (state.mensalidade.cash > 0) {
                const { data: existingCash } = await transactionService.checkExistingMonthlyFee(
                    state.mensalidade.date,
                    state.mensalidade.turno,
                    "cash"
                );

                if (existingCash && existingCash.length > 0) {
                    toast.error(`Já existe lançamento de mensalidade (Espécie) para o turno ${state.mensalidade.turno} nesta data.`);
                    setIsSubmitting(false);
                    return false;
                }

                await transactionService.createLedgerTransaction({
                    type: "income",
                    source_account: LEDGER_KEYS.EXTERNAL_INCOME,
                    destination_account: ACCOUNT_NAME_TO_LEDGER_KEY[ACCOUNT_NAMES.ESPECIE],
                    amount_cents: toCents(state.mensalidade.cash),
                    status: isSecretaria ? "pending" : "validated",
                    description: `Mensalidade ${state.mensalidade.turno}`,
                    created_at: `${state.mensalidade.date}T12:00:00`, // Set to noon to avoid timezone edge cases
                    metadata: {
                        module: "mensalidade",
                        payment_method: "cash",
                        shift: state.mensalidade.turno,
                        notes: state.mensalidade.obs
                    }
                });
            }

            // 2. Check for existing monthly fee (PIX) if pix > 0
            if (state.mensalidade.pix > 0) {
                const { data: existingPix } = await transactionService.checkExistingMonthlyFee(
                    state.mensalidade.date,
                    state.mensalidade.turno,
                    "pix"
                );

                if (existingPix && existingPix.length > 0) {
                    toast.error(`Já existe lançamento de mensalidade (PIX) para o turno ${state.mensalidade.turno} nesta data.`);
                    setIsSubmitting(false);
                    return false;
                }

                await transactionService.createLedgerTransaction({
                    type: "income",
                    source_account: LEDGER_KEYS.EXTERNAL_INCOME,
                    destination_account: ACCOUNT_NAME_TO_LEDGER_KEY[ACCOUNT_NAMES.PIX],
                    amount_cents: toCents(state.mensalidade.pix),
                    status: isSecretaria ? "pending" : "validated",
                    description: `Mensalidade ${state.mensalidade.turno} (PIX)`,
                    created_at: `${state.mensalidade.date}T12:00:00`,
                    metadata: {
                        module: "mensalidade_pix",
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
    }, [state.mensalidade, associacaoEntity, isSecretaria, queryClient, resetMensalidade, onSuccess]);


    const handleGastoSubmit = useCallback(async (): Promise<boolean> => {
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
            await transactionService.createLedgerTransaction({
                type: "expense",
                source_account: sourceKey,
                destination_account: LEDGER_KEYS.EXTERNAL_EXPENSE,
                amount_cents: toCents(state.gasto.valor),
                status: isSecretaria ? "pending" : "validated",
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
    }, [state.gasto, isSecretaria, queryClient, resetGasto, onSuccess]);
    const handleMovimentarSubmit = useCallback(async (): Promise<boolean> => {
        const result = movimentarSaldoSchema.safeParse(state.mov);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        if (!associacaoEntity) return false;

        const sourceAccount = accounts?.find(a => a.id === state.mov.de);
        const destAccount = accounts?.find(a => a.id === state.mov.para);
        if (!sourceAccount || !destAccount) return false;

        // Validação de saldo (Valor + Taxa)
        const totalAmount = state.mov.valor + state.mov.taxa;
        if (totalAmount > sourceAccount.balance) {
            toast.error(`Saldo insuficiente em ${sourceAccount.name}. Necessário ${formatCurrencyBRL(totalAmount)} (Valor + Taxa).`);
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

            await transactionService.createLedgerTransaction({
                type: "transfer",
                source_account: sourceKey,
                destination_account: destKey,
                amount_cents: toCents(state.mov.valor),
                description: state.mov.descricao,
                metadata: {
                    module: "assoc_transfer",
                    notes: state.mov.obs,
                    taxa_informativa: state.mov.taxa > 0 ? formatCurrencyBRL(state.mov.taxa) : null,
                },
            });

            // 2. Create Fee Transaction (if applicable)
            if (state.mov.taxa > 0) {
                let feeModule = "gasto_associacao";
                // Determine module based on source
                if (sourceAccount.name === ACCOUNT_NAMES.PIX) feeModule = "taxa_pix_bb";
                if (sourceAccount.name === ACCOUNT_NAMES.CONTA_DIGITAL) feeModule = "conta_digital_taxa";

                await transactionService.createLedgerTransaction({
                    type: "expense",
                    source_account: sourceKey,
                    destination_account: LEDGER_KEYS.EXTERNAL_EXPENSE,
                    amount_cents: toCents(state.mov.taxa),
                    description: `Taxa: ${state.mov.descricao}`,
                    metadata: {
                        module: feeModule,
                        original_module: "movimentacao_taxa", // for tracking
                        notes: `Taxa referente à movimentação de ${formatCurrencyBRL(state.mov.valor)}`
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
    }, [state.mov, associacaoEntity, accounts, queryClient, resetMov, onSuccess]);

    const handleAjusteSubmit = useCallback(async (): Promise<boolean> => {
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

            let module = "especie_ajuste";
            if (account.name === ACCOUNT_NAMES.PIX) module = "pix_ajuste";
            else if (account.name === ACCOUNT_NAMES.COFRE) module = "cofre_ajuste";
            else if (account.name === ACCOUNT_NAMES.CONTA_DIGITAL) module = "conta_digital_ajuste";

            await transactionService.createLedgerTransaction({
                type: direction === 'in' ? 'income' : 'expense',
                source_account: direction === 'in' ? LEDGER_KEYS.EXTERNAL_INCOME : accountKey,
                destination_account: direction === 'in' ? accountKey : LEDGER_KEYS.EXTERNAL_EXPENSE,
                amount_cents: toCents(absAmount),
                description: `Ajuste: ${state.ajuste.motivo}`,
                metadata: {
                    modulo: module,
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
    }, [state.ajuste, accountsMap, associacaoEntity, queryClient, resetAjuste, onSuccess]);

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
        isLoading: isSubmitting,
    };
}
