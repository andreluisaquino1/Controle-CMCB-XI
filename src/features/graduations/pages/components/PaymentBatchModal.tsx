
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { graduationModuleService } from "@/features/graduations/services";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";

interface PaymentBatchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classId: string;
    students: { id: string; full_name: string }[];
}

export function PaymentBatchModal({ open, onOpenChange, classId, students }: PaymentBatchModalProps) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [label, setLabel] = useState("");
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: labels, isLoading: isLoadingLabels } = useQuery({
        queryKey: ["open-obligation-labels", classId],
        queryFn: () => graduationModuleService.getOpenObligationLabels(classId),
        enabled: open && !!classId
    });

    const mutation = useMutation({
        mutationFn: (data: { class_id: string; student_ids: string[]; reference_label: string; paid_at: string; received_by: string }) => graduationModuleService.batchMarkObligationsPaid(data),
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            queryClient.invalidateQueries({ queryKey: ["open-obligation-labels"] });
            toast.success(`${count} pagamentos registrados com sucesso!`);
            onOpenChange(false);
            resetForm();
        },
        onError: (err: Error) => toast.error("Erro: " + err.message)
    });

    const resetForm = () => {
        setLabel("");
        setSelectedStudents([]);
        setSearchTerm("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label) {
            toast.error("Selecione a referência do pagamento");
            return;
        }

        if (selectedStudents.length === 0) {
            toast.error("Selecione pelo menos um aluno");
            return;
        }

        mutation.mutate({
            class_id: classId,
            student_ids: selectedStudents,
            reference_label: label,
            paid_at: new Date().toISOString(),
            received_by: user?.email || "Admin",
        });
    };

    const toggleStudent = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleAllVisible = () => {
        const visibleIds = filteredStudents.map(s => s.id);
        const allSelected = visibleIds.every(id => selectedStudents.includes(id));

        if (allSelected) {
            setSelectedStudents(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedStudents(prev => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Baixa de Pagamento em Lote</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Selecione a Prestação em Aberto</Label>
                        {isLoadingLabels ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground h-10 px-3 border rounded-md">
                                <Loader2 className="h-4 w-4 animate-spin" /> Carregando parcelas...
                            </div>
                        ) : (
                            <Select value={label} onValueChange={setLabel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma parcela/referência" />
                                </SelectTrigger>
                                <SelectContent>
                                    {labels?.map(l => (
                                        <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                    {labels?.length === 0 && (
                                        <div className="text-xs text-center py-4 text-muted-foreground">
                                            Nenhuma parcela em aberto encontrada para esta turma.
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        )}
                        <p className="text-[10px] text-muted-foreground">Apenas parcelas com status "EM ABERTO" serão baixadas.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <Label>Selecionar Alunos ({selectedStudents.length})</Label>
                            <div className="flex gap-2">
                                <Button type="button" variant="link" size="sm" onClick={toggleAllVisible} className="h-auto p-0 text-xs">
                                    Visíveis
                                </Button>
                                <Button type="button" variant="link" size="sm" onClick={() => setSelectedStudents(students.map(s => s.id))} className="h-auto p-0 text-xs text-blue-600">
                                    Todos
                                </Button>
                                <Button type="button" variant="link" size="sm" onClick={() => setSelectedStudents([])} className="h-auto p-0 text-xs text-muted-foreground">
                                    Nenhum
                                </Button>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar alunos..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>

                        <div className="border rounded-md p-2 max-h-60 overflow-y-auto space-y-2 bg-muted/20">
                            {filteredStudents.map(s => (
                                <div key={s.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded transition-colors">
                                    <Checkbox
                                        id={`pay-st-${s.id}`}
                                        checked={selectedStudents.includes(s.id)}
                                        onCheckedChange={() => toggleStudent(s.id)}
                                    />
                                    <Label htmlFor={`pay-st-${s.id}`} className="text-sm font-normal flex-1 cursor-pointer py-1">
                                        {s.full_name}
                                    </Label>
                                </div>
                            ))}
                            {filteredStudents.length === 0 && (
                                <p className="text-center text-xs text-muted-foreground py-4">Nenhum aluno encontrado.</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={mutation.isPending || !labels || labels.length === 0 || !label || selectedStudents.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {mutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Confirmar Recebimento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
