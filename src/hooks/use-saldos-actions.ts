import { useState, useMemo } from "react";
import { Merchant, Entity, Account } from "@/types";
import { toast } from "sonner";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useCreateMerchant, useUpdateMerchant, useDeactivateMerchant, useActivateMerchant } from "@/hooks/use-merchants";
import { getTodayString } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { aporteSaldoSchema, consumoSaldoSchema } from "@/lib/schemas";

export function useSaldosActions(
    merchants: { id: string; name: string; balance: number }[] | undefined,
    entities: Entity[] | undefined,
    onSuccess?: () => void
) {
    const createTransaction = useCreateTransaction();
    const createMerchant = useCreateMerchant();
    const updateMerchant = useUpdateMerchant();
    const deactivateMerchant = useDeactivateMerchant();
    const activateMerchant = useActivateMerchant();

    // Aporte state
    const [aporte, setAporte] = useState({
        date: getTodayString(),
        origem: "",
        conta: "",
        merchant: "",
        valor: 0,
        descricao: "",
        obs: "",
        capitalCusteio: ""
    });

    // Gasto state
    const [gasto, setGasto] = useState({
        date: getTodayString(),
        merchant: "",
        valor: 0,
        descricao: "",
        obs: ""
    });

    // Merchant management UI state
    const [newMerchantName, setNewMerchantName] = useState("");
    const [editingMerchant, setEditingMerchant] = useState<{ id: string; name: string } | null>(null);
    const [deletingMerchant, setDeletingMerchant] = useState<{ id: string; name: string } | null>(null);

    const associacaoEntity = useMemo(() => entities?.find(e => e.type === "associacao"), [entities]);
    const ueEntity = useMemo(() => entities?.find(e => e.type === "ue"), [entities]);
    const cxEntity = useMemo(() => entities?.find(e => e.type === "cx"), [entities]);

    const resetAporte = () => {
        setAporte({
            date: getTodayString(),
            origem: "",
            conta: "",
            merchant: "",
            valor: 0,
            descricao: "",
            obs: "",
            capitalCusteio: ""
        });
    };

    const resetGasto = () => {
        setGasto({
            date: getTodayString(),
            merchant: "",
            valor: 0,
            descricao: "",
            obs: ""
        });
    };

    const handleAddMerchant = async (name: string) => {
        if (!name.trim()) return;
        try {
            await createMerchant.mutateAsync({ name });
            // Toast is handled in useCreateMerchant
            setNewMerchantName("");
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleEditMerchant = async (id: string, name: string) => {
        if (!name.trim()) return;
        try {
            await updateMerchant.mutateAsync({ id, name });
            setEditingMerchant(null);
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleDeleteMerchant = async (id: string) => {
        try {
            await deactivateMerchant.mutateAsync(id);
            setDeletingMerchant(null);
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleActivateMerchant = async (id: string) => {
        try {
            await activateMerchant.mutateAsync(id);
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            return false;
        }
    };

    const handleAporteSubmit = async (accounts?: Account[], strictBalance: boolean = false) => {
        const validation = aporteSaldoSchema.safeParse(aporte);
        if (!validation.success) {
            toast.error(validation.error.errors[0].message);
            return false;
        }

        let entityId: string | undefined;
        let originFund: "UE" | "CX" | null = null;

        if (aporte.origem === "ASSOC") {
            entityId = associacaoEntity?.id;
        } else if (aporte.origem === "UE") {
            entityId = ueEntity?.id;
            originFund = "UE";
        } else if (aporte.origem === "CX") {
            entityId = cxEntity?.id;
            originFund = "CX";
        }

        if (strictBalance && accounts && (aporte.origem === "ASSOC")) {
            const sourceAcc = accounts.find(a => a.id === aporte.conta);
            if (sourceAcc && aporte.valor > (sourceAcc.balance || 0)) {
                toast.error(`Saldo insuficiente em ${sourceAcc.name}.`);
                return false;
            }
        }

        try {
            await createTransaction.mutateAsync({
                transaction: {
                    transaction_date: aporte.date,
                    module: "aporte_saldo",
                    entity_id: entityId || null,
                    source_account_id: aporte.conta,
                    merchant_id: aporte.merchant,
                    amount: aporte.valor,
                    direction: "out",
                    payment_method: "pix",
                    origin_fund: originFund,
                    capital_custeio: aporte.capitalCusteio ? (aporte.capitalCusteio as "capital" | "custeio") : null,
                    description: aporte.descricao,
                    notes: aporte.obs || null,
                },
            });

            toast.success("Aporte registrado.");
            resetAporte();
            if (onSuccess) onSuccess();
            return true;
        } catch (error) {
            toast.error("Falha ao registrar aporte.");
            return false;
        }
    };


    return {
        state: {
            aporte,
            gasto,
            newMerchantName,
            editingMerchant,
            deletingMerchant
        },
        setters: {
            setAporteDate: (date: string) => setAporte(p => ({ ...p, date })),
            setAporteOrigem: (origem: string) => setAporte(p => ({ ...p, origem, conta: "" })),
            setAporteAccount: (conta: string) => setAporte(p => ({ ...p, conta })),
            setAporteMerchant: (merchant: string) => setAporte(p => ({ ...p, merchant })),
            setAporteValor: (valor: number) => setAporte(p => ({ ...p, valor })),
            setAporteDescricao: (descricao: string) => setAporte(p => ({ ...p, descricao })),
            setAporteObs: (obs: string) => setAporte(p => ({ ...p, obs })),
            setAporteCapitalCusteio: (capitalCusteio: string) => setAporte(p => ({ ...p, capitalCusteio })),

            setGastoDate: (date: string) => setGasto(p => ({ ...p, date })),
            setGastoMerchant: (merchant: string) => setGasto(p => ({ ...p, merchant })),
            setGastoValor: (valor: number) => setGasto(p => ({ ...p, valor })),
            setGastoDescricao: (descricao: string) => setGasto(p => ({ ...p, descricao })),
            setGastoObs: (obs: string) => setGasto(p => ({ ...p, obs })),

            setNewMerchantName,
            setEditingMerchant,
            setDeletingMerchant
        },
        handlers: {
            handleAddMerchant,
            handleEditMerchant,
            handleDeleteMerchant,
            handleActivateMerchant,
            handleAporteSubmit,
            resetAporte,
            resetGasto
        },
        isLoading: createTransaction.isPending || createMerchant.isPending || updateMerchant.isPending || deactivateMerchant.isPending || activateMerchant.isPending
    };
}
