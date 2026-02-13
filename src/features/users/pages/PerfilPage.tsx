import { useState } from "react";
import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, KeyRound, LogOut, Loader2, Mail } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/features/users/services/profileService";

export default function PerfilPage() {
  const { profile, signOut, user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleUpdateName = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome.");
      return;
    }

    setIsUpdatingName(true);

    try {
      await profileService.updateProfileName(user!.id, name.trim());
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });

      toast.success("Nome atualizado.");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Não foi possível atualizar o nome.");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast.error("Informe a senha atual.");
      return;
    }
    if (!newPassword) {
      toast.error("Informe a nova senha.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      // First, reauthenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Senha atual incorreta.");
      }

      // Then update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Senha atualizada.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Não foi possível atualizar a senha.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleResetPasswordEmail = async () => {
    if (!user?.email) return;

    setIsResettingPassword(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success("Email enviado. Verifique sua caixa de entrada.");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || "Não foi possível enviar o email.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil e Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais
          </p>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" autoComplete="email" value={profile?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Status da Conta</span>
                <div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${profile?.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {profile?.active ? "Ativo" : "Aguardando liberação"}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nível de Acesso</span>
                <div>
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary uppercase">
                    {profile?.role === "admin" ? "Administrador" : profile?.role === "demo" ? "Demonstração" : "Usuário"}
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={handleUpdateName} disabled={isUpdatingName}>
              {isUpdatingName ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Nome
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual *</Label>
              <Input
                id="current-password"
                name="current-password"
                autoComplete="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha *</Label>
              <Input
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha *</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Alterar Senha
            </Button>

            <div className="pt-2 border-t">
              <Button
                variant="link"
                className="px-0 text-muted-foreground"
                onClick={handleResetPasswordEmail}
                disabled={isResettingPassword}
              >
                <Mail className="h-4 w-4 mr-2" />
                {isResettingPassword ? "Enviando..." : "Esqueceu a senha? Enviar email de redefinição"}
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Logout */}
        <Card>
          <CardContent className="pt-6">
            <Button variant="outline" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
