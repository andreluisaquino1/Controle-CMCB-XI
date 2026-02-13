import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { profileService, Profile } from "@/features/users/services/profileService";
// ... (imports remain the same)
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
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
} from "@/shared/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, UserCheck, UserX, Trash2, ShieldAlert, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ROLE_LABELS = {
    admin: "Administrador",
    user: "Usuário",
    demo: "Demonstração",
    secretaria: "Secretaria",
};

export default function UsuariosPage() {
    const { profile, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [newName, setNewName] = useState("");

    // Fetch all profiles and their roles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ["profiles-admin"],
        queryFn: () => profileService.getAllProfiles(),
        enabled: !!isAdmin, // Only fetch if admin
    });

    // Toggle activation mutation
    const toggleActivation = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            profileService.toggleActivation(id, active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Status do usuário atualizado.");
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar: ${error.message}`);
        },
    });

    // Update role mutation
    const updateRole = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            profileService.updateRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Função do usuário atualizada.");
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar função: ${error.message}`);
        },
    });

    // Delete user mutation
    const deleteUser = useMutation({
        mutationFn: (userId: string) => profileService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Usuário removido com sucesso.");
        },
        onError: (error: Error) => {
            toast.error(`Erro ao remover: ${error.message}`);
        },
    });

    // Update profile name mutation
    const updateProfile = useMutation({
        mutationFn: ({ userId, name }: { userId: string; name: string }) =>
            profileService.updateProfileName(userId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["profiles-admin"] });
            toast.success("Nome do usuário atualizado.");
            setEditingUser(null);
        },
        onError: (error: Error) => {
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
                                            onValueChange={(value: "admin" | "user" | "demo" | "secretaria") =>
                                                updateRole.mutate({ userId: p.user_id, role: value })
                                            }
                                            disabled={updateRole.isPending || p.user_id === profile?.user_id}
                                        >
                                            <SelectTrigger className="w-[110px] h-8 text-xs" aria-label={`Alterar função de ${p.name}`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">{ROLE_LABELS.user}</SelectItem>
                                                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                                                <SelectItem value="secretaria">{ROLE_LABELS.secretaria}</SelectItem>
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
                                                aria-label={p.active ? `Desativar usuário ${p.name}` : `Ativar usuário ${p.name}`}
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
                                                aria-label={`Editar ${p.name}`}
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
                                                        aria-label={`Remover ${p.name}`}
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
