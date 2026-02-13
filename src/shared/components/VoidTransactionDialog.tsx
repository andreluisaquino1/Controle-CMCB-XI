import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { XCircle } from "lucide-react";

interface VoidTransactionDialogProps {
    open: boolean;
    onClose: () => void;
    reason: string;
    onReasonChange: (reason: string) => void;
    onConfirm: () => void;
    isPending: boolean;
    /** Custom warning message (defaults to a generic financial reversion warning) */
    warningMessage?: string;
    /** Custom placeholder for reason input */
    placeholder?: string;
    /** Unique HTML id suffix for the reason input (accessibility) */
    inputId?: string;
}

export function VoidTransactionDialog({
    open,
    onClose,
    reason,
    onReasonChange,
    onConfirm,
    isPending,
    warningMessage = "Esta ação é irreversível e reverterá o impacto financeiro no saldo das contas envolvidas imediatamente.",
    placeholder = "Ex: Valor digitado errado",
    inputId = "void-reason",
}: VoidTransactionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="w-[95vw] max-w-md border-destructive/20">
                <DialogHeader>
                    <DialogTitle className="text-destructive flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        Anular Lançamento
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor={inputId}>Motivo da Anulação <span className="text-destructive">*</span></Label>
                        <Input
                            id={inputId}
                            value={reason}
                            onChange={(e) => onReasonChange(e.target.value)}
                            placeholder={placeholder}
                            autoFocus
                        />
                        <p className="text-[10px] text-muted-foreground italic">Mínimo de 3 caracteres para confirmar.</p>
                    </div>
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                        <p className="text-xs text-destructive-foreground font-medium">
                            <strong>Atenção:</strong> {warningMessage}
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Voltar
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={onConfirm}
                            disabled={isPending || reason.trim().length < 3}
                        >
                            {isPending ? "Anulando..." : "Confirmar Anulação"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
