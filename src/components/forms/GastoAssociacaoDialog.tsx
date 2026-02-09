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
import { PlusCircle, X, Plus, Trash2, ListPlus, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
// import { useCreateTransaction } from "@/hooks/use-transactions"; // Legacy
import { transactionService } from "@/services/transactionService";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { ACCOUNT_NAMES, ACCOUNT_NAME_TO_LEDGER_KEY } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";

interface GastoAssociacaoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        meio: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setMeio: (v: string) => void;
        setObs: (v: string) => void;
    };
    onSubmit: (strictBalance?: boolean) => Promise<boolean>;
    isLoading: boolean;
    shortcuts: string[];
    addShortcut: (shortcut: string) => void;
    removeShortcut: (shortcut: string) => void;
    strictBalance?: boolean;
}

interface BatchExpenseItem {
    id: string;
    amount: number;
    description: string;
    date: string;
}

export function GastoAssociacaoDialog({
    open,
    onOpenChange,
    state,
    setters,
    shortcuts,
    addShortcut,
    removeShortcut,
    onSubmit,
    isLoading,
    strictBalance = false,
}: GastoAssociacaoDialogProps) {
    const [newShortcut, setNewShortcut] = useState("");
    const [showShortcutInput, setShowShortcutInput] = useState(false);

    // Batch Mode State
    const [batchItems, setBatchItems] = useState<BatchExpenseItem[]>([
        { id: crypto.randomUUID(), amount: 0, description: "", date: state.date }
    ]);

    const { data: accounts, isLoading: isLoadingAccounts } = useAssociacaoAccounts();
    const { data: entities, isLoading: isLoadingEntities } = useEntities();
    // const createTransaction = useCreateTransaction();
    const queryClient = useQueryClient();
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
        const associacaoEntity = entities?.find(e => e.type === "associacao");
        const especieAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE && a.active);
        const pixAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.PIX && a.active);

        if (!associacaoEntity) {
            toast.error("Entidade não encontrada.");
            return;
        }

        const sourceAccount = state.meio === "cash" ? especieAccount : pixAccount;
        if (!sourceAccount) {
            toast.error("Conta de origem não encontrada.");
            return;
        }

        const validItems = batchItems.filter(i => i.amount > 0 && i.description.trim().length >= 3);
        if (validItems.length === 0) {
            toast.error("Adicione pelo menos um item válido.");
            return;
        }

        const total = calculateTotal();
        if (total > sourceAccount.balance) {
            toast.warning(`Saldo insuficiente em ${sourceAccount.name}. O lançamento será registrado com saldo negativo.`);
        }

        try {
            setIsSubmitting(true);
            for (const item of validItems) {
                // Determine source key
                const sourceKey = ACCOUNT_NAME_TO_LEDGER_KEY[sourceAccount.name];
                if (!sourceKey) throw new Error(`Chave Ledger não encontrada para ${sourceAccount.name}`);

                await transactionService.createLedgerTransaction({
                    type: "expense",
                    source_account: sourceKey,
                    amount_cents: Math.round(item.amount * 100),
                    description: item.description,
                    metadata: {
                        modulo: "gasto_associacao",
                        payment_method: state.meio,
                        notes: state.obs,
                        transaction_date: item.date,
                        entity_id: associacaoEntity.id
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

            toast.success(`${validItems.length} despesas registradas.`);
            onOpenChange(false);
            setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "", date: state.date }]);
        } catch (error) {
            console.error("Error submitting batch expenses:", error);
            toast.error("Erro ao registrar despesas.");
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
                    <DialogTitle>Registrar Gasto (Lote)</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Meio de Pagamento *</Label>
                        <Select value={state.meio} onValueChange={setters.setMeio}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Espécie</SelectItem>
                                <SelectItem value="pix">PIX</SelectItem>
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
                            {batchItems.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded bg-muted/20">
                                    <div className="col-span-3 space-y-1">
                                        <Label htmlFor={`date-${item.id}`} className="text-[10px]">Data</Label>
                                        <DateInput
                                            id={`date-${item.id}`}
                                            value={item.date}
                                            onChange={(v) => updateBatchItem(item.id, 'date', v)}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor={`amount-${item.id}`} className="text-[10px]">Valor</Label>
                                        <CurrencyInput
                                            id={`amount-${item.id}`}
                                            value={item.amount}
                                            onChange={(v) => updateBatchItem(item.id, 'amount', v)}
                                        />
                                    </div>
                                    <div className="col-span-6 space-y-1">
                                        <Label htmlFor={`desc-${item.id}`} className="text-[10px]">Descrição *</Label>
                                        <Input
                                            id={`desc-${item.id}`}
                                            value={item.description}
                                            onChange={(e) => updateBatchItem(item.id, 'description', e.target.value)}
                                            placeholder="Ex: Material"
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
                            Total: <span className="text-destructive">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input
                            value={state.obs}
                            onChange={(e) => setters.setObs(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>

                    <Button
                        className="w-full bg-primary"
                        onClick={handleBatchSubmit}
                        disabled={isLoading || isSubmitting || isLoadingAccounts || isLoadingEntities}
                    >
                        {isLoading || isSubmitting || isLoadingAccounts || isLoadingEntities ? "Processando..." : "Lançar Gastos"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
