import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, UserX, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
    id: string;
    user_id: string;
    name: string;
    email: string;
    active: boolean;
    created_at: string;
}

export default function UsuariosPage() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Security check: Only admin email allowed
    const isAdmin = profile?.email === "andreluis_57@hotmail.com";

    if (!isAdmin && profile) {
        return <Navigate to="/" replace />;
    }

    // Fetch all profiles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ["profiles-admin"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as Profile[];
        },
    });

    // Toggle activation mutation
    const toggleActivation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ active })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast({
                title: "Sucesso",
                description: "Status do usuário atualizado.",
            });
        },
        onError: (error) => {
            toast({
                title: "Erro ao atualizar",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
                    <p className="text-muted-foreground">
                        Ative ou desative o acesso dos usuários ao sistema.
                    </p>
                </div>

                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Data de Cadastro</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profiles?.map((profile) => (
                                <TableRow key={profile.id}>
                                    <TableCell className="font-medium">{profile.name}</TableCell>
                                    <TableCell>{profile.email}</TableCell>
                                    <TableCell>
                                        {format(new Date(profile.created_at), "dd/MM/yyyy HH:mm", {
                                            locale: ptBR,
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <div
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.active
                                                ? "bg-success/10 text-success"
                                                : "bg-warning/10 text-warning"
                                                }`}
                                        >
                                            {profile.active ? (
                                                <>
                                                    <UserCheck className="w-3 h-3 mr-1" /> Ativo
                                                </>
                                            ) : (
                                                <>
                                                    <UserX className="w-3 h-3 mr-1" /> Pendente
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs text-muted-foreground mr-2">
                                                {profile.active ? "Ativado" : "Ativar"}
                                            </span>
                                            <Switch
                                                checked={profile.active}
                                                onCheckedChange={(checked) =>
                                                    toggleActivation.mutate({ id: profile.id, active: checked })
                                                }
                                                disabled={toggleActivation.isPending}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </DashboardLayout>
    );
}
