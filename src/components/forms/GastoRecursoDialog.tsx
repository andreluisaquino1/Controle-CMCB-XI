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
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
    const filteredAccounts = accounts.filter(acc => acc.entity_id === state.entityId);
    const selectedAccount = accounts.find(a => a.id === state.accountId);
    const willBeNegative = selectedAccount && (Number(selectedAccount.balance) - state.amount < 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Gasto de Recurso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
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
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <CurrencyInput value={state.amount} onChange={setters.setAmount} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição *</Label>
                        <Input value={state.description} onChange={(e) => setters.setDescription(e.target.value)} placeholder="Ex: Pagamento de materiais" />
                    </div>
                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input value={state.notes} onChange={(e) => setters.setNotes(e.target.value)} placeholder="Opcional" />
                    </div>
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
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Registrando..." : "Registrar Gasto"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
