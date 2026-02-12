import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graduationModuleService, StudentObligation } from "@/services/graduationModuleService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Undo2, Calendar as CalendarIcon, User, PencilLine } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface Props {
    studentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StudentFinancialDialog({ studentId, open, onOpenChange }: Props) {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const [confirmingPayment, setConfirmingPayment] = useState<StudentObligation | null>(null);
    const [paymentDetails, setPaymentDetails] = useState({
        paid_at: new Date().toISOString().split('T')[0],
        received_by: profile?.name || "",
        signature: ""
    });


    const { data: obligations, isLoading } = useQuery({
        queryKey: ["student-obligations", studentId],
        queryFn: () => graduationModuleService.getStudentObligations(studentId!),
        enabled: !!studentId && open
    });

    const mutationPay = useMutation({
        mutationFn: (data: { id: string, details: any }) =>
            graduationModuleService.markObligationPaid(data.id, data.details),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-obligations"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            toast.success("Pagamento registrado!");
            setConfirmingPayment(null);
        },
        onError: (err) => toast.error("Erro: " + err.message)
    });

    const mutationRevert = useMutation({
        mutationFn: (id: string) => graduationModuleService.revertObligationToOpen(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student-obligations"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            toast.success("Pagamento estornado!");
        },
        onError: (err) => toast.error("Erro: " + err.message)
    });

    const handleConfirmPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmingPayment) return;
        mutationPay.mutate({
            id: confirmingPayment.id,
            details: paymentDetails
        });
    };

    return (
        <>
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
                                            <TableCell className="font-medium">{obs.reference_label}</TableCell>
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
                                                        onClick={() => {
                                                            setConfirmingPayment(obs);
                                                            setPaymentDetails(prev => ({ ...prev, received_by: profile?.name || "" }));
                                                        }}
                                                    >
                                                        <Check className="h-3 w-3 mr-1" /> Receber
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm("Deseja estornar esse pagamento?")) {
                                                                mutationRevert.mutate(obs.id);
                                                            }
                                                        }}
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

            {/* Modal de Confirmação de Pagamento */}
            <Dialog open={!!confirmingPayment} onOpenChange={(o) => !o && setConfirmingPayment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Recebimento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleConfirmPayment} className="space-y-4 py-4">
                        <div className="bg-muted/50 p-3 rounded-md mb-4 text-sm">
                            <p><strong>Item:</strong> {confirmingPayment?.reference_label}</p>
                            <p><strong>Valor:</strong> {confirmingPayment ? formatCurrencyBRL(confirmingPayment.amount) : ""}</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="paid_at">Data de Pagamento</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="paid_at"
                                    type="date"
                                    className="pl-8"
                                    value={paymentDetails.paid_at}
                                    onChange={e => setPaymentDetails(p => ({ ...p, paid_at: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="received_by">Recebido por</Label>
                            <div className="relative">
                                <User className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="received_by"
                                    className="pl-8"
                                    value={paymentDetails.received_by}
                                    onChange={e => setPaymentDetails(p => ({ ...p, received_by: e.target.value }))}
                                    placeholder="Nome do tesoureiro/responsável"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="signature">Assinatura / Observação</Label>
                            <div className="relative">
                                <PencilLine className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="signature"
                                    className="pl-8"
                                    value={paymentDetails.signature}
                                    onChange={e => setPaymentDetails(p => ({ ...p, signature: e.target.value }))}
                                    placeholder="Texto livre ou observação"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setConfirmingPayment(null)}>Cancelar</Button>
                            <Button type="submit" disabled={mutationPay.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                                {mutationPay.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                                Confirmar Pagamento
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
