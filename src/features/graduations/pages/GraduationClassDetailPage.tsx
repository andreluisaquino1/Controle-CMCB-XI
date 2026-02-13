import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { graduationModuleService } from "@/features/graduations/services";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ChevronLeft, User, FileText, BadgeDollarSign, Wallet, Download, UserX, Calculator, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { StudentFinancialDialog } from "./components/StudentFinancialDialog";
import { PaymentBatchModal } from "./components/PaymentBatchModal";
import { StudentForm } from "./components/StudentForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Progress } from "@/shared/ui/progress";
import { Badge } from "@/shared/ui/badge";
import { generateCarnetsByInstallmentPDF, generateTreasurerControlPDF } from "@/features/graduations/lib/graduationPdf";


export default function GraduationClassDetailPage() {
    const { slug, classSlug } = useParams();
    const queryClient = useQueryClient();
    const [openStudent, setOpenStudent] = useState(false);
    const [openPaymentBatch, setOpenPaymentBatch] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);

    // 1. Get Graduation
    const { data: graduation } = useQuery({
        queryKey: ["graduation-module", slug],
        queryFn: () => graduationModuleService.getGraduationBySlug(slug!),
        enabled: !!slug,
    });

    // 2. Get Class
    const { data: classData, isLoading: loadingClass } = useQuery({
        queryKey: ["graduation-class", slug, classSlug],
        queryFn: async () => {
            if (!graduation) return null;
            return graduationModuleService.getClassBySlug(graduation.id, classSlug!);
        },
        enabled: !!classSlug && !!graduation
    });

    const classId = classData?.id;

    // 3. Get Students
    const { data: students, isLoading: loadingStudents } = useQuery({
        queryKey: ["graduation-students", classId],
        queryFn: () => graduationModuleService.listStudents(classId!),
        enabled: !!classId
    });

    // 4. Get Progress
    const { data: progress } = useQuery({
        queryKey: ["graduation-students-progress", classId],
        queryFn: () => graduationModuleService.getStudentsProgress(classId!),
        enabled: !!classId
    });

    // 5. Get Config
    const { data: config } = useQuery({
        queryKey: ["graduation-config", graduation?.id],
        queryFn: () => graduationModuleService.getCurrentConfig(graduation!.id),
        enabled: !!graduation?.id
    });

    const mutationImport = useMutation({
        mutationFn: ({ classId, file }: { classId: string, file: File }) => graduationModuleService.importStudentsFromExcel(classId, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            if (data.count > 0) toast.success(`${data.count} alunos importados!`);
            setImporting(false);
        },
        onError: (err: Error) => {
            toast.error("Erro na importação: " + err.message);
            setImporting(false);
        }
    });

    const mutationStudent = useMutation({
        mutationFn: (name: string) => graduationModuleService.createStudent(classId!, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students"] });
            toast.success("Aluno adicionado!");
            setOpenStudent(false);
        },
        onError: (err: Error) => toast.error("Erro: " + err.message)
    });

    const mutationInactivate = useMutation({
        mutationFn: (id: string) => graduationModuleService.inactivateStudent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students"] });
            toast.success("Aluno inativado!");
        },
        onError: (err: Error) => toast.error("Erro: " + err.message)
    });

    const mutationGenerate = useMutation({
        mutationFn: () => graduationModuleService.generateInstallmentsBatch(classId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            toast.success("Prestações geradas com sucesso!");
        },
        onError: (err: Error) => toast.error("Erro: " + err.message)
    });

    const mutationDeleteStudents = useMutation({
        mutationFn: () => graduationModuleService.deleteAllStudentsFromClass(classId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            toast.success("Todos os alunos foram removidos com sucesso!");
        },
        onError: (err: Error) => toast.error("Erro ao remover alunos: " + err.message)
    });

    const handleExportCarnets = async () => {
        if (!config || !students || students.length === 0) {
            toast.error("Dados insuficientes para gerar carnês. Verifique se a turma possui alunos e se a configuração financeira foi salva.");
            return;
        }

        const toastId = toast.loading("Gerando carnês em PDF...");
        try {
            await generateCarnetsByInstallmentPDF({
                graduation: { name: graduation!.name, year: graduation!.year },
                class: { name: classData!.name },
                config: {
                    installment_value: config.installment_value,
                    installments_count: config.installments_count,
                    due_day: config.due_day,
                    start_month: config.start_month
                },
                students: students.map(s => ({ id: s.id, full_name: s.full_name, guardian_name: s.guardian_name }))
            });
            toast.success("Carnês gerados com sucesso!", { id: toastId });
        } catch (error) {
            console.error("Erro ao gerar carnês:", error);
            toast.error("Falha ao gerar o arquivo PDF dos carnês.", { id: toastId });
        }
    };

    const handleExportTreasurer = async () => {
        if (!config || !students || students.length === 0) {
            toast.error("Dados insuficientes para gerar o controle. Verifique se a turma possui alunos e se a configuração financeira foi salva.");
            return;
        }

        const toastId = toast.loading("Gerando controle do tesoureiro...");
        try {
            await generateTreasurerControlPDF({
                graduation: { name: graduation!.name, year: graduation!.year },
                class: { name: classData!.name },
                config: {
                    installment_value: config.installment_value,
                    installments_count: config.installments_count,
                    due_day: config.due_day,
                    start_month: config.start_month
                },
                students: students.map(s => ({ id: s.id, full_name: s.full_name, guardian_name: s.guardian_name }))
            });
            toast.success("Controle gerado com sucesso!", { id: toastId });
        } catch (error) {
            console.error("Erro ao gerar controle do tesoureiro:", error);
            toast.error("Falha ao gerar o arquivo PDF de controle.", { id: toastId });
        }
    };

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("TODOS");

    const filteredStudents = students?.filter(s => {
        const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "TODOS" || (statusFilter === "ACTIVE" && s.active); // For now students are mostly active in this view
        return matchesSearch && matchesStatus;
    });

    if (loadingClass || !graduation) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in p-4 md:p-8 pt-6">

                {/* Header */}
                <header className="flex flex-col gap-4">
                    <Button asChild variant="ghost" className="w-fit p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <Link to={`/formaturas/${slug}`} className="flex items-center text-sm">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para Formatura
                        </Link>
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">
                                {classData?.name || "Turma"}
                            </h1>
                            <p className="text-muted-foreground">{graduation.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleExportCarnets} variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                <Download className="h-4 w-4" /> Exportar Carnês (PDF)
                            </Button>
                            <Button onClick={handleExportTreasurer} variant="outline" size="sm" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                                <Download className="h-4 w-4" /> Exportar Controle Tesoureiro
                            </Button>
                            <Button
                                onClick={() => {
                                    if (confirm("ATENÇÃO: Isso apagará PERMANENTEMENTE todos os alunos e seus registros financeiros desta turma. Esta ação não pode ser desfeita. Deseja continuar?")) {
                                        mutationDeleteStudents.mutate();
                                    }
                                }}
                                variant="outline"
                                size="sm"
                                className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
                                disabled={mutationDeleteStudents.isPending}
                            >
                                {mutationDeleteStudents.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                                Zerar Alunos
                            </Button>
                        </div>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-4 items-end justify-between mb-4">
                    <div className="grid gap-2 flex-1 w-full md:max-w-xs">
                        <Label htmlFor="student-search">Buscar Aluno</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="student-search"
                                placeholder="Nome do aluno..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                        <div className="relative">
                            <input
                                id="import-excel-input"
                                title="Importar alunos do Excel"
                                type="file"
                                accept=".xlsx, .xls"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && classId) mutationImport.mutate({ classId, file });
                                    e.target.value = "";
                                }}
                                disabled={importing}
                            />
                            <Button variant="outline" size="sm" className="gap-2" disabled={importing}>
                                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                                Importar Excel
                            </Button>
                        </div>

                        <Button onClick={() => setOpenPaymentBatch(true)} variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                            <BadgeDollarSign className="h-4 w-4" /> Baixa Lote
                        </Button>
                        <Button onClick={() => setOpenStudent(true)} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Novo Aluno
                        </Button>
                    </div>
                </div>

                <Card className="glass-card border-none overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle>Alunos e Financeiro</CardTitle>
                        <CardDescription>Gerencie alunos e acompanhe mensalidades em uma única visão.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6">Aluno</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Progresso Financeiro</TableHead>
                                    <TableHead className="text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents?.map((student) => {
                                    const studentProgress = progress?.[student.id];
                                    const isComplete = studentProgress && studentProgress.paid >= studentProgress.total && studentProgress.total > 0;
                                    return (
                                        <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium pl-6">
                                                <div className="flex items-center gap-2">
                                                    {student.full_name}
                                                    {studentProgress?.hasOverdue && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold uppercase tracking-tighter animate-pulse">Atraso</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">
                                                    ATIVO
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {studentProgress ? (
                                                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                        <div className="flex justify-between items-center text-[10px] uppercase font-bold">
                                                            <span className={isComplete ? "text-emerald-600" : "text-amber-600"}>
                                                                {studentProgress.paid} / {studentProgress.total} pg
                                                            </span>
                                                            <span className="text-muted-foreground">
                                                                {Math.round((studentProgress.paid / studentProgress.total) * 100 || 0)}%
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={(studentProgress.paid / studentProgress.total) * 100}
                                                            className={cn(
                                                                "h-1.5",
                                                                isComplete ? "bg-emerald-100 [&>div]:bg-emerald-500" : "bg-amber-100 [&>div]:bg-amber-500"
                                                            )}
                                                        />
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground italic">Sem parcelas</span>}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => setSelectedStudentId(student.id)} className="h-8 gap-2 border-primary/20 hover:bg-primary/5">
                                                        <Wallet className="h-3.5 w-3.5" /> Detalhes
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm(`Deseja inativar o aluno ${student.full_name}?`)) {
                                                                mutationInactivate.mutate(student.id);
                                                            }
                                                        }}
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredStudents?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                                            Nenhum aluno encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <StudentFinancialDialog
                    open={!!selectedStudentId}
                    onOpenChange={(open) => !open && setSelectedStudentId(null)}
                    studentId={selectedStudentId}
                />



                {classId && students && (
                    <PaymentBatchModal
                        open={openPaymentBatch}
                        onOpenChange={setOpenPaymentBatch}
                        classId={classId}
                        students={students.map(s => ({ id: s.id, full_name: s.full_name }))}
                    />
                )}

                <Dialog open={openStudent} onOpenChange={setOpenStudent}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Novo Aluno</DialogTitle></DialogHeader>
                        <StudentForm onSubmit={mutationStudent.mutate} isLoading={mutationStudent.isPending} />
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
