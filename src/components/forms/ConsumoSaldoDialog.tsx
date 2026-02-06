import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { formatCurrencyBRL } from "@/lib/currency";
import { ListPlus, User, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useEntities } from "@/hooks/use-accounts";

interface ConsumoSaldoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        merchant: string;
        valor: number;
        descricao: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setMerchant: (v: string) => void;
        setValor: (v: number) => void;
        setDescricao: (v: string) => void;
        setObs: (v: string) => void;
    };
    merchants: { id: string; name: string; balance: number; }[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

interface BatchExpenseItem {
    id: string;
    amount: number;
    description: string;
    date: string;
}

export function ConsumoSaldoDialog({
    open,
    onOpenChange,
    state,
    setters,
    merchants,
    onSubmit,
    isLoading,
}: ConsumoSaldoDialogProps) {
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchItems, setBatchItems] = useState<BatchExpenseItem[]>([
        { id: crypto.randomUUID(), amount: 0, description: "", date: state.date }
    ]);

    const { data: entities } = useEntities();
    const createTransaction = useCreateTransaction();
    const associacaoEntity = entities?.find(e => e.type === "associacao");

    const handleAddBatchItem = () => {
        setBatchItems([...batchItems, { id: crypto.randomUUID(), amount: 0, description: "", date: state.date }]);
    };

    const handleRemoveBatchItem = (id: string) => {
        if (batchItems.length === 1) return;
        setBatchItems(batchItems.filter(item => item.id !== id));
    };

    const updateBatchItem = (id: string, field: keyof BatchExpenseItem, value: any) => {
        setBatchItems(batchItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const calculateTotal = () => batchItems.reduce((acc, item) => acc + item.amount, 0);

    const handleBatchSubmit = async () => {
        if (!associacaoEntity) {
            toast.error("Entidade Associação não encontrada.");
            return;
        }

        const selectedMerchant = merchants.find(m => m.id === state.merchant);
        if (!selectedMerchant) {
            toast.error("Selecione um estabelecimento.");
            return;
        }

        const validItems = batchItems.filter(i => i.amount > 0 && i.description.trim().length >= 3);
        if (validItems.length === 0) {
            toast.error("Adicione pelo menos um item válido.");
            return;
        }

        const total = calculateTotal();
        if (total > selectedMerchant.balance) {
            toast.error(`Saldo insuficiente no estabelecimento ${selectedMerchant.name}.`);
            return;
        }

        try {
            for (const item of validItems) {
                await createTransaction.mutateAsync({
                    transaction: {
                        transaction_date: item.date,
                        module: "consumo_saldo",
                        entity_id: associacaoEntity.id,
                        merchant_id: state.merchant,
                        amount: item.amount,
                        direction: "out",
                        description: item.description,
                        notes: state.obs || "Lançamento em lote",
                    },
                });
            }

            toast.success(`${validItems.length} consumos registrados.`);
            setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "", date: state.date }]);
            onOpenChange(false);
        } catch (error) {
            // Error managed by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>Registrar Gasto (Lote)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data *</Label>
                            <DateInput value={state.date} onChange={setters.setDate} />
                        </div>
                        <div className="space-y-2">
                            <Label>Estabelecimento *</Label>
                            <Select value={state.merchant} onValueChange={setters.setMerchant}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {merchants?.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name} ({formatCurrencyBRL(Number(m.balance))})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="font-medium">Itens ({batchItems.length})</Label>
                            <Button variant="outline" size="sm" onClick={handleAddBatchItem}>
                                <Plus className="w-4 h-4 mr-1" /> Item
                            </Button>
                        </div>
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                            {batchItems.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded bg-muted/20">
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-[10px]">Data</Label>
                                        <DateInput
                                            value={item.date}
                                            onChange={(v) => updateBatchItem(item.id, 'date', v)}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label className="text-[10px]">Valor</Label>
                                        <CurrencyInput
                                            value={item.amount}
                                            onChange={(v) => updateBatchItem(item.id, 'amount', v)}
                                        />
                                    </div>
                                    <div className="col-span-6 space-y-1">
                                        <Label className="text-[10px]">Descrição *</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateBatchItem(item.id, 'description', e.target.value)}
                                            placeholder="Ex: Produto X"
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-destructive"
                                            onClick={() => handleRemoveBatchItem(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="text-right font-bold text-lg">
                            Total: <span className="text-destructive font-bold">{formatCurrencyBRL(calculateTotal())}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input value={state.obs} onChange={(e) => setters.setObs(e.target.value)} placeholder="Opcional" />
                    </div>

                    <p className="text-xs text-muted-foreground">
                        * Este gasto deduzirá do saldo no estabelecimento.
                    </p>

                    <Button
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                        onClick={handleBatchSubmit}
                        disabled={isLoading || createTransaction.isPending || !state.merchant}
                    >
                        {isLoading || createTransaction.isPending ? "Processando..." : "Lançar Lote"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
