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
import { useEntities } from "@/hooks/use-accounts";
// import { useCreateTransaction } from "@/hooks/use-transactions"; // Legacy
import { createLedgerTransaction } from "@/domain/ledger";
import { useQueryClient } from "@tanstack/react-query";

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
    merchants: { id: string; name: string; balance: number; active: boolean; }[];
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
    const queryClient = useQueryClient();
    const associacaoEntity = entities?.find(e => e.type === "associacao");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddBatchItem = () => {
        setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "", date: state.date }, ...batchItems]);
    };

    const handleRemoveBatchItem = (id: string) => {
        if (batchItems.length === 1) return;
        setBatchItems(batchItems.filter(item => item.id !== id));
    };

    const updateBatchItem = (id: string, field: keyof BatchExpenseItem, value: string | number) => {
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
        if (total > Number(selectedMerchant.balance)) {
            toast.warning(`Saldo insuficiente no estabelecimento ${selectedMerchant.name}. Disponível: ${formatCurrencyBRL(Number(selectedMerchant.balance))}. O lançamento será registrado com saldo negativo.`);
        }

        try {
            setIsSubmitting(true);
            for (const item of validItems) {
                await createLedgerTransaction({
                    type: 'expense',
                    source_account: state.merchant, // Merchant ID as Source (consuming balance)
                    amount_cents: Math.round(item.amount * 100),
                    description: item.description,
                    metadata: {
                        modulo: "consumo_saldo",
                        transaction_date: item.date,
                        notes: state.obs,
                        merchant_id: state.merchant,
                    }
                });
            }

            await queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] });
            await queryClient.invalidateQueries({ queryKey: ["transactions"] });
            await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
            await queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] });
            await queryClient.invalidateQueries({ queryKey: ["accounts"] });
            await queryClient.invalidateQueries({ queryKey: ["merchants"] });

            toast.success(`${validItems.length} consumos registrados.`);
            setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "", date: state.date }]);
            onOpenChange(false);
        } catch (error) {
            console.error("Error submitting batch consumption:", error);
            toast.error("Falha ao registrar consumos.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[90vh] overflow-y-auto max-w-2xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>Registrar Gastos</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Estabelecimento *</Label>
                        <Select value={state.merchant} onValueChange={setters.setMerchant}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {merchants?.filter(m => m.active).map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name} ({formatCurrencyBRL(Number(m.balance))})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                        <Label className="text-[10px]" htmlFor={`desc-${item.id}`}>Descrição *</Label>
                                        <Input
                                            id={`desc-${item.id}`}
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
                        disabled={isLoading || isSubmitting || !state.merchant}
                    >
                        {isLoading || isSubmitting ? "Processando..." : "Lançar Gastos"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
