import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { graduationModuleService, GraduationPayMethod, GraduationEntryType } from "@/services/graduationModuleService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    ArrowRight
} from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
        queryKey: ["graduation-config-module", graduationId],
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
        mutationFn: (data: any) => graduationModuleService.createNewConfigVersion(graduationId!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduation-config-module"] });
            toast.success("Configuração atualizada!");
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
                            <p className="text-muted-foreground">Ano de Referência: {graduation.reference_year}</p>
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
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                                    onClick={() => navigate(`/formaturas/${graduation.slug}/${cls.id}`)}
                                >
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex justify-between items-center text-lg">
                                            {cls.name}
                                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all text-primary" />
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
                        <ConfigForm current={config} onSubmit={mutationConfig.mutate} isLoading={mutationConfig.isPending} />
                    </DialogContent>
                </Dialog>

                <Dialog open={openClass} onOpenChange={setOpenClass}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Nova Turma</DialogTitle></DialogHeader>
                        <ClassForm onSubmit={mutationClass.mutate} isLoading={mutationClass.isPending} />
                    </DialogContent>
                </Dialog>

            </div>
        </DashboardLayout>
    );
}

// --- Sub-components ---

function EntryForm({ onSubmit, isLoading }: any) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [method, setMethod] = useState<GraduationPayMethod>('PIX');
    const [type, setType] = useState<GraduationEntryType>('OUTROS');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSubmit({
            amount: Number(amount),
            description: desc,
            payment_method: method,
            entry_type: type
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Rifa de Páscoa" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label>Método</Label>
                    <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Tipo de Entrada</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="OUTROS">Outros</SelectItem>
                        <SelectItem value="RIFA">Rifa</SelectItem>
                        <SelectItem value="BINGO">Bingo</SelectItem>
                        <SelectItem value="VENDA">Venda</SelectItem>
                        <SelectItem value="DOACAO">Doação</SelectItem>
                        <SelectItem value="MENSALIDADE">Mensalidade (Avulsa)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Registrar Entrada"}</Button>
        </form>
    )
}

function ExpenseForm({ onSubmit, isLoading }: any) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [method, setMethod] = useState<GraduationPayMethod>('PIX');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSubmit({
            amount: Number(amount),
            description: desc,
            payment_method: method,
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Descrição da Despesa</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label>Método Pagamento</Label>
                    <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Registrar Despesa"}</Button>
        </form>
    )
}

function TransferForm({ onSubmit, isLoading }: any) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("Transferência");
    const [from, setFrom] = useState<GraduationPayMethod>('ESPECIE');
    const [to, setTo] = useState<GraduationPayMethod>('PIX');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSubmit({
            amount: Number(amount),
            description: desc,
            from_account: from,
            to_account: to
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Registrar transferência entre contas (ex: Depósito do dinheiro em caixa para conta bancária).</p>
            <div className="grid gap-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>De (Origem)</Label>
                    <Select value={from} onValueChange={(v: any) => setFrom(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX / Banco</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro em Mãos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Para (Destino)</Label>
                    <Select value={to} onValueChange={(v: any) => setTo(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX / Banco</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro em Mãos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>Registrar Transferência</Button>
        </form>
    )
}

function ConfigForm({ current, onSubmit, isLoading }: any) {
    const [val, setVal] = useState(current?.installment_value || "");
    const [count, setCount] = useState(current?.installments_count || "");
    const [day, setDay] = useState(current?.due_day || 10);
    const [month, setMonth] = useState(current?.start_month || 2);

    useEffect(() => {
        if (current) {
            setVal(current.installment_value);
            setCount(current.installments_count);
            setDay(current.due_day);
            setMonth(current.start_month);
        }
    }, [current]);

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSubmit({
            installment_value: Number(val),
            installments_count: Number(count),
            due_day: Number(day),
            start_month: Number(month)
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Valor da Mensalidade (R$)</Label>
                <Input type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)} required />
            </div>
            <div className="grid gap-2">
                <Label>Quantidade de Parcelas</Label>
                <Input type="number" value={count} onChange={e => setCount(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Dia Venc.</Label>
                    <Input type="number" value={day} onChange={e => setDay(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label>Mês Início</Label>
                    <Input type="number" value={month} onChange={e => setMonth(e.target.value)} required />
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Salvar Configuração"}</Button>
        </form>
    )
}

function ClassForm({ onSubmit, isLoading }: any) {
    const [name, setName] = useState("");
    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSubmit(name);
    }
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Nome da Turma</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: 3º Ano A" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Criar Turma"}</Button>
        </form>
    )
}
