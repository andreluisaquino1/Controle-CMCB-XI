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
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { ACCOUNT_NAMES } from "@/lib/constants";

interface GastoAssociacaoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        meio: string;
        valor: number;
        descricao: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setMeio: (v: string) => void;
        setValor: (v: number) => void;
        setDescricao: (v: string) => void;
        setObs: (v: string) => void;
    };
    shortcuts: string[];
    addShortcut: (s: string) => void;
    removeShortcut: (s: string) => void;
    onSubmit: (strictBalance?: boolean) => Promise<boolean>;
    isLoading: boolean;
    strictBalance?: boolean;
}

interface BatchExpenseItem {
    id: string;
    amount: number;
    description: string;
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
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchItems, setBatchItems] = useState<BatchExpenseItem[]>([
        { id: crypto.randomUUID(), amount: 0, description: "" }
    ]);

    const { data: accounts } = useAssociacaoAccounts();
    const { data: entities } = useEntities();
    const createTransaction = useCreateTransaction();

    const associacaoEntity = entities?.find(e => e.type === "associacao");
    const especieAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE);
    const pixAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.PIX);

    const handleAddBatchItem = () => {
        setBatchItems([...batchItems, { id: crypto.randomUUID(), amount: 0, description: "" }]);
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
            toast.error(`Saldo insuficiente em ${sourceAccount.name}.`);
            return;
        }

        try {
            for (const item of validItems) {
                await createTransaction.mutateAsync({
                    transaction: {
                        transaction_date: state.date,
                        module: "gasto_associacao",
                        entity_id: associacaoEntity.id,
                        source_account_id: sourceAccount.id,
                        amount: item.amount,
                        direction: "out",
                        payment_method: state.meio as "cash" | "pix",
                        description: item.description,
                        notes: state.obs || "Lançamento em lote",
                    },
                });
            }

            toast.success(`${validItems.length} despesas registradas.`);
            onOpenChange(false);
            setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "" }]);
            setIsBatchMode(false);
        } catch (error) {
            // Error managed by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-h-[90vh] overflow-y-auto ${isBatchMode ? 'max-w-2xl' : 'max-w-md'}`}>
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>Registrar Gasto</DialogTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 gap-2 ${isBatchMode ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                        onClick={() => setIsBatchMode(!isBatchMode)}
                    >
                        {isBatchMode ? <User className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
                        {isBatchMode ? "Modo Individual" : "Modo em Lote"}
                    </Button>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Data *</Label>
                            <DateInput value={state.date} onChange={setters.setDate} />
                        </div>
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
                    </div>

                    {!isBatchMode ? (
                        <>
                            <div className="space-y-2">
                                <Label>Valor (R$) *</Label>
                                <CurrencyInput value={state.valor} onChange={setters.setValor} />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição *</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {shortcuts.map((s) => (
                                        <div key={s} className="group relative">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[10px] px-2 bg-muted/30 border-muted-foreground/20 hover:bg-muted pr-6"
                                                onClick={() => setters.setDescricao(s)}
                                            >
                                                {s}
                                            </Button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeShortcut(s); }}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {!showShortcutInput && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                                            onClick={() => setShowShortcutInput(true)}
                                        >
                                            <PlusCircle className="h-3 w-3 mr-1" />
                                            Adicionar
                                        </Button>
                                    )}
                                </div>
                                {showShortcutInput && (
                                    <div className="flex gap-2 items-center mb-4">
                                        <Input
                                            value={newShortcut}
                                            onChange={(e) => setNewShortcut(e.target.value)}
                                            placeholder="Novo atalho"
                                            className="h-8 text-xs"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (newShortcut.trim()) {
                                                        addShortcut(newShortcut.trim());
                                                        setNewShortcut("");
                                                        setShowShortcutInput(false);
                                                    }
                                                }
                                                if (e.key === 'Escape') {
                                                    setNewShortcut("");
                                                    setShowShortcutInput(false);
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={() => {
                                                if (newShortcut.trim()) {
                                                    addShortcut(newShortcut.trim());
                                                    setNewShortcut("");
                                                    setShowShortcutInput(false);
                                                }
                                            }}
                                        >
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                                <Input
                                    value={state.descricao}
                                    onChange={(e) => setters.setDescricao(e.target.value)}
                                    placeholder="Descreva o gasto"
                                />
                            </div>
                        </>
                    ) : (
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
                                            <Label className="text-[10px]">Valor</Label>
                                            <CurrencyInput
                                                value={item.amount}
                                                onChange={(v) => updateBatchItem(item.id, 'amount', v)}
                                            />
                                        </div>
                                        <div className="col-span-8 space-y-1">
                                            <Label className="text-[10px]">Descrição *</Label>
                                            <Input
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
                    )}

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input
                            value={state.obs}
                            onChange={(e) => setters.setObs(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>

                    <Button
                        className={`w-full ${isBatchMode ? 'bg-primary' : 'bg-destructive hover:bg-destructive/90'}`}
                        onClick={async () => {
                            if (isBatchMode) {
                                await handleBatchSubmit();
                            } else {
                                const success = await onSubmit(strictBalance);
                                if (success) onOpenChange(false);
                            }
                        }}
                        disabled={isLoading || createTransaction.isPending}
                    >
                        {isLoading || createTransaction.isPending ? "Processando..." : (isBatchMode ? "Lançar Lote" : "Registrar Gasto")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
