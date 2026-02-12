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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ChevronLeft, User, FileText, BadgeDollarSign, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentFinancialDialog } from "./components/StudentFinancialDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";


export default function GraduationClassDetailPage() {
    const { slug, classSlug } = useParams();
    const classId = classSlug; // As agreed, classSlug is actually the ID
    const queryClient = useQueryClient();
    const [openStudent, setOpenStudent] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    // 1. Get Graduation (for context)
    const { data: graduation } = useQuery({
        queryKey: ["graduation-module", slug],
        queryFn: () => graduationModuleService.getGraduationBySlug(slug!),
        enabled: !!slug,
    });

    // 2. Get Class
    const { data: classData, isLoading: loadingClass } = useQuery({
        queryKey: ["graduation-class", classId],
        queryFn: async () => {
            if (!graduation) return null;
            // Fetch list and find (requires graduation to be loaded)
            const classes = await graduationModuleService.listClasses(graduation.id);
            return classes.find(c => c.id === classId);
        },
        enabled: !!classId && !!graduation
    });

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

    const mutationStudent = useMutation({
        mutationFn: (name: string) => graduationModuleService.createStudent(classId!, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-students"] });
            toast.success("Aluno adicionado!");
            setOpenStudent(false);
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationGenerate = useMutation({
        mutationFn: () => graduationModuleService.generateInstallmentsBatch(classId!),
        onSuccess: () => {
            toast.success("Parcelas geradas com sucesso para todos os alunos!");
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const handleGenerateCarnets = () => {
        if (confirm("Deseja gerar as parcelas para TODOS os alunos desta turma baseadas na configuração atual? Isso não duplicará parcelas já existentes.")) {
            mutationGenerate.mutate();
        }
    }

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
                        <div className="flex gap-2">
                            <Button onClick={handleGenerateCarnets} variant="outline" className="gap-2">
                                <FileText className="h-4 w-4" /> Gerar Carnês (Lote)
                            </Button>
                            <Button onClick={() => setOpenStudent(true)} className="gap-2">
                                <Plus className="h-4 w-4" /> Adicionar Aluno
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Students List */}
                <Card className="glass-card border-none">
                    <CardHeader>
                        <CardTitle>Alunos</CardTitle>
                        <CardDescription>Gerencie os alunos e seus pagamentos individuais.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingStudents ? (
                            <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : (
                            <div className="relative w-full overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]"></TableHead>
                                            <TableHead>Nome</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Progresso Pagto.</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students?.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    Nenhum aluno cadastrado nesta turma.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {students?.map((student) => {
                                            const studentProgress = progress?.[student.id];
                                            const isComplete = studentProgress && studentProgress.paid >= studentProgress.total && studentProgress.total > 0;

                                            return (
                                                <TableRow key={student.id} className="group">
                                                    <TableCell>
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} />
                                                            <AvatarFallback>{student.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{student.full_name}</TableCell>
                                                    <TableCell>
                                                        <span className={cn(
                                                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                                            student.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"
                                                        )}>
                                                            {student.active ? "Ativo" : "Inativo"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {studentProgress ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className={cn(
                                                                    "text-xs font-bold",
                                                                    isComplete ? "text-emerald-600" : "text-amber-600"
                                                                )}>
                                                                    {studentProgress.paid} / {studentProgress.total} pg
                                                                </span>
                                                                <Progress
                                                                    value={(studentProgress.paid / studentProgress.total) * 100}
                                                                    className={cn("h-1.5 w-24", isComplete ? "bg-emerald-100" : "bg-amber-100")}
                                                                    indicatorClassName={isComplete ? "bg-emerald-500" : "bg-amber-500"}
                                                                />
                                                            </div>

                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">Sem parcelas</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setSelectedStudentId(student.id)}
                                                        >
                                                            <Wallet className="h-4 w-4 mr-2" /> Financeiro
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>


                {/* Dialogs */}
                <StudentFinancialDialog
                    open={!!selectedStudentId}
                    onOpenChange={(open) => !open && setSelectedStudentId(null)}
                    studentId={selectedStudentId}
                />

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
    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSubmit(name);
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Nome Completo</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do aluno" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Cadastrar Aluno"}</Button>
        </form>
    )
}
