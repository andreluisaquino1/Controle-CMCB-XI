import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, KeyRound, LogOut, Loader2, Mail } from "lucide-react";

export default function PerfilPage() {
  const { profile, signOut, user } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState(profile?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleUpdateName = async () => {
    if (!name.trim()) {
      toast({ title: "Erro", description: "Informe o nome.", variant: "destructive" });
      return;
    }
    
    setIsUpdatingName(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim() })
        .eq("user_id", user?.id);
      
      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Nome atualizado." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Não foi possível atualizar o nome.", variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      toast({ title: "Erro", description: "Informe a senha atual.", variant: "destructive" });
      return;
    }
    if (!newPassword) {
      toast({ title: "Erro", description: "Informe a nova senha.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
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
      
      toast({ title: "Sucesso", description: "Senha atualizada." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Não foi possível atualizar a senha.", variant: "destructive" });
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
      
      toast({ 
        title: "Email enviado", 
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
    } catch (error: any) {
      toast({ 
        title: "Erro", 
        description: error.message || "Não foi possível enviar o email.",
        variant: "destructive",
      });
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
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${profile?.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                {profile?.active ? "Ativo" : "Aguardando liberação"}
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
              <Label>Senha Atual *</Label>
              <Input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="space-y-2">
              <Label>Nova Senha *</Label>
              <Input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nova Senha *</Label>
              <Input 
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
            <Button variant="destructive" onClick={handleSignOut} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
