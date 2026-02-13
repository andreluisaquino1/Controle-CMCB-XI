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
import { useState } from "react";
import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";
import { cleanAccountDisplayName } from "@/shared/lib/account-display";
import { ACCOUNT_NAMES, sortByAccountOrder } from "@/shared/lib/constants";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { Account } from "@/types";
import { cn } from "@/shared/lib/utils";

interface MovimentarSaldoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        de: string;
        para: string;
        valor: number;
        taxa: number;
        descricao: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setDe: (v: string) => void;
        setPara: (v: string) => void;
        setValor: (v: number) => void;
        setTaxa: (v: number) => void;
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
    const sourceAccount = accounts.find(a => a.id === state.de);
    const destinationAccount = accounts.find(a => a.id === state.para);
    const isContaDigital = sourceAccount?.name.includes("Conta Digital");
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-h-[90vh] overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Movimentar Saldo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="mov-date">Data *</Label>
                        <DateInput id="mov-date" value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>De *</Label>
                            <Select value={state.de} onValueChange={setters.setDe}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Origem" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortByAccountOrder(accounts
                                        .filter(acc => acc.id !== state.para))
                                        .map((acc) => (
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
                                    {sortByAccountOrder(accounts
                                        .filter(acc => acc.id !== state.de) // Cannot transfer to itself
                                        .filter(acc => acc.name !== ACCOUNT_NAMES.CONTA_DIGITAL) // Cannot receive balance
                                        .filter(acc => {
                                            if (isContaDigital) {
                                                return acc.name === ACCOUNT_NAMES.PIX;
                                            }
                                            return true;
                                        }))
                                        .map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {cleanAccountDisplayName(acc.name)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="mov-valor">Valor (R$) *</Label>
                            <CurrencyInput id="mov-valor" value={state.valor} onChange={setters.setValor} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mov-taxa">Taxa (R$)</Label>
                            <CurrencyInput
                                id="mov-taxa"
                                value={state.taxa}
                                onChange={setters.setTaxa}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mov-desc">Descrição *</Label>
                        <Input
                            id="mov-desc"
                            value={state.descricao}
                            onChange={(e) => setters.setDescricao(e.target.value)}
                            placeholder="Motivo da movimentação"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mov-obs">Observação</Label>
                        <Input
                            id="mov-obs"
                            value={state.obs}
                            onChange={(e) => setters.setObs(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>

                    {(sourceAccount || destinationAccount) && (
                        <div className="bg-muted/30 p-4 rounded-lg space-y-4 border border-muted-foreground/10 animate-fade-in">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center border-b border-muted pb-2">
                                Prévia de Impacto nos Saldos
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {sourceAccount && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Origem: {cleanAccountDisplayName(sourceAccount.name)}</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Saldo atual:</span>
                                            <span>{formatCurrencyBRL(sourceAccount.balance)}</span>
                                        </div>
                                        <div className="flex justify-between font-medium">
                                            <span className="text-muted-foreground">Saída:</span>
                                            <span className="text-destructive">-{formatCurrencyBRL(state.valor)}</span>
                                        </div>

                                        {state.taxa > 0 && (
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Taxa:</span>
                                                <span className="text-destructive">-{formatCurrencyBRL(state.taxa)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between border-t pt-2 mt-2">
                                            <span className="text-muted-foreground">Saldo Projetado:</span>
                                            <span className={cn(
                                                "font-bold",
                                                (sourceAccount.balance - state.valor - state.taxa) < 0 ? "text-destructive" : "text-primary"
                                            )}>
                                                {formatCurrencyBRL(sourceAccount.balance - state.valor - state.taxa)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {destinationAccount && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Destino: {cleanAccountDisplayName(destinationAccount.name)}</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Saldo atual:</span>
                                            <span>{formatCurrencyBRL(destinationAccount.balance)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Entrada:</span>
                                            <span className="text-success">+{formatCurrencyBRL(state.valor)}</span>
                                        </div>
                                        <div className="pt-1 border-t border-muted/50 flex justify-between text-sm font-bold">
                                            <span>Projetado:</span>
                                            <span className="text-primary">
                                                {formatCurrencyBRL(destinationAccount.balance + state.valor)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                className="w-full"
                                disabled={isLoading || !state.de || !state.para || !state.descricao || state.descricao.length < 5}
                            >
                                {isLoading ? "Processando..." : "Confirmar Movimentação"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Movimentação?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Você está transferindo <strong>{formatCurrencyBRL(state.valor)}</strong> de {sourceAccount ? cleanAccountDisplayName(sourceAccount.name) : ""} para <strong>{destinationAccount ? cleanAccountDisplayName(destinationAccount.name) : ""}</strong>.
                                    {state.taxa > 0 && ` Uma taxa de ${formatCurrencyBRL(state.taxa)} será aplicada.`}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={async () => {
                                        const success = await onSubmit();
                                        if (success) onOpenChange(false);
                                    }}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    Confirmar Transferência
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </DialogContent>
        </Dialog>
    );
}
