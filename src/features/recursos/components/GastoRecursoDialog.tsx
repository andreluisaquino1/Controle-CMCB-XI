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
import { cleanAccountDisplayName } from "@/shared/lib/account-display";
import { sortByAccountOrder, ACCOUNT_NAME_TO_LEDGER_KEY, LEDGER_KEYS } from "@/shared/lib/constants";
import { Entity, Account } from "@/types";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { useState } from "react";
import { toast } from "sonner";
// Shared services
import { accountService } from "../../../shared/services/accountService";
import { transactionService } from "@/features/transactions/services/transactionService";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateFinance } from "@/shared/query/invalidation";

interface GastoRecursoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        entityId: string;
        accountId: string;
        merchantId: string;
        notes: string;
        capitalCusteio: string;
    };
    setters: {
        setDate: (v: string) => void;
        setEntityId: (v: string) => void;
        setAccountId: (v: string) => void;
        setMerchantId: (v: string) => void;
        setNotes: (v: string) => void;
        setCapitalCusteio: (v: string) => void;
    };
    entities: Entity[];
    accounts: Account[];
    merchants: { id: string; name: string; active?: boolean }[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

interface BatchExpenseItem {
    id: string;
    amount: number;
    description: string;
    date: string;
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
    const [batchItems, setBatchItems] = useState<BatchExpenseItem[]>([
        { id: crypto.randomUUID(), amount: 0, description: "", date: state.date }
    ]);

    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredAccounts = accounts.filter(acc => acc.entity_id === state.entityId && acc.active);
    const selectedAccount = accounts.find(a => a.id === state.accountId);

    const calculateTotal = () => batchItems.reduce((acc, item) => acc + item.amount, 0);
    const totalAmount = calculateTotal();
    const willBeNegative = selectedAccount && (Number(selectedAccount.balance) - totalAmount < 0);

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

    const handleBatchSubmit = async () => {
        const validItems = batchItems.filter(i => i.amount > 0 && i.description.trim().length >= 3);
        if (validItems.length === 0) {
            toast.error("Adicione pelo menos um item válido.");
            return;
        }

        if (!selectedAccount) {
            toast.error("Conta não selecionada.");
            return;
        }

        try {
            setIsSubmitting(true);
            for (const item of validItems) {
                // Use account ID as ledger key (consistent with Entrada)
                const sourceKey = selectedAccount.id;

                await transactionService.createLedgerTransaction({
                    type: "expense",
                    source_account: sourceKey,
                    destination_account: LEDGER_KEYS.EXTERNAL_EXPENSE,
                    amount_cents: Math.round(item.amount * 100),
                    description: item.description,
                    created_at: `${item.date}T12:00:00`,
                    metadata: {
                        module: "pix_direto_uecx",
                        transaction_date: item.date,
                        merchant_id: state.merchantId === "avulso" ? null : state.merchantId,
                        account_id: state.accountId,
                        notes: state.notes,
                        entity_id: state.entityId,
                        is_avulso: state.merchantId === "avulso"
                    }
                });
            }

            await invalidateFinance(queryClient);

            toast.success(`${validItems.length} gastos de recursos registrados.`);
            setBatchItems([{ id: crypto.randomUUID(), amount: 0, description: "", date: state.date }]);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar gastos.");
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
                    <DialogTitle>Registrar Gastos de Recurso</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="gasto-entity">Entidade *</Label>
                        <Select value={state.entityId} onValueChange={setters.setEntityId}>
                            <SelectTrigger id="gasto-entity">
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

                    <div className="space-y-2">
                        <Label htmlFor="gasto-account">Conta *</Label>
                        <Select value={state.accountId} onValueChange={setters.setAccountId} disabled={!state.entityId}>
                            <SelectTrigger id="gasto-account">
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
                        <Label htmlFor="gasto-merchant">Estabelecimento (Para) *</Label>
                        <Select value={state.merchantId} onValueChange={setters.setMerchantId}>
                            <SelectTrigger id="gasto-merchant">
                                <SelectValue placeholder="Selecione o estabelecimento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="avulso">Compra Avulsa / Diversos</SelectItem>
                                {merchants.filter(m => m.active !== false).map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name}
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



                    <div className="space-y-2">
                        <Label htmlFor="gasto-obs">Observação</Label>
                        <Input id="gasto-obs" value={state.notes} onChange={(e) => setters.setNotes(e.target.value)} placeholder="Opcional" />
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
                        onClick={handleBatchSubmit}
                        disabled={isLoading || isSubmitting || !state.entityId || !state.accountId || !state.merchantId}
                    >
                        {isLoading || isSubmitting ? "Processando..." : "Lançar Gastos"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
