import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { graduationService, GraduationStudent, GraduationInstallment, GraduationInstallmentStatus } from "@/features/graduations/services/graduationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
    Users,
    Plus,
    Loader2,
    ChevronLeft,
    Download,
    FileText,
    UserPlus,
    UserCheck,
    UserMinus,
    CheckCircle2,
    XCircle,
    Clock,
    CircleOff,
    Table as TableIcon,
    Upload
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/shared/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { graduationPdfUtils } from "@/features/graduations/lib/graduationPdfUtils";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

export default function ClassDetailPage() {
    const { slug, classSlug } = useParams<{ slug: string, classSlug: string }>();
    const queryClient = useQueryClient();
    const [openAddStudent, setOpenAddStudent] = useState(false);
    const [openImportExcel, setOpenImportExcel] = useState(false);
    const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<GraduationStudent | null>(null);
    const [selectedInstallment, setSelectedInstallment] = useState<GraduationInstallment | null>(null);

    // Queries
    // Queries
    const { data: graduation, isLoading: loadingGrad } = useQuery({
        queryKey: ["graduation", slug],
        queryFn: () => graduationService.getGraduationBySlug(slug!),
        enabled: !!slug,
    });

    const { data: currentClass, isLoading: loadingClass } = useQuery({
        queryKey: ["class", graduation?.id, classSlug],
        queryFn: () => graduationService.getClassBySlug(graduation!.id, classSlug!),
        enabled: !!graduation?.id && !!classSlug,
    });

    const classId = currentClass?.id;

    const { data: students, isLoading: loadingStudents } = useQuery({
        queryKey: ["class-students", classId],
        queryFn: () => graduationService.getStudentsByClass(classId!),
        enabled: !!classId,
    });

    const { data: installmentsGrid } = useQuery({
        queryKey: ["class-installments", classId],
        queryFn: async () => {
            if (!students) return {};
            const grid: Record<string, GraduationInstallment[]> = {};
            await Promise.all(students.map(async (s) => {
                grid[s.id] = await graduationService.getInstallments(s.id);
            }));
            return grid;
        },
        enabled: !!students && students.length > 0,
    });

    useEffect(() => {
        if (currentClass && graduation) {
            document.title = `${graduation.name} - ${currentClass.name} | CMCB-XI`;
        } else if (currentClass) {
            document.title = `${currentClass.name} | CMCB-XI`;
        } else {
            document.title = "Turma | CMCB-XI";
        }
        return () => { document.title = "CMCB-XI"; };
    }, [currentClass, graduation]);

    // Mutations
    const mutationCreateStudent = useMutation({
        mutationFn: async (name: string) => {
            const student = await graduationService.createStudent({ class_id: classId!, name });
            await graduationService.generateCarnetForStudent(student.id);
            return student;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
            toast.success("Aluno cadastrado e carnê gerado!");
            setOpenAddStudent(false);
        },
        onError: (error: any) => toast.error(`Erro: ${error.message}`),
    });

    const mutationToggleStudent = useMutation({
        mutationFn: ({ id, active }: { id: string, active: boolean }) => graduationService.toggleStudentActivation(id, active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
            toast.success("Status do aluno atualizado!");
        },
    });

    const mutationUpdatePayment = useMutation({
        mutationFn: ({ id, status, params }: any) => graduationService.updateInstallmentStatus(id, status, params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["class-installments", classId] });
            queryClient.invalidateQueries({ queryKey: ["graduation-summary", graduation?.id] });
            // Remove selection only if it was a manual update from dialog
            // No toast here to keep it fast, or a very subtle one
        },
    });

    const mutationBulkPayment = useMutation({
        mutationFn: ({ installmentNumber, status }: { installmentNumber: number, status: GraduationInstallmentStatus }) =>
            graduationService.bulkUpdateInstallmentStatus(classId!, installmentNumber, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["class-installments", classId] });
            queryClient.invalidateQueries({ queryKey: ["graduation-summary", graduation?.id] });
            toast.success("Mês atualizado com sucesso!");
        },
        onError: (error: any) => toast.error(`Erro ao atualizar turma: ${error.message}`),
    });

    const mutationImportExcel = useMutation({
        mutationFn: (file: File) => graduationService.importStudentsFromExcel(classId!, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["class-students", classId] });
            toast.success(`${data.count} alunos importados com sucesso!`);
            setOpenImportExcel(false);
        },
        onError: (error: any) => toast.error(`Erro na importação: ${error.message}`),
    });

    if (loadingGrad || loadingClass || loadingStudents) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground animate-pulse">Carregando alunos e parcelas...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const handleExportTreasurer = () => {
        if (!graduation || !currentClass || !students || !installmentsGrid) return;
        graduationPdfUtils.generateTreasurerControl(
            graduation,
            currentClass.name,
            students,
            installmentsGrid
        );
    };

    const handleExportCarnet = (student: GraduationStudent) => {
        if (!graduation || !installmentsGrid) return;
        const installments = installmentsGrid[student.id];
        if (!installments || installments.length === 0) {
            toast.error("Carnê ainda não gerado para este aluno.");
            return;
        }
        graduationPdfUtils.generateStudentCarnet(graduation, student, installments);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <header className="flex flex-col gap-4">
                    <Link to={`/formaturas/${graduation?.slug}`} className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para {graduation?.name}
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{currentClass?.name}</h1>
                            <p className="text-muted-foreground">Gestão de alunos e carnês da turma</p>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => setOpenAddStudent(true)} className="gap-2">
                                <UserPlus className="h-4 w-4" /> Novo Aluno
                            </Button>
                            <Button onClick={() => setOpenImportExcel(true)} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                                <Upload className="h-4 w-4" /> Importar Excel
                            </Button>
                            <Button onClick={handleExportTreasurer} variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                                <Download className="h-4 w-4" /> Controle PDF
                            </Button>
                        </div>
                    </div>
                </header>

                <Tabs defaultValue="students" className="w-full">
                    <TabsList className="mb-4 bg-muted/50 p-1">
                        <TabsTrigger value="students" className="gap-2">
                            <Users className="h-4 w-4" /> Alunos
                        </TabsTrigger>
                        <TabsTrigger value="grid" className="gap-2">
                            <TableIcon className="h-4 w-4" /> Grade do Tesoureiro
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="students">
                        <Card className="border-none glass-card">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students?.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium">{student.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={student.active ? "default" : "secondary"} className={student.active ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                                                        {student.active ? "Ativo" : "Inativo"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary hover:text-primary hover:bg-primary/5"
                                                        onClick={() => handleExportCarnet(student)}
                                                    >
                                                        <FileText className="h-4 w-4 mr-1" /> Carnê
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={student.active ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                                                        onClick={() => mutationToggleStudent.mutate({ id: student.id, active: !student.active })}
                                                    >
                                                        {student.active ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {students?.length === 0 && (
                                    <div className="py-12 text-center text-muted-foreground">
                                        Nenhum aluno cadastrado nesta turma.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="grid">
                        <Card className="border-none glass-card overflow-x-auto">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-card/80 backdrop-blur-sm z-10 min-w-[150px]">Aluno</TableHead>
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <TableHead key={i} className="text-center p-2">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs font-bold">P{i + 1}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-[8px] hover:bg-primary/10 hover:text-primary transition-all"
                                                            title="Marcar todos como pago"
                                                            onClick={() => mutationBulkPayment.mutate({ installmentNumber: i + 1, status: 'PAGO' })}
                                                        >
                                                            <CheckCircle2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students?.map((student) => {
                                            const studentInstallments = installmentsGrid?.[student.id] || [];
                                            return (
                                                <TableRow key={student.id}>
                                                    <TableCell className="sticky left-0 bg-card/80 backdrop-blur-sm z-10 font-medium">
                                                        {student.name}
                                                    </TableCell>
                                                    {Array.from({ length: 12 }, (_, i) => {
                                                        const ins = studentInstallments.find(inc => inc.installment_number === i + 1);
                                                        if (!ins) return <TableCell key={i} className="text-center text-muted">-</TableCell>;
                                                        return (
                                                            <TableCell key={i} className="text-center">
                                                                <button
                                                                    onClick={() => {
                                                                        const newStatus = ins.status === 'PAGO' ? 'EM_ABERTO' : 'PAGO';
                                                                        mutationUpdatePayment.mutate({ id: ins.id, status: newStatus });
                                                                    }}
                                                                    onContextMenu={(e) => {
                                                                        e.preventDefault();
                                                                        setSelectedStudentForPayment(student);
                                                                        setSelectedInstallment(ins);
                                                                    }}
                                                                    className={cn(
                                                                        "w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-125 hover:shadow-md",
                                                                        ins.status === 'PAGO' ? "bg-emerald-500 text-white shadow-sm" :
                                                                            ins.status === 'ISENTO' ? "bg-blue-500 text-white" :
                                                                                ins.status === 'CANCELADO' ? "bg-slate-300 text-white" :
                                                                                    "bg-white text-slate-300 border-2 border-slate-100 hover:border-amber-200"
                                                                    )}
                                                                >
                                                                    {ins.status === 'PAGO' ? <CheckCircle2 className="h-4 w-4" /> :
                                                                        ins.status === 'ISENTO' ? <CircleOff className="h-3 w-3" /> :
                                                                            ins.status === 'CANCELADO' ? <XCircle className="h-4 w-4" /> :
                                                                                null}
                                                                </button>
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <div className="mt-4 flex gap-4 text-xs text-muted-foreground justify-center">
                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Pago</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Em Aberto</span>
                            <span className="flex items-center gap-1"><CircleOff className="h-3 w-3 text-blue-500" /> Isento</span>
                            <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-slate-400" /> Cancelado</span>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Add Student Dialog */}
                <AddStudentDialog
                    open={openAddStudent}
                    onOpenChange={setOpenAddStudent}
                    onSubmit={(name) => mutationCreateStudent.mutate(name)}
                    isLoading={mutationCreateStudent.isPending}
                />

                {/* Import Excel Dialog */}
                <ImportExcelDialog
                    open={openImportExcel}
                    onOpenChange={setOpenImportExcel}
                    onImport={(file) => mutationImportExcel.mutate(file)}
                    isLoading={mutationImportExcel.isPending}
                />

                {/* Payment Detail Dialog */}
                {selectedInstallment && (
                    <PaymentDialog
                        open={!!selectedInstallment}
                        onOpenChange={(open) => !open && setSelectedInstallment(null)}
                        studentName={selectedStudentForPayment?.name || ""}
                        installment={selectedInstallment}
                        onSubmit={(status, params) => mutationUpdatePayment.mutate({ id: selectedInstallment.id, status, params })}
                        isLoading={mutationUpdatePayment.isPending}
                    />
                )}
            </div>
        </DashboardLayout>
    );
}

function AddStudentDialog({ open, onOpenChange, onSubmit, isLoading }: any) {
    const [name, setName] = useState("");
    const handleS = (e: any) => {
        e.preventDefault();
        onSubmit(name);
        setName("");
    };
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Cadastrar Novo Aluno</DialogTitle></DialogHeader>
                <form onSubmit={handleS} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label>Nome Completo</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Silva Santos" required />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        Nota: Ao cadastrar, o carnê será gerado automaticamente com base na configuração atual da formatura.
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Cadastrar e Gerar Carnê"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PaymentDialog({ open, onOpenChange, studentName, installment, onSubmit, isLoading }: any) {
    const [status, setStatus] = useState<any>(installment.status);
    const [method, setMethod] = useState<any>(installment.pay_method || "pix");
    const [notes, setNotes] = useState(installment.notes || "");

    const handleS = (e: any) => {
        e.preventDefault();
        onSubmit(status, { pay_method: method, notes });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Parcela #{installment.installment_number} - {studentName}</DialogTitle>
                </DialogHeader>
                <div className="pt-4 flex flex-col gap-4">
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <span className="text-sm font-medium">Vencimento: {new Date(installment.due_date).toLocaleDateString()}</span>
                        <span className="text-lg font-bold text-primary">{formatCurrencyBRL(installment.value)}</span>
                    </div>

                    <form onSubmit={handleS} className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EM_ABERTO">EM ABERTO</SelectItem>
                                    <SelectItem value="PAGO">PAGO</SelectItem>
                                    <SelectItem value="ISENTO">ISENTO</SelectItem>
                                    <SelectItem value="CANCELADO">CANCELADO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {status === 'PAGO' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Forma de Pagamento</Label>
                                <Select value={method} onValueChange={setMethod}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pix">PIX</SelectItem>
                                        <SelectItem value="cash">DINHEIRO</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label>Observações</Label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Opcional..."
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar Alterações"}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ImportExcelDialog({ open, onOpenChange, onImport, isLoading }: any) {
    const [file, setFile] = useState<File | null>(null);

    const handleS = (e: any) => {
        e.preventDefault();
        if (file) onImport(file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Importar Alunos via Excel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleS} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label>Selecione o arquivo (.xlsx)</Label>
                        <Input
                            type="file"
                            accept=".xlsx"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            required
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                            O arquivo deve conter os nomes dos alunos na **primeira coluna**.
                            O sistema irá pular a primeira linha se ela contiver "Nome".
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading || !file}>
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Iniciar Importação"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
