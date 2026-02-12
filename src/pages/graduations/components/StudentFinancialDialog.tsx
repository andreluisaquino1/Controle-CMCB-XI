import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graduationModuleService, StudentObligation } from "@/services/graduations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Undo2, Calendar as CalendarIcon, User, PencilLine, AlertCircle, BadgeDollarSign, Wallet } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateString, formatDateBR } from "@/lib/date-utils";


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
        paid_at: formatDateString(new Date()),
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

    const totalPaid = obligations?.filter(o => o.status === 'PAGO').reduce((acc, o) => acc + Number(o.amount), 0) || 0;
    const totalOpen = obligations?.filter(o => o.status === 'EM_ABERTO').reduce((acc, o) => acc + Number(o.amount), 0) || 0;
    const totalGeral = (obligations || []).reduce((acc, o) => acc + Number(o.amount), 0);
    const hasOverdue = obligations?.some(o => o.status === 'EM_ABERTO' && o.due_date && new Date(o.due_date) < new Date());

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Extrato Financeiro do Aluno
                        </DialogTitle>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100">
                                    <CardContent className="p-3">
                                        <p className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Total Pago</p>
                                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{formatCurrencyBRL(totalPaid)}</p>
                                    </CardContent>
                                </Card>
                                <Card className={cn("border-amber-100", hasOverdue ? "bg-rose-50 dark:bg-rose-950/20 border-rose-100" : "bg-amber-50 dark:bg-amber-950/20")}>
                                    <CardContent className="p-3">
                                        <p className={cn("text-[10px] uppercase font-bold mb-1", hasOverdue ? "text-rose-600" : "text-amber-600")}>
                                            Total em Aberto {hasOverdue && "(Com Atraso)"}
                                        </p>
                                        <p className={cn("text-lg font-bold", hasOverdue ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400")}>
                                            {formatCurrencyBRL(totalOpen)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200">
                                    <CardContent className="p-3">
                                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Geral</p>
                                        <p className="text-lg font-bold text-slate-700 dark:text-slate-300">{formatCurrencyBRL(totalGeral)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[40%]">Parcela / Referência</TableHead>
                                            <TableHead>Vencimento</TableHead>
                                            <TableHead>Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {obligations?.length === 0 && (
                                            <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Nenhuma obrigação gerada para este aluno.</TableCell></TableRow>
                                        )}
                                        {obligations?.map(obs => {
                                            const today = formatDateString(new Date());
                                            const isOverdue = obs.status === 'EM_ABERTO' && obs.due_date && obs.due_date < today;
                                            return (
                                                <TableRow key={obs.id} className={cn(
                                                    "transition-colors",
                                                    obs.status === 'PAGO' ? "bg-emerald-50/30 hover:bg-emerald-50/50" : isOverdue ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-muted/30"
                                                )}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {obs.status === 'PAGO' ? (
                                                                <div className="p-1 rounded-full bg-emerald-100 text-emerald-600"><Check className="h-3 w-3" /></div>
                                                            ) : isOverdue ? (
                                                                <div className="p-1 rounded-full bg-rose-100 text-rose-600"><AlertCircle className="h-3 w-3" /></div>
                                                            ) : (
                                                                <div className="p-1 rounded-full bg-amber-100 text-amber-600"><BadgeDollarSign className="h-3 w-3" /></div>
                                                            )}
                                                            {obs.reference_label}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className={cn(isOverdue && "text-rose-600 font-semibold")}>
                                                        {formatDateBR(obs.due_date)}
                                                    </TableCell>
                                                    <TableCell className="font-semibold">{formatCurrencyBRL(obs.amount)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={obs.status === 'PAGO' ? 'default' : 'outline'} className={cn(
                                                            "font-bold text-[10px]",
                                                            obs.status === 'PAGO'
                                                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none px-2 py-0"
                                                                : isOverdue
                                                                    ? "bg-rose-100 text-rose-800 border-none px-2 py-0"
                                                                    : "text-amber-600 border-amber-200 px-2 py-0"
                                                        )}>
                                                            {obs.status === 'PAGO' ? "PAGO" : isOverdue ? "ATRASADO" : "EM ABERTO"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {obs.status === 'EM_ABERTO' ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs font-bold"
                                                                onClick={() => {
                                                                    setConfirmingPayment(obs);
                                                                    setPaymentDetails(prev => ({ ...prev, received_by: profile?.name || "" }));
                                                                }}
                                                            >
                                                                RECEBER
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 text-muted-foreground hover:text-destructive text-xs"
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
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
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
