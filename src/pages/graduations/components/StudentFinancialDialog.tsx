import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graduationModuleService } from "@/services/graduationModuleService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, Undo2 } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
    studentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StudentFinancialDialog({ studentId, open, onOpenChange }: Props) {
    const queryClient = useQueryClient();

    const { data: obligations, isLoading } = useQuery({
        queryKey: ["student-obligations", studentId],
        queryFn: () => graduationModuleService.getStudentObligations(studentId!),
        enabled: !!studentId && open
    });

    const mutationPay = useMutation({
        mutationFn: (id: string) => graduationModuleService.markObligationPaid(id, {
            paid_at: new Date().toISOString(),
            received_by: "Sistema (Admin)", // TODO: Get logged user name from auth context if available
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-obligations"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] }); // Update summary
            toast.success("Pagamento registrado!");
        },
        onError: (err) => toast.error("Erro: " + err.message)
    });

    const mutationRevert = useMutation({
        mutationFn: (id: string) => graduationModuleService.revertObligationToOpen(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-obligations"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] });
            toast.success("Pagamento estornado!");
        },
        onError: (err) => toast.error("Erro: " + err.message)
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Financeiro do Aluno</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="border rounded-md max-h-[60vh] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Referência</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {obligations?.length === 0 && (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma obrigação gerada.</TableCell></TableRow>
                                )}
                                {obligations?.map(obs => (
                                    <TableRow key={obs.id}>
                                        <TableCell>{obs.reference_label}</TableCell>
                                        <TableCell>{obs.due_date ? new Date(obs.due_date).toLocaleDateString() : "-"}</TableCell>
                                        <TableCell>{formatCurrencyBRL(obs.amount)}</TableCell>
                                        <TableCell>
                                            <Badge variant={obs.status === 'PAGO' ? 'default' : 'outline'} className={cn(
                                                obs.status === 'PAGO' ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none" : "text-amber-600 border-amber-200"
                                            )}>
                                                {obs.status === 'PAGO' ? "PAGO" : "EM ABERTO"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {obs.status === 'EM_ABERTO' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                    onClick={() => mutationPay.mutate(obs.id)}
                                                    disabled={mutationPay.isPending}
                                                >
                                                    {mutationPay.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />} Receber
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => mutationRevert.mutate(obs.id)}
                                                    disabled={mutationRevert.isPending}
                                                >
                                                    {mutationRevert.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3 mr-1" />} Estornar
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
