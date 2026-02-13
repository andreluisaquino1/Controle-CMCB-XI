import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ObligationKind, graduationModuleService } from "@/features/graduations/services";

interface ChargeBatchData { graduation_id: string; kind: ObligationKind; reference_label: string; amount: number }
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface GlobalChargeBatchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    graduationId: string;
}

export function GlobalChargeBatchModal({ open, onOpenChange, graduationId }: GlobalChargeBatchModalProps) {
    const queryClient = useQueryClient();
    const [kind, setKind] = useState<ObligationKind>("RIFA");
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");

    const mutation = useMutation({
        mutationFn: (data: ChargeBatchData) => graduationModuleService.createGlobalChargeBatch(data),
        onSuccess: (count: number) => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] });
            toast.success(`${count} cobranças criadas com sucesso para todas as turmas!`);
            onOpenChange(false);
            resetForm();
        },
        onError: (err: Error) => toast.error("Erro: " + err.message)
    });

    const resetForm = () => {
        setKind("RIFA");
        setLabel("");
        setAmount("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label || !amount) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        mutation.mutate({
            graduation_id: graduationId,
            kind,
            reference_label: label,
            amount: parseFloat(amount),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Criar Cobrança Global (Todas as Turmas)</DialogTitle>
                </DialogHeader>

                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex gap-3 text-amber-800 text-sm mb-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p>Esta cobrança será aplicada a <strong>todos os alunos ativos</strong> de todas as turmas desta formatura.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Tipo de Cobrança</Label>
                        <Select value={kind} onValueChange={(v) => setKind(v as ObligationKind)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RIFA">Rifa</SelectItem>
                                <SelectItem value="BINGO">Bingo</SelectItem>
                                <SelectItem value="OUTROS">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Nome/Referência (ex: Rifa Agosto)</Label>
                        <Input
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="Identificação da cobrança"
                            required
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>Valor (R$)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0,00"
                            required
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Gerar Cobrança Global
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
