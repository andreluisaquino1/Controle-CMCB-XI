import { DashboardLayout } from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { graduationService } from "@/services/graduationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function FormaturasPage() {
    const { data: graduations, isLoading, error } = useQuery({
        queryKey: ["graduations"],
        queryFn: () => graduationService.getGraduations(),
    });

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
            <div className="space-y-6 animate-fade-in">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-foreground">Formaturas</h1>
                    <p className="text-muted-foreground">Selecione o evento para gerenciamento</p>
                </header>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {graduations?.map((grad) => (
                        <Card key={grad.id} className="group relative overflow-hidden border-none bg-card hover:shadow-xl transition-all duration-300 glass-card">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-2">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl font-bold">{grad.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    Ano de Referência: {grad.year}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Gerenciamento independente de turmas, carnês, arrecadações e despesas para a formatura de {grad.year}.
                                </p>
                                <Link to={`/formaturas/${grad.id}`}>
                                    <Button className="w-full group/btn" variant="outline">
                                        Gerenciar
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {graduations?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted rounded-2xl">
                        <GraduationCap className="h-12 w-12 text-muted mb-4" />
                        <p className="text-muted-foreground">Nenhuma formatura cadastrada.</p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
