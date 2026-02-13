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
import { sortByAccountOrder } from "@/shared/lib/constants";
import { Entity, Account } from "@/types";

interface EntradaRecursoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        entityId: string;
        accountId: string;
        amount: number;
        description: string;
        notes: string;
    };
    setters: {
        setDate: (v: string) => void;
        setEntityId: (v: string) => void;
        setAccountId: (v: string) => void;
        setAmount: (v: number) => void;
        setDescription: (v: string) => void;
        setNotes: (v: string) => void;
    };
    entities: Entity[];
    accounts: Account[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

export function EntradaRecursoDialog({
    open,
    onOpenChange,
    state,
    setters,
    entities,
    accounts,
    onSubmit,
    isLoading,
}: EntradaRecursoDialogProps) {
    const filteredAccounts = accounts.filter(acc => acc.entity_id === state.entityId && acc.active);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nova Entrada de Recurso</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="ent-date">Data *</Label>
                        <DateInput id="ent-date" value={state.date} onChange={setters.setDate} />
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
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ent-amount">Valor (R$) *</Label>
                        <CurrencyInput id="ent-amount" value={state.amount} onChange={setters.setAmount} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ent-desc">Descrição *</Label>
                        <Input id="ent-desc" value={state.description} onChange={(e) => setters.setDescription(e.target.value)} placeholder="Ex: Repasse PDDE" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="ent-obs">Observação</Label>
                        <Input id="ent-obs" value={state.notes} onChange={(e) => setters.setNotes(e.target.value)} placeholder="Opcional" />
                    </div>
                    <Button
                        className="w-full bg-success hover:bg-success/90"
                        onClick={async () => {
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading || !state.entityId || !state.accountId || !state.description || state.description.length < 5}
                    >
                        {isLoading ? "Registrando..." : "Registrar Entrada"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
