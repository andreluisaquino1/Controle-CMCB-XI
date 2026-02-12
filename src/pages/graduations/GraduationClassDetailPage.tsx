import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { graduationModuleService } from "@/services/graduationModuleService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ChevronLeft, User, FileText, BadgeDollarSign, Wallet, Download, UserX, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentFinancialDialog } from "./components/StudentFinancialDialog";
import { ChargeBatchModal } from "./components/ChargeBatchModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { generateCarnetsByInstallmentPDF, generateTreasurerControlPDF } from "@/lib/graduationPdf";


export default function GraduationClassDetailPage() {
    const { slug, classSlug } = useParams();
    const queryClient = useQueryClient();
    const [openStudent, setOpenStudent] = useState(false);
    const [openChargeBatch, setOpenChargeBatch] = useState(false);
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
        onError: (err: any) => {
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
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationInactivate = useMutation({
        mutationFn: (id: string) => graduationModuleService.inactivateStudent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students"] });
            toast.success("Aluno inativado!");
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationGenerate = useMutation({
        mutationFn: () => graduationModuleService.generateInstallmentsBatch(classId!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
            toast.success("Prestações geradas com sucesso!");
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const handleExportCarnets = () => {
        if (!config || !students) return;
        generateCarnetsByInstallmentPDF({
            graduation: { name: graduation!.name, year: graduation!.year },
            class: { name: classData!.name },
            config: {
                installment_value: config.installment_value,
                installments_count: config.installments_count,
                due_day: config.due_day
            },
            students: students.map(s => ({ id: s.id, full_name: s.full_name }))
        });
    };

    const handleExportTreasurer = () => {
        if (!config || !students) return;
        generateTreasurerControlPDF({
            graduation: { name: graduation!.name, year: graduation!.year },
            class: { name: classData!.name },
            config: {
                installment_value: config.installment_value,
                installments_count: config.installments_count,
                due_day: config.due_day
            },
            students: students.map(s => ({ id: s.id, full_name: s.full_name }))
        });
    };

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
                        </div>
                    </div>
                </header>

                <Tabs defaultValue="students" className="space-y-4">
                    <TabsList className="bg-muted/50 p-1">
                        <TabsTrigger value="students" className="gap-2">
                            <User className="h-4 w-4" /> Alunos
                        </TabsTrigger>
                        <TabsTrigger value="finance" className="gap-2">
                            <BadgeDollarSign className="h-4 w-4" /> Controle Financeiro
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="students">
                        <Card className="glass-card border-none">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Alunos</CardTitle>
                                    <CardDescription>Gerencie a listagem de alunos da turma.</CardDescription>
                                </div>
                                <div className="flex gap-2">
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
                                    <Button onClick={() => setOpenStudent(true)} size="sm" className="gap-2">
                                        <Plus className="h-4 w-4" /> Novo Aluno
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
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
                                                <TableCell className="font-medium">{student.full_name}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                        Ativo
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-destructive"
                                                        onClick={() => {
                                                            if (confirm(`Deseja inativar o aluno ${student.full_name}?`)) {
                                                                mutationInactivate.mutate(student.id);
                                                            }
                                                        }}
                                                    >
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="finance">
                        <Card className="glass-card border-none">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Controle Financeiro</CardTitle>
                                    <CardDescription>Acompanhe mensalidades e cobranças extras.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => mutationGenerate.mutate()} variant="outline" size="sm" className="gap-2">
                                        <Calculator className="h-4 w-4" /> Gerar Prestações
                                    </Button>
                                    <Button onClick={() => setOpenChargeBatch(true)} variant="default" size="sm" className="gap-2">
                                        <Plus className="h-4 w-4" /> Criar Cobrança
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Aluno</TableHead>
                                            <TableHead>Progresso Mensabilidades</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students?.map((student) => {
                                            const studentProgress = progress?.[student.id];
                                            const isComplete = studentProgress && studentProgress.paid >= studentProgress.total && studentProgress.total > 0;
                                            return (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.full_name}</TableCell>
                                                    <TableCell>
                                                        {studentProgress ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className={cn("text-xs font-bold", isComplete ? "text-emerald-600" : "text-amber-600")}>
                                                                    {studentProgress.paid} / {studentProgress.total} pg
                                                                </span>
                                                                <Progress
                                                                    value={(studentProgress.paid / studentProgress.total) * 100}
                                                                    className="h-1.5 w-32"
                                                                />
                                                            </div>
                                                        ) : <span className="text-xs text-muted-foreground italic">Sem parcelas</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="outline" size="sm" onClick={() => setSelectedStudentId(student.id)}>
                                                            <Wallet className="h-4 w-4 mr-2" /> Detalhes
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <StudentFinancialDialog
                    open={!!selectedStudentId}
                    onOpenChange={(open) => !open && setSelectedStudentId(null)}
                    studentId={selectedStudentId}
                />

                {classId && graduation && students && (
                    <ChargeBatchModal
                        open={openChargeBatch}
                        onOpenChange={setOpenChargeBatch}
                        graduationId={graduation.id}
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

function StudentForm({ onSubmit, isLoading }: any) {
    const [name, setName] = useState("");
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(name); }} className="space-y-4">
            <div className="grid gap-2">
                <Label>Nome Completo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do aluno" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Cadastrar Aluno"}</Button>
        </form>
    );
}
