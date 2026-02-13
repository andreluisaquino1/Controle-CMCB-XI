import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { graduationModuleService, GraduationPayMethod, GraduationEntryType, GraduationClass } from "@/features/graduations/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
    Users,
    TrendingDown,
    Loader2,
    Plus,
    Settings,
    ChevronLeft,
    Banknote,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    ArrowLeftRight,
    ArrowRight,
    MoreVertical,
    Trash2,
    Edit
} from "lucide-react";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { useState, useEffect } from "react";
import { EntryForm, ExpenseForm, TransferForm, ConfigForm, ClassForm } from "./components/GraduationForms";
import { GlobalChargeBatchModal } from "./components/GlobalChargeBatchModal";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";

export default function GraduationDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();

    // Modals state
    const [openEntry, setOpenEntry] = useState(false);
    const [openExpense, setOpenExpense] = useState(false);
    const [openTransfer, setOpenTransfer] = useState(false);
    const [openConfig, setOpenConfig] = useState(false);
    const [openClass, setOpenClass] = useState(false);
    const [openGlobalCharge, setOpenGlobalCharge] = useState(false);

    // 1. Get Graduation
    const { data: graduation, isLoading: loadingGrad } = useQuery({
        queryKey: ["graduation-module", slug],
        queryFn: () => graduationModuleService.getGraduationBySlug(slug!),
        enabled: !!slug,
    });

    const graduationId = graduation?.id;

    // 2. Get Summary
    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ["graduation-summary-module", graduationId],
        queryFn: () => graduationModuleService.getFinancialSummary(graduationId!),
        enabled: !!graduationId,
    });

    // 3. Get History
    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ["graduation-history-module", graduationId],
        queryFn: () => graduationModuleService.getHistory(graduationId!),
        enabled: !!graduationId,
    });

    // 4. Get Classes
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ["graduation-classes-module", graduationId],
        queryFn: () => graduationModuleService.listClasses(graduationId!),
        enabled: !!graduationId,
    });

    // 5. Get Config
    const { data: config } = useQuery({
        queryKey: ["graduation-config", graduationId],
        queryFn: () => graduationModuleService.getCurrentConfig(graduationId!),
        enabled: !!graduationId,
    });


    useEffect(() => {
        if (graduation) {
            document.title = `${graduation.name} | CMCB-XI`;
        } else {
            document.title = "Formatura | CMCB-XI";
        }
        return () => { document.title = "CMCB-XI"; };
    }, [graduation]);

    // --- Mutations ---

    const mutationEntry = useMutation({
        mutationFn: (data: any) => graduationModuleService.createEntry({
            graduation_id: graduationId!,
            date: new Date().toISOString(),
            entry_type: data.entry_type,
            pix_amount: data.payment_method === 'PIX' ? data.amount : 0,
            cash_amount: data.payment_method === 'ESPECIE' ? data.amount : 0,
            notes: data.description
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-history-module"] });
            toast.success("Entrada registrada!");
            setOpenEntry(false);
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationExpense = useMutation({
        mutationFn: (data: any) => graduationModuleService.createExpense({
            graduation_id: graduationId!,
            date: new Date().toISOString(),
            method: data.payment_method,
            amount: data.amount,
            description: data.description
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-history-module"] });
            toast.success("Despesa registrada!");
            setOpenExpense(false);
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationTransfer = useMutation({
        mutationFn: (data: any) => graduationModuleService.createTransfer({
            graduation_id: graduationId!,
            date: new Date().toISOString(),
            from_account: data.from_account,
            to_account: data.to_account,
            amount: data.amount,
            notes: data.description
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] });
            queryClient.invalidateQueries({ queryKey: ["graduation-history-module"] });
            toast.success("Transferência registrada!");
            setOpenTransfer(false);
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationConfig = useMutation({
        mutationFn: async (newData: any) => {
            // Check if anything changed
            await graduationModuleService.createNewConfigVersion(graduationId!, newData);
            await graduationModuleService.generateInstallmentsForGraduation(graduationId!);
            return true; // Always true now because we are always regenerating if they click the button
        },
        onSuccess: (hasChanged) => {
            queryClient.invalidateQueries({ queryKey: ["graduation-config", graduationId] });
            if (hasChanged) {
                queryClient.invalidateQueries({ queryKey: ["graduation-students-progress"] });
                queryClient.invalidateQueries({ queryKey: ["graduation-summary-module"] });
                toast.success("Configuração salva e prestações regeneradas!");
            } else {
                toast.success("Configuração salva.");
            }
            setOpenConfig(false);
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const mutationClass = useMutation({
        mutationFn: (name: string) => graduationModuleService.createClass(graduationId!, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-classes-module"] });
            toast.success("Turma criada!");
            setOpenClass(false);
        },
        onError: (err: any) => toast.error("Erro: " + err.message)
    });

    const [editClass, setEditClass] = useState<GraduationClass | null>(null);
    const [editClassName, setEditClassName] = useState("");

    const updateClassMutation = useMutation({
        mutationFn: async () => {
            if (!editClass || !editClassName) return;
            await graduationModuleService.updateClass(editClass.id, editClassName);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-classes-module"] });
            toast.success("Turma atualizada!");
            setEditClass(null);
            setEditClassName("");
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        }
    });

    const deleteClassMutation = useMutation({
        mutationFn: async (id: string) => {
            await graduationModuleService.softDeleteClass(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-classes-module"] });
            toast.success("Turma removida.");
        },
        onError: (err) => {
            toast.error(`Erro ao remover: ${err.message}`);
        }
    });


    if (loadingGrad) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!graduation) return null;

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in p-4 md:p-8 pt-6">
                {/* Header */}
                <header className="flex flex-col gap-4">
                    <Button asChild variant="ghost" className="w-fit p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <Link to="/formaturas" className="flex items-center text-sm">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                        </Link>
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{graduation.name}</h1>
                            <p className="text-muted-foreground">Ano de Referência: {graduation.year}</p>

                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setOpenEntry(true)} variant="default" size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="h-4 w-4" /> Entrada/Aporte
                            </Button>
                            <Button onClick={() => setOpenExpense(true)} variant="destructive" size="sm" className="gap-2">
                                <TrendingDown className="h-4 w-4" /> Despesa
                            </Button>
                            <Button onClick={() => setOpenTransfer(true)} variant="outline" size="sm" className="gap-2">
                                <ArrowLeftRight className="h-4 w-4" /> Transferência
                            </Button>
                            <Button onClick={() => setOpenGlobalCharge(true)} variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Cobrança Lote
                            </Button>
                            {isAdmin && (
                                <Button onClick={() => setOpenConfig(true)} variant="secondary" size="sm" className="gap-2">
                                    <Settings className="h-4 w-4" /> Config
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <Tabs defaultValue="financeiro" className="w-full">
                    <TabsList className="mb-4 bg-muted/50 p-1">
                        <TabsTrigger value="financeiro" className="gap-2">
                            <Banknote className="h-4 w-4" /> Financeiro
                        </TabsTrigger>
                        <TabsTrigger value="turmas" className="gap-2">
                            <Users className="h-4 w-4" /> Turmas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="financeiro" className="space-y-6">
                        {/* Cards Summary */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <Card className="glass-card border-none bg-emerald-50/50 dark:bg-emerald-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Receita Total</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                                        {formatCurrencyBRL(summary?.totalIncome || 0)}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="glass-card border-none bg-rose-50/50 dark:bg-rose-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">Despesas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xl font-bold text-rose-700 dark:text-rose-300">
                                        {formatCurrencyBRL(summary?.totalExpenses || 0)}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="glass-card border-none bg-blue-50/50 dark:bg-blue-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">Saldo Atual (Caixa)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                                        {formatCurrencyBRL(summary?.balanceTotal || 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Pix: {formatCurrencyBRL(summary?.balancePix || 0)} | Esp: {formatCurrencyBRL(summary?.balanceCash || 0)}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="glass-card border-none bg-amber-50/50 dark:bg-amber-950/20">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Com Tesoureiro</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                                        {formatCurrencyBRL(summary?.totalWithTreasurer || 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                        Pendente de Depósito
                                    </p>
                                </CardContent>
                            </Card>
                            <Card className="glass-card border-none bg-slate-100 dark:bg-slate-900">

                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Pendente (À Receber)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xl font-bold text-muted-foreground">
                                        {formatCurrencyBRL(summary?.pendingIncome || 0)}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* History Table */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-semibold">Histórico de Movimentações</h2>
                            </div>
                            <Card className="border-none glass-card overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {history?.length === 0 && (
                                            <div className="p-8 text-center text-muted-foreground">
                                                Nenhuma movimentação registrada.
                                            </div>
                                        )}
                                        {history?.map((entry: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "p-2 rounded-full",
                                                        (entry.type === 'ENTRADA' || entry.type === 'AJUSTE' && entry.amount >= 0) ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                                    )}>
                                                        {(entry.type === 'ENTRADA' || entry.amount >= 0) ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-sm">{entry.description || "Sem descrição"}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(entry.date).toLocaleDateString()} • {entry.type}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={cn("font-bold", (entry.type === 'ENTRADA' || entry.amount >= 0) ? "text-emerald-600" : "text-rose-600")}>
                                                    {formatCurrencyBRL(entry.amount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="turmas">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-semibold">Turmas</h2>
                            </div>
                            <Button size="sm" onClick={() => setOpenClass(true)} className="gap-2">
                                <Plus className="h-4 w-4" /> Nova Turma
                            </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {classes?.map((cls) => (
                                <Card
                                    key={cls.id}
                                    className="cursor-pointer hover:border-primary/50 transition-all group"
                                    onClick={() => navigate(`/formaturas/${graduation.slug}/${cls.slug || cls.id}`)}
                                >
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex justify-between items-center text-lg">
                                            {cls.name}
                                            <div className="flex items-center gap-2">
                                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                                                {isAdmin && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()} aria-label="Ações da turma">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditClass(cls);
                                                                setEditClassName(cls.name);
                                                            }}>
                                                                <Edit className="mr-2 h-4 w-4" /> Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("Tem certeza que deseja inativar esta turma?")) {
                                                                    deleteClassMutation.mutate(cls.id);
                                                                }
                                                            }}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">Clique para gerenciar alunos.</p>
                                    </CardContent>
                                </Card>
                            ))}
                            {classes?.length === 0 && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-muted rounded-xl bg-muted/50">
                                    <p className="text-muted-foreground">Nenhuma turma cadastrada.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* --- Dialogs --- */}

                <Dialog open={openEntry} onOpenChange={setOpenEntry}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nova Entrada</DialogTitle></DialogHeader>
                        <EntryForm onSubmit={mutationEntry.mutate} isLoading={mutationEntry.isPending} />
                    </DialogContent>
                </Dialog>

                <Dialog open={openExpense} onOpenChange={setOpenExpense}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
                        <ExpenseForm onSubmit={mutationExpense.mutate} isLoading={mutationExpense.isPending} />
                    </DialogContent>
                </Dialog>

                <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Transferência Interna</DialogTitle></DialogHeader>
                        <TransferForm onSubmit={mutationTransfer.mutate} isLoading={mutationTransfer.isPending} />
                    </DialogContent>
                </Dialog>

                <Dialog open={openConfig} onOpenChange={setOpenConfig}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Configuração Financeira</DialogTitle></DialogHeader>
                        <ConfigForm
                            current={config}
                            onSubmit={mutationConfig.mutate}
                            isLoading={mutationConfig.isPending}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={openClass} onOpenChange={setOpenClass}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nova Turma</DialogTitle></DialogHeader>
                        <ClassForm onSubmit={mutationClass.mutate} isLoading={mutationClass.isPending} />
                    </DialogContent>
                </Dialog>

            </div>
            {graduation && (
                <GlobalChargeBatchModal
                    open={openGlobalCharge}
                    onOpenChange={setOpenGlobalCharge}
                    graduationId={graduation.id}
                />
            )}
        </DashboardLayout>
    );
}
