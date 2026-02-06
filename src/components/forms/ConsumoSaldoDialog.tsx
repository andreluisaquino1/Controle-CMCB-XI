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
import { Merchant } from "@/types";

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

export function ConsumoSaldoDialog({
    open,
    onOpenChange,
    state,
    setters,
    merchants,
    onSubmit,
    isLoading,
}: ConsumoSaldoDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Gasto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
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
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <CurrencyInput value={state.valor} onChange={setters.setValor} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição *</Label>
                        <Input value={state.descricao} onChange={(e) => setters.setDescricao(e.target.value)} placeholder="Ex: Gêneros alimentícios" />
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
                        onClick={async () => {
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading || !state.merchant || !state.descricao || state.descricao.length < 5}
                    >
                        {isLoading ? "Registrando..." : "Registrar Consumo"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
