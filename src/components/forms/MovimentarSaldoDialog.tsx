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
import { Account } from "@/types";

interface MovimentarSaldoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        de: string;
        para: string;
        valor: number;
        descricao: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setDe: (v: string) => void;
        setPara: (v: string) => void;
        setValor: (v: number) => void;
        setDescricao: (v: string) => void;
        setObs: (v: string) => void;
    };
    accounts: Account[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

export function MovimentarSaldoDialog({
    open,
    onOpenChange,
    state,
    setters,
    accounts,
    onSubmit,
    isLoading,
}: MovimentarSaldoDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Movimentar Saldo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>De *</Label>
                            <Select value={state.de} onValueChange={setters.setDe}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Origem" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {cleanAccountDisplayName(acc.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Para *</Label>
                            <Select value={state.para} onValueChange={setters.setPara}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Destino" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {cleanAccountDisplayName(acc.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <CurrencyInput value={state.valor} onChange={setters.setValor} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição *</Label>
                        <Input
                            value={state.descricao}
                            onChange={(e) => setters.setDescricao(e.target.value)}
                            placeholder="Motivo da movimentação"
                        />
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
                        className="w-full"
                        onClick={async () => {
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processando..." : "Confirmar Movimentação"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
