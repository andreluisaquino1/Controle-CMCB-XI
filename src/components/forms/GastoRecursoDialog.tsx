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
import { cleanAccountDisplayName } from "@/lib/account-display";
import { sortByAccountOrder } from "@/lib/constants";
import { Entity, Account } from "@/types";
import { formatCurrencyBRL } from "@/lib/currency";
import { AlertCircle, ListPlus, User, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateResourceTransaction } from "@/hooks/use-transactions";

interface GastoRecursoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        entityId: string;
        accountId: string;
        merchantId: string;
        amount: number;
        description: string;
        notes: string;
        capitalCusteio: string;
    };
    setters: {
        setDate: (v: string) => void;
        setEntityId: (v: string) => void;
        setAccountId: (v: string) => void;
        setMerchantId: (v: string) => void;
        setAmount: (v: number) => void;
        setDescription: (v: string) => void;
        setNotes: (v: string) => void;
        setCapitalCusteio: (v: string) => void;
    };
    entities: Entity[];
    accounts: Account[];
    merchants: { id: string; name: string }[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

interface BatchExpenseItem {
    id: string;
    amount: number;
    description: string;
}

export function GastoRecursoDialog({
    open,
    onOpenChange,
    state,
    setters,
    entities,
    accounts,
    merchants,
    onSubmit,
    isLoading,
}: GastoRecursoDialogProps) {
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [batchItems, setBatchItems] = useState<BatchExpenseItem[]>([
        { id: crypto.randomUUID(), amount: 0, description: "" }
    ]);

    const createTransaction = useCreateResourceTransaction();

    const filteredAccounts = accounts.filter(acc => acc.entity_id === state.entityId);
    const selectedAccount = accounts.find(a => a.id === state.accountId);

    const calculateTotal = () => batchItems.reduce((acc, item) => acc + item.amount, 0);
    const totalAmount = isBatchMode ? calculateTotal() : state.amount;
    const willBeNegative = selectedAccount && (Number(selectedAccount.balance) - totalAmount < 0);

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

    const handleBatchSubmit = async () => {
        const validItems = batchItems.filter(i => i.amount > 0 && i.description.trim().length >= 3);
        if (validItems.length === 0) {
            toast.error("Adicione pelo menos um item válido.");
            return;
        }

        try {
            for (const item of validItems) {
                await createTransaction.mutateAsync({
                    transaction: {
                        transaction_date: state.date,
                        module: "pix_direto_uecx", // Default for direct resource expense
                        entity_id: state.entityId,
                        source_account_id: state.accountId,
                        amount: item.amount,
                        direction: "out",
                        description: item.description,
                        notes: state.notes || "Lançamento em lote de recurso",
                        merchant_id: state.merchantId,
                        capital_custeio: state.capitalCusteio || null,
                    },
                });
            }
            toast.success(`${validItems.length} gastos de recursos registrados.`);
            setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "" }]);
            setIsBatchMode(false);
            onOpenChange(false);
        } catch (error) {
            // Error managed by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-h-[90vh] overflow-y-auto ${isBatchMode ? 'max-w-2xl' : 'max-w-md'}`}>
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>Gasto de Recurso</DialogTitle>
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
                            <Label>Entidade *</Label>
                            <Select value={state.entityId} onValueChange={setters.setEntityId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {entities.filter(e => e.type !== "associacao").map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.type === "ue" ? "Unidade Executora" : "Caixa Escolar"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Conta *</Label>
                        <Select value={state.accountId} onValueChange={setters.setAccountId} disabled={!state.entityId}>
                            <SelectTrigger>
                                <SelectValue placeholder={state.entityId ? "Selecione a conta" : "Selecione entidade primeiro"} />
                            </SelectTrigger>
                            <SelectContent>
                                {sortByAccountOrder(filteredAccounts).map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {cleanAccountDisplayName(acc.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedAccount && (
                            <p className="text-xs text-muted-foreground">
                                Saldo atual: {formatCurrencyBRL(Number(selectedAccount.balance))}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Estabelecimento (Para) *</Label>
                        <Select value={state.merchantId} onValueChange={setters.setMerchantId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o estabelecimento" />
                            </SelectTrigger>
                            <SelectContent>
                                {merchants.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!isBatchMode ? (
                        <>
                            <div className="space-y-2">
                                <Label>Valor (R$) *</Label>
                                <CurrencyInput value={state.amount} onChange={setters.setAmount} />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição *</Label>
                                <Input value={state.description} onChange={(e) => setters.setDescription(e.target.value)} placeholder="Ex: Pagamento de materiais" />
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
                                {batchItems.map((item) => (
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
                                Total: <span className="text-destructive">{formatCurrencyBRL(calculateTotal())}</span>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Capital/Custeio (opcional)</Label>
                        <Select value={state.capitalCusteio} onValueChange={setters.setCapitalCusteio}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="capital">Capital</SelectItem>
                                <SelectItem value="custeio">Custeio</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input value={state.notes} onChange={(e) => setters.setNotes(e.target.value)} placeholder="Opcional" />
                    </div>

                    {willBeNegative && (
                        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Atenção</AlertTitle>
                            <AlertDescription>Esta operação deixará o saldo da conta negativo.</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        className="w-full bg-destructive hover:bg-destructive/90"
                        onClick={async () => {
                            if (isBatchMode) {
                                await handleBatchSubmit();
                            } else {
                                const success = await onSubmit();
                                if (success) onOpenChange(false);
                            }
                        }}
                        disabled={isLoading || createTransaction.isPending || !state.entityId || !state.accountId || !state.merchantId || (!isBatchMode && (!state.description || state.description.length < 5))}
                    >
                        {isLoading || createTransaction.isPending ? "Processando..." : (isBatchMode ? "Lançar Lote" : "Registrar Gasto")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
