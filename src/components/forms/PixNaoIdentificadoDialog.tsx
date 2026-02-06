import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useAuth } from "@/contexts/AuthContext";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertCircle, Calculator } from "lucide-react";

interface PixNaoIdentificadoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PixNaoIdentificadoDialog({ open, onOpenChange }: PixNaoIdentificadoDialogProps) {
    const { user } = useAuth();
    const createTransaction = useCreateTransaction();
    const { data: accounts } = useAssociacaoAccounts();
    const { data: entities } = useEntities();

    const associacaoEntity = entities?.find(e => e.type === "associacao");
    const pixAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.PIX);

    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState("");

    const handleSubmit = async () => {
        if (!associacaoEntity || !pixAccount) {
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
            await createTransaction.mutateAsync({
                transaction: {
                    transaction_date: date,
                    module: "pix_nao_identificado",
                    entity_id: associacaoEntity.id,
                    destination_account_id: pixAccount.id,
                    amount: amount,
                    direction: "in",
                    payment_method: "pix",
                    description: `PIX Não Identificado: ${description}`,
                    notes: `Lançamento de PIX não identificado - ${description}`,
                },
            });

            toast.success("PIX não identificado registrado.");
            onOpenChange(false);
            setAmount(0);
            setDescription("");
        } catch (error) {
            toast.error("Falha ao registrar PIX não identificado.");
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
                        disabled={createTransaction.isPending || amount <= 0}
                    >
                        {createTransaction.isPending ? "Registrando..." : "Registrar PIX Não Identificado"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
