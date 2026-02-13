import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
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
} from "@/shared/ui/alert-dialog";
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
import { formatCurrencyBRL } from "@/shared/lib/currency";
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
    const { setDate, setAccountId, setValor, setMotivo, setObs } = setters;
    const selectedAccount = accounts.find(a => a.id === state.accountId);
    const currentBalance = selectedAccount?.balance || 0;
    const [confirmOpen, setConfirmOpen] = useState(false);

    /**
     * Fonte de verdade local para evitar disputa entre:
     * - state.valor (controlado pelo pai)
     * - valor digitado/cálculo instantâneo no diálogo
     *
     * Isso ajuda a evitar “voltar valor” enquanto o usuário digita e reduz flakiness de teste.
     */
    const [mode, setMode] = useState<"adjustment" | "finalBalance" | null>(null);
    const [adjustment, setAdjustment] = useState<number>(state.valor || 0);
    const [finalBalance, setFinalBalance] = useState<number>(currentBalance + (state.valor || 0));

    // Quando trocar a conta, reseta o diálogo de forma previsível
    useEffect(() => {
        setMode(null);
        setAdjustment(0);
        setFinalBalance(currentBalance);
        if (state.valor !== 0) setValor(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.accountId, currentBalance, setValor]);

    // Se o pai resetar valor enquanto não há campo ativo, refletir aqui
    useEffect(() => {
        if (mode === null) {
            const v = state.valor || 0;
            setAdjustment(v);
            setFinalBalance(currentBalance + v);
        }
    }, [state.valor, currentBalance, mode]);

    const handleAdjustmentChange = (val: number) => {
        setMode(val === 0 ? null : "adjustment");
        setAdjustment(val);
        setFinalBalance(currentBalance + val);
        setValor(val);
    };

    const handleFinalBalanceChange = (val: number) => {
        const delta = val - currentBalance;
        setMode(delta === 0 ? null : "finalBalance");
        setFinalBalance(val);
        setAdjustment(delta);
        setValor(delta);
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
                        <DateInput id="adj-date" value={state.date} onChange={setDate} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adj-account">Conta a Ajustar *</Label>
                        <Select value={state.accountId} onValueChange={setAccountId}>
                            <SelectTrigger id="adj-account">
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
                                    value={adjustment}
                                    onChange={handleAdjustmentChange}
                                    placeholder="Ex: +10 ou -5"
                                    disabled={mode === "finalBalance"}
                                />
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    {mode === "finalBalance" ? "Calculado" : "Somar ou subtrair"}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adj-final" className="text-xs text-muted-foreground">Novo Saldo (R$)</Label>
                                <CurrencyInput
                                    id="adj-final"
                                    value={finalBalance}
                                    onChange={handleFinalBalanceChange}
                                    placeholder="Saldo desejado"
                                    disabled={mode === "adjustment"}
                                />
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    {mode === "adjustment" ? "Calculado" : "Qual será o saldo"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adj-reason">Motivo *</Label>
                        <Input
                            id="adj-reason"
                            value={state.motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ex: Saldo inicial, correção, etc"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="adj-obs">Observação</Label>
                        <Input
                            id="adj-obs"
                            value={state.obs}
                            onChange={(e) => setObs(e.target.value)}
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
                                disabled={isLoading || !state.accountId || !state.motivo || state.motivo.length < 5 || adjustment === 0}
                            >
                                {isLoading ? "Salvando..." : "Registrar Ajuste"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Ajuste de Saldo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação alterará o saldo de <strong>{selectedAccount ? cleanAccountDisplayName(selectedAccount.name) : ""}</strong> de {formatCurrencyBRL(currentBalance)} para <strong>{formatCurrencyBRL(finalBalance)}</strong>.
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
