import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { formatCurrencyBRL } from "@/lib/currency";
import { Account } from "@/types";
import { useState, useEffect } from "react";
import { XCircle } from "lucide-react";

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
    const [confirmOpen, setConfirmOpen] = useState(false);

    // Track which field is physically active to implement exclusive locking
    const [activeField, setActiveField] = useState<'adjustment' | 'finalBalance' | null>(null);

    // Local state for the "Final Balance" calculation
    const [finalBalance, setFinalBalance] = useState(currentBalance + state.valor);

    // Sync calculated field when active one changes
    useEffect(() => {
        if (activeField === 'adjustment') {
            setFinalBalance(currentBalance + state.valor);
        } else if (activeField === 'finalBalance') {
            // setters.setValor(finalBalance - currentBalance) is handled in handleFinalBalanceChange
        } else {
            // Neither is active, keep them in sync with current state
            setFinalBalance(currentBalance + state.valor);
        }
    }, [state.valor, currentBalance, activeField]);

    // Cleanup and Reset when account changes
    useEffect(() => {
        setActiveField(null);
        setters.setValor(0);
        setFinalBalance(currentBalance);
    }, [state.accountId, currentBalance]);

    const handleAdjustmentChange = (val: number) => {
        if (val === 0) {
            setActiveField(null);
        } else if (!activeField) {
            setActiveField('adjustment');
        }
        setters.setValor(val);
        setFinalBalance(currentBalance + val);
    };

    const handleFinalBalanceChange = (val: number) => {
        if (val === currentBalance) {
            setActiveField(null);
        } else if (!activeField) {
            setActiveField('finalBalance');
        }
        setFinalBalance(val);
        setters.setValor(val - currentBalance);
    };

    const handleClearValues = () => {
        setActiveField(null);
        setters.setValor(0);
        setFinalBalance(currentBalance);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-md w-[95vw]"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Ajustar Saldo da Conta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="adj-date">Data *</Label>
                        <DateInput id="adj-date" value={state.date} onChange={setters.setDate} />
                    </div>

                    <div className="space-y-2">
                        <Label>Conta a Ajustar *</Label>
                        <Select value={state.accountId} onValueChange={setters.setAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortByAccountOrder(accounts).map((acc) => (
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

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Valores</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="adj-amount" className="text-xs text-muted-foreground">Valor do Ajuste (R$)</Label>
                                <CurrencyInput
                                    id="adj-amount"
                                    value={state.valor}
                                    onChange={handleAdjustmentChange}
                                    placeholder="Ex: +10 ou -5"
                                    disabled={activeField === 'finalBalance'}
                                />
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    {activeField === 'finalBalance' ? 'Calculado' : 'Somar ou subtrair'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adj-final" className="text-xs text-muted-foreground">Novo Saldo (R$)</Label>
                                <CurrencyInput
                                    id="adj-final"
                                    value={finalBalance}
                                    onChange={handleFinalBalanceChange}
                                    placeholder="Saldo desejado"
                                    disabled={activeField === 'adjustment'}
                                />
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    {activeField === 'adjustment' ? 'Calculado' : 'Qual será o saldo'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adj-reason">Motivo *</Label>
                        <Input
                            id="adj-reason"
                            value={state.motivo}
                            onChange={(e) => setters.setMotivo(e.target.value)}
                            placeholder="Ex: Saldo inicial, correção, etc"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adj-obs">Observação</Label>
                        <Input
                            id="adj-obs"
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

                    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                className="w-full"
                                disabled={isLoading || !state.accountId || !state.motivo || state.motivo.length < 5 || state.valor === 0}
                            >
                                {isLoading ? "Salvando..." : "Registrar Ajuste"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Ajuste de Saldo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação alterará o saldo de <strong>{selectedAccount ? cleanAccountDisplayName(selectedAccount.name) : ""}</strong> de {formatCurrencyBRL(currentBalance)} para <strong>{formatCurrencyBRL(currentBalance + state.valor)}</strong>.
                                    Esta operação será registrada na trilha de auditoria.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={async () => {
                                        const success = await onSubmit();
                                        if (success) onOpenChange(false);
                                    }}
                                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                                >
                                    Confirmar Ajuste
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </DialogContent>
        </Dialog>
    );
}
