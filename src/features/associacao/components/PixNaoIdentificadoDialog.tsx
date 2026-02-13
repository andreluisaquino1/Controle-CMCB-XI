import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";
// import { useCreateTransaction } from "@/features/transactions/hooks/use-transactions"; // Legacy
import { transactionService } from "@/features/transactions/services/transactionService";
import { LEDGER_KEYS } from "@/shared/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { invalidateFinance } from "@/shared/query/invalidation";
import { useAssociacaoAccounts, useEntities } from "@/shared/hooks/use-accounts";
import { ACCOUNT_NAMES } from "@/shared/lib/constants";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertCircle, Calculator } from "lucide-react";

interface PixNaoIdentificadoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityId: string | null;
}

export function PixNaoIdentificadoDialog({ open, onOpenChange, entityId }: PixNaoIdentificadoDialogProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: accounts } = useAssociacaoAccounts();
    const { data: entities } = useEntities();

    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const associacaoEntity = entities?.find(e => e.type === "associacao");
    const pixAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.PIX && a.active);

    const handleSubmit = async () => {
        if (!entityId || !pixAccount) {
            toast.error("Entidade ou conta PIX não encontrada.");
            return;
        }

        if (amount <= 0) {
            toast.error("Informe um valor maior que zero.");
            return;
        }

        if (!description.trim()) {
            toast.error("Informe uma descrição para o lançamento.");
            return;
        }

        try {
            setIsSubmitting(true);
            await transactionService.createLedgerTransaction({
                type: 'income',
                source_account: LEDGER_KEYS.EXTERNAL_INCOME,
                destination_account: LEDGER_KEYS.PIX,
                amount_cents: Math.round(amount * 100),
                description: description,
                created_at: `${date}T12:00:00`,
                metadata: {
                    module: "pix_nao_identificado",
                    notes: description,
                    payment_method: "pix",
                    occurred_at: date // Store date in metadata as Ledger uses created_at by default
                }
            });

            await invalidateFinance(queryClient);

            toast.success("PIX não identificado registrado.");
            onOpenChange(false);
            setAmount(0);
            setDescription("");
        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar PIX não identificado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        PIX Não Identificado ("Fantasma")
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                        <p className="text-xs text-amber-800">
                            <strong>Atenção:</strong> Use este lançamento para registrar valores de PIX que entraram na conta BB
                            mas não foram identificados como mensalidade de nenhum assistido.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={date} onChange={setDate} />
                    </div>

                    <div className="space-y-2">
                        <Label>Valor *</Label>
                        <CurrencyInput value={amount} onChange={setAmount} />
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição / Referência *</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Diferença fechamento semana 1"
                        />
                    </div>

                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={isSubmitting || amount <= 0}
                    >
                        {isSubmitting ? "Registrando..." : "Registrar PIX Não Identificado"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
