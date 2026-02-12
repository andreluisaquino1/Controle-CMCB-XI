import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ObligationKind, graduationModuleService } from "@/services/graduationModuleService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ChargeBatchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    graduationId: string;
    classId: string;
    students: { id: string; full_name: string }[];
}

export function ChargeBatchModal({ open, onOpenChange, graduationId, classId, students }: ChargeBatchModalProps) {
    const queryClient = useQueryClient();
    const [kind, setKind] = useState<ObligationKind>("RIFA");
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [targetType, setTargetType] = useState<"ALL" | "SELECT">("ALL");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const mutation = useMutation({
        mutationFn: (data: any) => graduationModuleService.createChargeBatch(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            toast.success("Cobranças criadas com sucesso!");
            onOpenChange(false);
            resetForm();
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const resetForm = () => {
        setKind("RIFA");
        setLabel("");
        setAmount("");
        setTargetType("ALL");
        setSelectedStudents([]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label || !amount) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        const ids = targetType === "ALL" ? students.map(s => s.id) : selectedStudents;
        if (ids.length === 0) {
            toast.error("Selecione pelo menos um aluno");
            return;
        }

        mutation.mutate({
            graduation_id: graduationId,
            class_id: classId,
            student_ids: ids,
            kind,
            reference_label: label,
            amount: parseFloat(amount),
        });
    };

    const toggleStudent = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Criar Cobrança em Lote</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Tipo de Cobrança</Label>
                        <Select value={kind} onValueChange={(v: any) => setKind(v)}>
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

                    <div className="grid gap-2">
                        <Label>Aplicar para</Label>
                        <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os alunos ativos</SelectItem>
                                <SelectItem value="SELECT">Selecionar alunos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {targetType === "SELECT" && (
                        <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-2">
                            {students.map(s => (
                                <div key={s.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`st-${s.id}`}
                                        checked={selectedStudents.includes(s.id)}
                                        onCheckedChange={() => toggleStudent(s.id)}
                                    />
                                    <Label htmlFor={`st-${s.id}`} className="text-sm font-normal cursor-pointer">
                                        {s.full_name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Criar Cobranças
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
