import { useState, useCallback, useMemo } from 'react';
import { Account, Entity } from '@/types';
import { useCreateTransaction } from '@/hooks/use-transactions';
import { toast } from "sonner";
import { formatCurrencyBRL } from '@/lib/currency';
import { ACCOUNT_NAMES } from '@/lib/constants';
import { getTodayString } from '@/lib/date-utils';
import { supabase } from "@/integrations/supabase/client";
import {
    mensalidadeSchema,
    gastoAssociacaoSchema,
    movimentarSaldoSchema,
    ajusteSchema
} from "@/lib/schemas";

interface AssociacaoState {
    mensalidade: {
        date: string;
        turno: string;
        cash: number;
        pix: number;
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
        descricao: string;
        obs: string;
    };
    ajusteEspecie: {
        date: string;
        valor: number;
        motivo: string;
        obs: string;
    };
    ajusteCofre: {
        date: string;
        valor: number;
        motivo: string;
        obs: string;
    };
}

export function useAssociacaoActions(
    accounts: Account[] | undefined,
    associacaoEntity?: Entity,
    onSuccess?: () => void
) {
    const createTransaction = useCreateTransaction();

    const [state, setState] = useState<AssociacaoState>({
        mensalidade: { date: getTodayString(), turno: "", cash: 0, pix: 0 },
        gasto: { date: getTodayString(), meio: "cash", valor: 0, descricao: "", obs: "" },
        mov: { date: getTodayString(), de: "", para: "", valor: 0, descricao: "", obs: "" },
        ajusteEspecie: { date: getTodayString(), valor: 0, motivo: "", obs: "" },
        ajusteCofre: { date: getTodayString(), valor: 0, motivo: "", obs: "" },
    });

    const especieAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE), [accounts]);
    const pixAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.PIX), [accounts]);
    const cofreAccount = useMemo(() => accounts?.find(a => a.name === ACCOUNT_NAMES.COFRE), [accounts]);

    const setters = {
        setMensalidadeDate: (date: string) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, date } })),
        setMensalidadeTurno: (turno: string) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, turno } })),
        setMensalidadeCash: (cash: number) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, cash } })),
        setMensalidadePix: (pix: number) => setState((s) => ({ ...s, mensalidade: { ...s.mensalidade, pix } })),
        setGastoDate: (date: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, date } })),
        setGastoMeio: (meio: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, meio } })),
        setGastoValor: (valor: number) => setState((s) => ({ ...s, gasto: { ...s.gasto, valor } })),
        setGastoDescricao: (descricao: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, descricao } })),
        setGastoObs: (obs: string) => setState((s) => ({ ...s, gasto: { ...s.gasto, obs } })),
        setMovDate: (date: string) => setState((s) => ({ ...s, mov: { ...s.mov, date } })),
        setMovDe: (de: string) => setState((s) => ({ ...s, mov: { ...s.mov, de } })),
        setMovPara: (para: string) => setState((s) => ({ ...s, mov: { ...s.mov, para } })),
        setMovValor: (valor: number) => setState((s) => ({ ...s, mov: { ...s.mov, valor } })),
        setMovDescricao: (descricao: string) => setState((s) => ({ ...s, mov: { ...s.mov, descricao } })),
        setMovObs: (obs: string) => setState((s) => ({ ...s, mov: { ...s.mov, obs } })),
        setAjusteEspecieDate: (date: string) => setState((s) => ({ ...s, ajusteEspecie: { ...s.ajusteEspecie, date } })),
        setAjusteEspecieValor: (valor: number) => setState((s) => ({ ...s, ajusteEspecie: { ...s.ajusteEspecie, valor } })),
        setAjusteEspecieMotivo: (motivo: string) => setState((s) => ({ ...s, ajusteEspecie: { ...s.ajusteEspecie, motivo } })),
        setAjusteEspecieObs: (obs: string) => setState((s) => ({ ...s, ajusteEspecie: { ...s.ajusteEspecie, obs } })),
        setAjusteCofreDate: (date: string) => setState((s) => ({ ...s, ajusteCofre: { ...s.ajusteCofre, date } })),
        setAjusteCofreValor: (valor: number) => setState((s) => ({ ...s, ajusteCofre: { ...s.ajusteCofre, valor } })),
        setAjusteCofreMotivo: (motivo: string) => setState((s) => ({ ...s, ajusteCofre: { ...s.ajusteCofre, motivo } })),
        setAjusteCofreObs: (obs: string) => setState((s) => ({ ...s, ajusteCofre: { ...s.ajusteCofre, obs } })),
    };

    const resetMensalidade = useCallback(() => {
        setState((s) => ({ ...s, mensalidade: { date: getTodayString(), turno: "", cash: 0, pix: 0 } }));
    }, []);

    const resetGasto = useCallback(() => {
        setState((s) => ({ ...s, gasto: { date: getTodayString(), meio: "cash", valor: 0, descricao: "", obs: "" } }));
    }, []);

    const resetMov = useCallback(() => {
        setState((s) => ({ ...s, mov: { date: getTodayString(), de: "", para: "", valor: 0, descricao: "", obs: "" } }));
    }, []);

    const handleMensalidadeSubmit = async (): Promise<boolean> => {
        const result = mensalidadeSchema.safeParse(state.mensalidade);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        if (!especieAccount || !pixAccount || !associacaoEntity) {
            toast.error("Contas ou entidade não encontradas.");
            return false;
        }

        const { data: existing } = await supabase
            .from("transactions")
            .select("payment_method")
            .eq("module", "mensalidade")
            .eq("transaction_date", state.mensalidade.date)
            .eq("shift", state.mensalidade.turno as "matutino" | "vespertino")
            .eq("status", "posted");

        const hasCash = existing?.some(e => e.payment_method === 'cash');
        const hasPix = existing?.some(e => e.payment_method === 'pix');

        if (state.mensalidade.cash > 0 && hasCash) {
            toast.error(`Já existe um registro em ESPÉCIE para o turno ${state.mensalidade.turno} nesta data.`);
            return false;
        }

        if (state.mensalidade.pix > 0 && hasPix) {
            toast.error(`Já existe um registro em PIX para o turno ${state.mensalidade.turno} nesta data.`);
            return false;
        }

        try {
            if (state.mensalidade.cash > 0) {
                await createTransaction.mutateAsync({
                    transaction: {
                        transaction_date: state.mensalidade.date,
                        module: "mensalidade",
                        entity_id: associacaoEntity.id,
                        destination_account_id: especieAccount.id,
                        amount: state.mensalidade.cash,
                        direction: "in",
                        payment_method: "cash",
                        shift: state.mensalidade.turno as "matutino" | "vespertino",
                        description: `Mensalidade ${state.mensalidade.turno}`,
                    },
                });
            }

            if (state.mensalidade.pix > 0) {
                await createTransaction.mutateAsync({
                    transaction: {
                        transaction_date: state.mensalidade.date,
                        module: "mensalidade",
                        entity_id: associacaoEntity.id,
                        destination_account_id: pixAccount.id,
                        amount: state.mensalidade.pix,
                        direction: "in",
                        payment_method: "pix",
                        shift: state.mensalidade.turno as "matutino" | "vespertino",
                        description: `Mensalidade ${state.mensalidade.turno}`,
                    },
                });
            }

            toast.success("Mensalidade registrada.");
            resetMensalidade();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            toast.error("Falha ao registrar mensalidade.");
            return false;
        }
    };

    const handleGastoSubmit = async (strictBalance: boolean = false): Promise<boolean> => {
        const result = gastoAssociacaoSchema.safeParse(state.gasto);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        if (!associacaoEntity) {
            toast.error("Entidade não encontrada.");
            return false;
        }

        const sourceAccount = state.gasto.meio === "cash" ? especieAccount : pixAccount;
        if (!sourceAccount) {
            toast.error("Conta de origem não encontrada.");
            return false;
        }

        if (strictBalance && state.gasto.valor > sourceAccount.balance) {
            toast.error(`Saldo insuficiente em ${sourceAccount.name}.`);
            return false;
        }

        try {
            await createTransaction.mutateAsync({
                transaction: {
                    transaction_date: state.gasto.date,
                    module: "gasto_associacao",
                    entity_id: associacaoEntity.id,
                    source_account_id: sourceAccount.id,
                    amount: state.gasto.valor,
                    direction: "out",
                    payment_method: state.gasto.meio as "cash" | "pix",
                    description: state.gasto.descricao,
                    notes: state.gasto.obs || null,
                },
            });

            toast.success("Gasto registrado.");
            resetGasto();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            toast.error("Falha ao registrar gasto.");
            return false;
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

        if (state.mov.valor > sourceAccount.balance) {
            toast.error(`Saldo insuficiente em ${sourceAccount.name}.`);
            return false;
        }

        try {
            await createTransaction.mutateAsync({
                transaction: {
                    transaction_date: state.mov.date,
                    module: "especie_transfer",
                    entity_id: associacaoEntity.id,
                    source_account_id: sourceAccount.id,
                    destination_account_id: destAccount.id,
                    amount: state.mov.valor,
                    direction: "transfer",
                    description: state.mov.descricao,
                    notes: state.mov.obs || null,
                },
            });

            toast.success("Movimentação registrada.");
            resetMov();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            toast.error("Falha ao registrar movimentação.");
            return false;
        }
    };

    const handleAjusteEspecieSubmit = async (): Promise<boolean> => {
        const result = ajusteSchema.safeParse(state.ajusteEspecie);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        if (!especieAccount || !associacaoEntity) return false;

        const direction = state.ajusteEspecie.valor > 0 ? "in" : "out";
        const absAmount = Math.abs(state.ajusteEspecie.valor);

        try {
            await createTransaction.mutateAsync({
                transaction: {
                    transaction_date: state.ajusteEspecie.date,
                    module: "especie_ajuste",
                    entity_id: associacaoEntity.id,
                    source_account_id: direction === "out" ? especieAccount.id : null,
                    destination_account_id: direction === "in" ? especieAccount.id : null,
                    amount: absAmount,
                    direction,
                    description: `Ajuste: ${state.ajusteEspecie.motivo}`,
                    notes: state.ajusteEspecie.obs || null,
                },
            });

            toast.success("Ajuste de espécie registrado.");
            setState(s => ({ ...s, ajusteEspecie: { ...s.ajusteEspecie, valor: 0, motivo: "", obs: "" } }));
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            toast.error("Falha ao registrar ajuste.");
            return false;
        }
    };

    const handleAjusteCofreSubmit = async (): Promise<boolean> => {
        const result = ajusteSchema.safeParse(state.ajusteCofre);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return false;
        }

        if (!cofreAccount || !associacaoEntity) return false;

        const direction = state.ajusteCofre.valor > 0 ? "in" : "out";
        const absAmount = Math.abs(state.ajusteCofre.valor);

        try {
            await createTransaction.mutateAsync({
                transaction: {
                    transaction_date: state.ajusteCofre.date,
                    module: "cofre_ajuste",
                    entity_id: associacaoEntity.id,
                    source_account_id: direction === "out" ? cofreAccount.id : null,
                    destination_account_id: direction === "in" ? cofreAccount.id : null,
                    amount: absAmount,
                    direction,
                    description: `Ajuste: ${state.ajusteCofre.motivo}`,
                    notes: state.ajusteCofre.obs || null,
                },
            });

            toast.success("Ajuste de cofre registrado.");
            setState(s => ({ ...s, ajusteCofre: { ...s.ajusteCofre, valor: 0, motivo: "", obs: "" } }));
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            toast.error("Falha ao registrar ajuste.");
            return false;
        }
    };

    return {
        state,
        setters,
        handlers: {
            handleMensalidadeSubmit,
            handleGastoSubmit,
            handleMovimentarSubmit,
            handleAjusteEspecieSubmit,
            handleAjusteCofreSubmit,
            resetMensalidade,
            resetGasto,
            resetMov
        },
        isLoading: createTransaction.isPending,
    };
}
