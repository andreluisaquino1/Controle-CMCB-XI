import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { graduationModuleService, Graduation } from "@/services/graduationModuleService";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GraduationCap, Calendar, ArrowRight, Loader2, Plus, MoreVertical, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function FormaturasPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAdmin } = useAuth();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newGradName, setNewGradName] = useState("");
    const [newGradYear, setNewGradYear] = useState(new Date().getFullYear());

    const { data: graduations, isLoading, error } = useQuery({
        queryKey: ["graduations-module"],
        queryFn: () => graduationModuleService.listGraduations(),
    });

    useEffect(() => {
        document.title = "Formaturas | CMCB-XI";
        return () => { document.title = "CMCB-XI"; };
    }, []);

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!newGradName) throw new Error("Nome é obrigatório");
            await graduationModuleService.createGraduation(newGradName, Number(newGradYear));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduations-module"] });
            toast.success("Formatura criada com sucesso!");
            setIsCreateOpen(false);
            setNewGradName("");
        },
        onError: (err) => {
            toast.error(`Erro ao criar: ${err.message}`);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await graduationModuleService.softDeleteGraduation(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["graduations-module"] });
            toast.success("Formatura removida (soft delete).");
        },
        onError: (err) => {
            toast.error(`Erro ao remover: ${err.message}`);
        }
    });

    const handleNavigate = (grad: Graduation) => {
        // Use slug if available, otherwise fallback to id (though route expects slug, logic in service creates slug)
        // If slug is missing for old records, we might have an issue. 
        // For now assure slug exists or use ID if route handles it (Route is :slug)
        const identifier = grad.slug || grad.id;
        navigate(`/formaturas/${identifier}`);
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <p className="text-destructive">Erro ao carregar formaturas.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in p-4 md:p-8 pt-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Formaturas</h1>
                        <p className="text-muted-foreground">Gerencie eventos de formatura, turmas e arrecadações.</p>
                    </div>
                    {isAdmin && (
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                                    <Plus className="h-4 w-4" /> Nova Formatura
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nova Formatura</DialogTitle>
                                    <DialogDescription>
                                        Crie um novo evento de formatura para gerenciar turmas e finanças independentes.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Nome do Evento</Label>
                                        <Input
                                            id="name"
                                            placeholder="Ex: Formatura 3º Ano"
                                            value={newGradName}
                                            onChange={(e) => setNewGradName(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="year">Ano de Referência</Label>
                                        <Input
                                            id="year"
                                            type="number"
                                            value={newGradYear}
                                            onChange={(e) => setNewGradYear(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Criar Evento
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </header>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {graduations?.map((grad) => (
                        <Card
                            key={grad.id}
                            className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card hover:shadow-xl transition-all duration-300 cursor-pointer hover:border-primary/50"
                            onClick={() => handleNavigate(grad)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            <CardHeader className="pb-2 relative z-10 flex flex-row items-start justify-between space-y-0">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                {isAdmin && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Tem certeza que deseja inativar esta formatura?")) {
                                                    deleteMutation.mutate(grad.id);
                                                }
                                            }}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-2 relative z-10">
                                <CardTitle className="text-xl font-bold line-clamp-1">{grad.name}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {grad.reference_year}
                                </div>
                            </CardContent>
                            <CardFooter className="relative z-10 pt-2">
                                <span className="text-xs text-primary font-medium flex items-center group-hover:underline">
                                    Acessar Painel <ArrowRight className="ml-1 h-3 w-3" />
                                </span>
                            </CardFooter>
                        </Card>
                    ))}

                    {graduations?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-muted rounded-2xl bg-muted/50">
                            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-medium">Nenhuma formatura ativa</h3>
                            <p className="text-muted-foreground max-w-sm mt-2">
                                Crie um novo evento de formatura para começar a gerenciar turmas e arrecadações.
                            </p>
                            {isAdmin && (
                                <Button variant="outline" className="mt-6" onClick={() => setIsCreateOpen(true)}>
                                    Criar Primeira Formatura
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
