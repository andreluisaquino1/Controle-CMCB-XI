import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { graduationService, GraduationExtraType } from "@/services/graduationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Wallet,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Loader2,
    Plus,
    Settings,
    ChevronLeft,
    Banknote,
    Receipt
} from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function GraduationDetailPage() {
    const { graduationId } = useParams<{ graduationId: string }>();
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const [openExtra, setOpenExtra] = useState(false);
    const [openExpense, setOpenExpense] = useState(false);
    const [openTransfer, setOpenTransfer] = useState(false);
    const [openConfig, setOpenConfig] = useState(false);

    // Queries
    const { data: graduations, isLoading: loadingGrads } = useQuery({
        queryKey: ["graduations"],
        queryFn: () => graduationService.getGraduations(),
    });

    const graduation = graduations?.find(g => g.id === graduationId);

    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ["graduation-classes", graduationId],
        queryFn: () => graduationService.getClasses(graduationId!),
        enabled: !!graduationId,
    });

    const { data: summary, isLoading: loadingSummary } = useQuery({
        queryKey: ["graduation-summary", graduationId],
        queryFn: () => graduationService.getFinancialSummary(graduationId!),
        enabled: !!graduationId,
    });

    const { data: config } = useQuery({
        queryKey: ["graduation-config", graduationId],
        queryFn: () => graduationService.getCurrentCarnetConfig(graduationId!),
        enabled: !!graduationId,
    });

    // Mutations
    const mutationConfig = useMutation({
        mutationFn: (data: any) => graduationService.createCarnetConfig({ ...data, graduation_id: graduationId! }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-config", graduationId] });
            toast.success("Configuração atualizada com sucesso!");
            setOpenConfig(false);
        },
        onError: (error: any) => toast.error(`Erro: ${error.message}`),
    });

    const mutationExtra = useMutation({
        mutationFn: (data: any) => graduationService.registerExtraIncome({ ...data, graduation_id: graduationId! }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-summary", graduationId] });
            toast.success("Arrecadação extra registrada!");
            setOpenExtra(false);
        },
        onError: (error: any) => toast.error(`Erro: ${error.message}`),
    });

    const mutationExpense = useMutation({
        mutationFn: (data: any) => graduationService.registerExpense({ ...data, graduation_id: graduationId! }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-summary", graduationId] });
            toast.success("Despesa registrada!");
            setOpenExpense(false);
        },
        onError: (error: any) => toast.error(`Erro: ${error.message}`),
    });

    const mutationTransfer = useMutation({
        mutationFn: (data: any) => graduationService.registerTransfer({ ...data, graduation_id: graduationId! }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-summary", graduationId] });
            toast.success("Repasse registrado!");
            setOpenTransfer(false);
        },
        onError: (error: any) => toast.error(`Erro: ${error.message}`),
    });

    if (loadingGrads || loadingClasses || loadingSummary) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground animate-pulse">Carregando dados da formatura...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <header className="flex flex-col gap-4">
                    <Button asChild variant="ghost" className="w-fit p-0 h-auto hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
                        <Link to="/formaturas" className="flex items-center text-sm">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                        </Link>
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">{graduation?.name}</h1>
                            <p className="text-muted-foreground">Ano de Referência: {graduation?.year}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => setOpenExtra(true)} variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Arrecadação
                            </Button>
                            <Button onClick={() => setOpenExpense(true)} variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Despesa
                            </Button>
                            <Button onClick={() => setOpenTransfer(true)} variant="default" size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                                <Banknote className="h-4 w-4" /> Repasse
                            </Button>
                            {isAdmin && (
                                <Button onClick={() => setOpenConfig(true)} variant="secondary" size="sm" className="gap-2">
                                    <Settings className="h-4 w-4" /> Config
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Financial Summary */}
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card className="glass-card border-none bg-emerald-50/50 dark:bg-emerald-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" /> Carnês Pagos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                                {formatCurrencyBRL(summary?.totalPaid || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-blue-50/50 dark:bg-blue-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Plus className="h-3 w-3" /> Extras Líquidos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                {formatCurrencyBRL(summary?.totalExtras || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-amber-50/50 dark:bg-amber-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                <TrendingDown className="h-3 w-3" /> Despesas Pagas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                {formatCurrencyBRL(summary?.totalExpenses || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-indigo-50/50 dark:bg-indigo-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                <Banknote className="h-3 w-3" /> Repasses Realizados
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                {formatCurrencyBRL(summary?.totalTransfers || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-slate-900 text-white dark:bg-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-2">
                                <Wallet className="h-3 w-3" /> Saldo em Mãos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-bold text-white">
                                {formatCurrencyBRL(summary?.balanceInHand || 0)}
                            </p>
                        </CardContent>
                    </Card>
                </section>

                {/* Classes List */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-primary" />
                        <h2 className="text-xl font-semibold">Turmas</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {classes?.map((cls) => (
                            <Button asChild key={cls.id} variant="ghost" className="h-auto p-0 hover:bg-transparent">
                                <Link to={`/formaturas/turma/${cls.id}`} className="w-full text-left">
                                    <Card className="w-full hover:border-primary/50 transition-colors group cursor-pointer overflow-hidden border-none glass-card bg-card/40">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg flex justify-between items-center">
                                                {cls.name}
                                                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">Gerenciar alunos e carnês desta turma.</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </Button>
                        ))}
                    </div>
                </section>

                {/* Dialogs */}
                <ConfigDialog open={openConfig} onOpenChange={setOpenConfig} currentConfig={config} onSubmit={(v) => mutationConfig.mutate(v)} isLoading={mutationConfig.isPending} />
                <ExtraIncomeDialog open={openExtra} onOpenChange={setOpenExtra} onSubmit={(v) => mutationExtra.mutate(v)} isLoading={mutationExtra.isPending} />
                <ExpenseDialog open={openExpense} onOpenChange={setOpenExpense} onSubmit={(v) => mutationExpense.mutate(v)} isLoading={mutationExpense.isPending} />
                <TransferDialog open={openTransfer} onOpenChange={setOpenTransfer} balance={summary?.balanceInHand || 0} onSubmit={(v) => mutationTransfer.mutate(v)} isLoading={mutationTransfer.isPending} />
            </div>
        </DashboardLayout>
    );
}

// Internal Modal Components (Simplified for brevity, can be expanded)

function ConfigDialog({ open, onOpenChange, currentConfig, onSubmit, isLoading }: any) {
    const [val, setVal] = useState(currentConfig?.installment_value || "");
    const [count, setCount] = useState(currentConfig?.installments_count || "");
    const [day, setDay] = useState(currentConfig?.due_day || 10);

    const handleS = (e: any) => {
        e.preventDefault();
        onSubmit({
            installment_value: Number(val),
            installments_count: Number(count),
            due_day: Number(day)
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Configuração do Carnê</DialogTitle></DialogHeader>
                <form onSubmit={handleS} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label>Valor da Parcela (R$)</Label>
                        <Input type="number" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Quantidade de Parcelas</Label>
                        <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Dia de Vencimento Padrão</Label>
                        <Input type="number" min="1" max="28" value={day} onChange={(e) => setDay(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Criar Nova Versão"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ExtraIncomeDialog({ open, onOpenChange, onSubmit, isLoading }: any) {
    const [type, setType] = useState<GraduationExtraType>('RIFA');
    const [gross, setGross] = useState("");
    const [costs, setCosts] = useState("0");
    const [notes, setNotes] = useState("");

    const handleS = (e: any) => {
        e.preventDefault();
        onSubmit({ type, gross_value: Number(gross), costs: Number(costs), notes });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Nova Arrecadação Extra</DialogTitle></DialogHeader>
                <form onSubmit={handleS} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label>Tipo</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RIFA">Rifa</SelectItem>
                                <SelectItem value="BINGO">Bingo</SelectItem>
                                <SelectItem value="ALIMENTOS">Venda de Alimentos</SelectItem>
                                <SelectItem value="EVENTO">Evento</SelectItem>
                                <SelectItem value="DOACAO">Doação</SelectItem>
                                <SelectItem value="OUTROS">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Valor Bruto (R$)</Label>
                        <Input type="number" step="0.01" value={gross} onChange={(e) => setGross(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Custos (R$)</Label>
                        <Input type="number" step="0.01" value={costs} onChange={(e) => setCosts(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Observações</Label>
                        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>Registrar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ExpenseDialog({ open, onOpenChange, onSubmit, isLoading }: any) {
    const [desc, setDesc] = useState("");
    const [val, setVal] = useState("");
    const [method, setMethod] = useState("cash");

    const handleS = (e: any) => {
        e.preventDefault();
        onSubmit({ description: desc, value: Number(val), pay_method: method, is_paid: true });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
                <form onSubmit={handleS} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Input value={desc} onChange={(e) => setDesc(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Valor (R$)</Label>
                        <Input type="number" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Forma de Pagamento</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">DINHEIRO</SelectItem>
                                <SelectItem value="pix">PIX</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>Registrar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function TransferDialog({ open, onOpenChange, balance, onSubmit, isLoading }: any) {
    const [val, setVal] = useState("");
    const [method, setMethod] = useState("pix");

    const handleS = (e: any) => {
        e.preventDefault();
        if (Number(val) > balance) {
            toast.error("Saldo insuficiente para este repasse.");
            return;
        }
        onSubmit({ value: Number(val), pay_method: method });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>Registrar Repasse (Prestação de Contas)</DialogTitle></DialogHeader>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-sm text-indigo-700 dark:text-indigo-400 mb-2">
                    Saldo disponível para repasse: <strong>{formatCurrencyBRL(balance)}</strong>
                </div>
                <form onSubmit={handleS} className="space-y-4 pt-2">
                    <div className="grid gap-2">
                        <Label>Valor do Repasse (R$)</Label>
                        <Input type="number" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label>Forma</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pix">PIX</SelectItem>
                                <SelectItem value="cash">DINHEIRO</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
                        Confirmar Repasse
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
