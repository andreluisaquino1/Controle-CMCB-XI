import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";

import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { cleanAccountDisplayName } from "@/shared/lib/account-display";
import { sortByAccountOrder } from "@/shared/lib/constants";
import { Account, Merchant, Entity } from "@/types";
// import { useCreateTransaction } from "@/features/transactions/hooks/use-transactions"; // Legacy
import { transactionService } from "@/features/transactions/services/transactionService";
import { LEDGER_KEYS, ACCOUNT_NAME_TO_LEDGER_KEY } from "@/shared/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { invalidateFinance } from "@/shared/query/invalidation";

interface AporteSaldoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        origem: string;
        conta: string;
        merchant: string;
        valor: number;
        descricao: string;
        obs: string;
        capitalCusteio: string;
    };
    setters: {
        setDate: (v: string) => void;
        setOrigem: (v: string) => void;
        setAccount: (v: string) => void;
        setMerchant: (v: string) => void;
        setValor: (v: number) => void;
        setDescricao: (v: string) => void;
        setObs: (v: string) => void;
        setCapitalCusteio: (v: string) => void;
    };
    entities: Entity[];
    accounts: Account[];
    merchants: Merchant[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

export function AporteSaldoDialog({
    open,
    onOpenChange,
    state,
    setters,
    entities,
    accounts,
    merchants,
    onSubmit,
    isLoading,
}: AporteSaldoDialogProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredAccounts = accounts.filter(acc => {
        if (!state.origem) return false;
        const entity = entities.find(e => e.id === acc.entity_id);
        if (state.origem === "ASSOC") return entity?.type === "associacao";
        if (state.origem === "UE") return entity?.type === "ue";
        if (state.origem === "CX") return entity?.type === "cx";
        return false;
    });

    const sortedMerchants = [...(merchants || [])].filter(m => m.active).sort((a, b) => a.name.localeCompare(b.name));

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            const sourceAccountInfo = accounts.find(a => a.id === state.conta);

            if (!sourceAccountInfo) throw new Error("Conta não selecionada.");

            // Determine Ledger Source Key
            let sourceKey = "";

            if (state.origem === "ASSOC") {
                // For Associação: use name mapping (Espécie, PIX, etc.)
                sourceKey = ACCOUNT_NAME_TO_LEDGER_KEY[sourceAccountInfo.name];
                if (!sourceKey) {
                    throw new Error(`Conta "${sourceAccountInfo.name}" não está mapeada no Ledger.`);
                }
            } else {
                // For UE/CX: use account ID (each account has its own balance)
                sourceKey = sourceAccountInfo.id;
            }

            await transactionService.createLedgerTransaction({
                type: 'transfer',
                source_account: sourceKey,
                destination_account: state.merchant, // Merchant ID as Ledger Account
                amount_cents: Math.round(state.valor * 100),
                description: `Aporte: ${state.descricao}`,
                created_at: `${state.date}T12:00:00`,
                metadata: {
                    module: "aporte_saldo",
                    notes: state.obs,
                    transaction_date: state.date,
                    account_id: state.conta,
                    entity_id: sourceAccountInfo.entity_id,
                    merchant_id: state.merchant
                }
            });

            await invalidateFinance(queryClient);
            await queryClient.invalidateQueries({ queryKey: ["merchants"] });

            toast.success("Aporte registrado.");
            onSubmit(); // Callback to reset parent
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar aporte.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Aportar Saldo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label>Origem do Recurso *</Label>
                        <Select value={state.origem} onValueChange={setters.setOrigem}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ASSOC">Associação</SelectItem>
                                <SelectItem value="UE">Unidade Executora</SelectItem>
                                <SelectItem value="CX">Caixa Escolar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Conta *</Label>
                        <Select value={state.conta} onValueChange={setters.setAccount} disabled={!state.origem}>
                            <SelectTrigger>
                                <SelectValue placeholder={state.origem ? "Selecione a conta" : "Selecione origem primeiro"} />
                            </SelectTrigger>
                            <SelectContent>
                                {sortByAccountOrder(filteredAccounts).map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {cleanAccountDisplayName(acc.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Estabelecimento *</Label>
                        <Select value={state.merchant} onValueChange={setters.setMerchant}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedMerchants?.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name} ({formatCurrencyBRL(Number(m.balance))})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <CurrencyInput value={state.valor} onChange={setters.setValor} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aporte-descricao">Descrição *</Label>
                        <Input id="aporte-descricao" value={state.descricao} onChange={(e) => setters.setDescricao(e.target.value)} placeholder="Descreva o aporte" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aporte-obs">Observação</Label>
                        <Input id="aporte-obs" value={state.obs} onChange={(e) => setters.setObs(e.target.value)} placeholder="Opcional" />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={isLoading || isSubmitting || !state.origem || !state.conta || !state.merchant || !state.descricao || state.descricao.length < 5}
                    >
                        {isLoading || isSubmitting ? "Registrando..." : "Registrar Aporte"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
