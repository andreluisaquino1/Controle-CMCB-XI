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
import { formatCurrencyBRL } from "@/lib/currency";
import { Account } from "@/types";
import { useState, useEffect } from "react";

interface AjustarSaldoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        accountId: string;
        valor: number;
        motivo: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setAccountId: (v: string) => void;
        setValor: (v: number) => void;
        setMotivo: (v: string) => void;
        setObs: (v: string) => void;
    };
    accounts: Account[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

export function AjustarSaldoDialog({
    open,
    onOpenChange,
    state,
    setters,
    accounts,
    onSubmit,
    isLoading,
}: AjustarSaldoDialogProps) {
    const selectedAccount = accounts.find(a => a.id === state.accountId);
    const currentBalance = selectedAccount?.balance || 0;

    // Local state for the "Final Balance" input to allow interactive calculation
    const [finalBalance, setFinalBalance] = useState(currentBalance + state.valor);

    // Update finalBalance when account or adjustment value changes from outside
    useEffect(() => {
        setFinalBalance(currentBalance + state.valor);
    }, [state.accountId, state.valor, currentBalance]);

    const handleAdjustmentChange = (val: number) => {
        setters.setValor(val);
        setFinalBalance(currentBalance + val);
    };

    const handleFinalBalanceChange = (val: number) => {
        setFinalBalance(val);
        setters.setValor(val - currentBalance);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Ajustar Saldo da Conta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={state.date} onChange={setters.setDate} />
                    </div>

                    <div className="space-y-2">
                        <Label>Conta a Ajustar *</Label>
                        <Select value={state.accountId} onValueChange={setters.setAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {cleanAccountDisplayName(acc.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedAccount && (
                            <p className="text-xs text-muted-foreground px-1">
                                Saldo Atual: <span className="font-semibold">{formatCurrencyBRL(currentBalance)}</span>
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Valor do Ajuste (R$)</Label>
                            <CurrencyInput
                                value={state.valor}
                                onChange={handleAdjustmentChange}
                                placeholder="Ex: +10 ou -5"
                            />
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Quanto somar ou subtrair
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Novo Saldo (R$)</Label>
                            <CurrencyInput
                                value={finalBalance}
                                onChange={handleFinalBalanceChange}
                                placeholder="Saldo final desejado"
                            />
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Qual deve ser o saldo final
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Motivo *</Label>
                        <Input
                            value={state.motivo}
                            onChange={(e) => setters.setMotivo(e.target.value)}
                            placeholder="Ex: Saldo inicial, correção, etc"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input
                            value={state.obs}
                            onChange={(e) => setters.setObs(e.target.value)}
                            placeholder="Informações adicionais"
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                        <p className="text-xs text-amber-800">
                            <strong>Atenção:</strong> Ajustes de saldo são lançados como transações de correção e afetam o saldo imediatamente.
                        </p>
                    </div>

                    <Button
                        className="w-full"
                        onClick={async () => {
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading || !state.accountId || !state.motivo}
                    >
                        {isLoading ? "Salvando..." : "Confirmar Ajuste"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
