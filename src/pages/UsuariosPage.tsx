import { useState } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UserCheck, UserX, Trash2, ShieldAlert, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
    id: string;
    user_id: string;
    name: string;
    email: string;
    active: boolean;
    created_at: string;
    role?: "admin" | "user" | "demo";
}

const ROLE_LABELS = {
    admin: "Administrador",
    user: "Usuário",
    demo: "Demonstração",
};

export default function UsuariosPage() {
    const { profile, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [newName, setNewName] = useState("");

    // Fetch all profiles and their roles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ["profiles-admin"],
        queryFn: async () => {
            // First fetch profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (profilesError) throw profilesError;

            // Then fetch roles
            const { data: rolesData, error: rolesError } = await supabase
                .from("user_roles")
                .select("user_id, role");

            if (rolesError) throw rolesError;

            // Map roles to profiles
            const profilesWithRoles = profilesData.map((p) => ({
                ...p,
                role: rolesData.find((r) => r.user_id === p.user_id)?.role || "user",
            }));

            return profilesWithRoles as Profile[];
        },
        enabled: !!isAdmin, // Only fetch if admin
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
            toast.success("Status do usuário atualizado.");
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar: ${error.message}`);
        },
    });

    // Update role mutation
    const updateRole = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" | "demo" }) => {
            const { data: existingRole } = await supabase
                .from("user_roles")
                .select("*")
                .eq("user_id", userId)
                .maybeSingle();

            if (existingRole) {
                const { error } = await supabase
                    .from("user_roles")
                    .update({ role: role as "admin" | "user" }) // Cast to satisfy TS if the DB type isn't updated yet in frontend types
                    .eq("user_id", userId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("user_roles")
                    .insert({ user_id: userId, role: role as "admin" | "user" }); // Cast to satisfy TS
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Função do usuário atualizada.");
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar função: ${error.message}`);
        },
    });

    // Delete user mutation
    const deleteUser = useMutation({
        mutationFn: async (userId: string) => {
            // In a real app, you might want to call a Supabase Edge Function to delete from auth.users too
            // For now, we delete from public.profiles and public.user_roles which RLS allows
            const { error: profileError } = await supabase
                .from("profiles")
                .delete()
                .eq("user_id", userId);

            if (profileError) throw profileError;

            const { error: roleError } = await supabase
                .from("user_roles")
                .delete()
                .eq("user_id", userId);

            if (roleError) throw roleError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Usuário removido com sucesso.");
        },
        onError: (error) => {
            toast.error(`Erro ao remover: ${error.message}`);
        },
    });

    // Update profile name mutation
    const updateProfile = useMutation({
        mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
            const { error } = await supabase
                .from("profiles")
                .update({ name })
                .eq("user_id", userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Nome do usuário atualizado.");
            setEditingUser(null);
        },
        onError: (error) => {
            toast.error(`Erro ao atualizar nome: ${error.message}`);
        },
    });

    // Security check: Only admin role allowed
    if (!isAdmin && profile) {
        return <Navigate to="/" replace />;
    }

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
                        Gerencie permissões e acesso dos usuários ao sistema.
                    </p>
                </div>

                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>E-mail</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Cadastro</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profiles?.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell>{p.email}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={p.role}
                                            onValueChange={(value: "admin" | "user" | "demo") =>
                                                updateRole.mutate({ userId: p.user_id, role: value })
                                            }
                                            disabled={updateRole.isPending || p.user_id === profile?.user_id}
                                        >
                                            <SelectTrigger className="w-[110px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">{ROLE_LABELS.user}</SelectItem>
                                                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                                                <SelectItem value="demo">{ROLE_LABELS.demo}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {p.created_at ? format(new Date(p.created_at), "dd/MM/yy", {
                                            locale: ptBR,
                                        }) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${p.active
                                                ? "bg-success/10 text-success"
                                                : "bg-warning/10 text-warning"
                                                }`}
                                        >
                                            {p.active ? (
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
                                        <div className="flex items-center justify-end gap-3">
                                            <Switch
                                                checked={p.active}
                                                onCheckedChange={(checked) =>
                                                    toggleActivation.mutate({ id: p.id, active: checked })
                                                }
                                                disabled={toggleActivation.isPending || p.user_id === profile?.user_id}
                                            />

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                                disabled={p.user_id === profile?.user_id}
                                                onClick={() => {
                                                    setEditingUser(p);
                                                    setNewName(p.name);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        disabled={p.user_id === profile?.user_id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="flex items-center gap-2">
                                                            <ShieldAlert className="h-5 w-5 text-destructive" />
                                                            Remover Usuário
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Tem certeza que deseja remover {p.name}? Esta ação não pode ser desfeita e removerá o perfil e permissões do usuário.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => deleteUser.mutate(p.user_id)}
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Confirmar Remoção
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                        <DialogDescription>
                            Atualize o nome de exibição do usuário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome completo</Label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Digite o novo nome..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (editingUser && newName.trim()) {
                                    updateProfile.mutate({
                                        userId: editingUser.user_id,
                                        name: newName.trim()
                                    });
                                }
                            }}
                            disabled={updateProfile.isPending || !newName.trim()}
                        >
                            {updateProfile.isPending ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
