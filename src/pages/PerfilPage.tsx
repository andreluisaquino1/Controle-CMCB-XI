import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { extendedSupabase } from "@/integrations/supabase/extendedClient";
import { env } from "@/lib/env";
import { toast } from "sonner";
import { User, KeyRound, LogOut, Loader2, Mail, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status da Conta</Label>
                <div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${profile?.active ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {profile?.active ? "Ativo" : "Aguardando liberação"}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nível de Acesso</Label>
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

        {/* Danger Zone - Admin Only */}
        {profile?.role === "admin" && (
          <div className="pt-6 border-t space-y-4">
            <h2 className="text-lg font-semibold text-destructive">Zona de Perigo</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Reset Associação */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-destructive">Resetar Financeiro (Associação)</h3>
                      <p className="text-xs text-muted-foreground">
                        Apaga transações e zera saldos das contas da Associação.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white font-medium">Limpar Associação</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resetar Associação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá apagar as transações e zerar os saldos vinculados à Associação.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              try {
                                const { error } = await extendedSupabase.rpc("reset_financial_data" as any, {});
                                if (error) throw error;
                                toast.success("Dados da Associação resetados.");
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (error: any) {
                                toast.error(`Erro: ${error.message}`);
                              }
                            }}
                          >
                            Confirmar Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              {/* Reset Recursos */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-destructive">Resetar Recursos (UE/CX)</h3>
                      <p className="text-xs text-muted-foreground">
                        Apaga transações e zera saldos das contas de Unidade Executora e Caixa Escolar.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white font-medium">Limpar Recursos</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resetar Recursos (UE/CX)?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá apagar as transações e zerar os saldos de Recursos (UE/CX).
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              try {
                                const { error } = await extendedSupabase.rpc("reset_recursos_data" as any, {});
                                if (error) throw error;
                                toast.success("Dados de Recursos resetados.");
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (error: any) {
                                toast.error(`Erro: ${error.message}`);
                              }
                            }}
                          >
                            Confirmar Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              {/* Reset Formaturas */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-destructive">Resetar Formaturas</h3>
                      <p className="text-xs text-muted-foreground">
                        Apaga apenas o histórico financeiro (carnês, despesas, etc). Mantém os nomes dos alunos e turmas.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white font-medium">Limpar Financeiro</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resetar Financeiro das Formaturas?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá apagar as parcelas, despesas e entradas de tesouraria. Os nomes das formaturas, turmas e alunos SERÃO MANTIDOS.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              try {
                                const { error } = await extendedSupabase.rpc("reset_graduation_data" as any, {});
                                if (error) throw error;
                                toast.success("Dados de Formaturas resetados.");
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (error: any) {
                                toast.error(`Erro: ${error.message}`);
                              }
                            }}
                          >
                            Confirmar Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              {/* Reset Estabelecimentos */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-destructive">Resetar Estabelecimentos</h3>
                      <p className="text-xs text-muted-foreground">
                        Zera apenas o saldo de crédito disponível em todos os estabelecimentos parceiros.
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-white font-medium">Zerar Saldos</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Zerar Saldo dos Estabelecimentos?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Zera os saldos de crédito, mas mantém o cadastro dos estabelecimentos no sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              try {
                                const { error } = await extendedSupabase.rpc("reset_merchants_data" as any, {});
                                if (error) throw error;
                                toast.success("Saldos dos estabelecimentos zerados.");
                                setTimeout(() => window.location.reload(), 1500);
                              } catch (error: any) {
                                toast.error(`Erro: ${error.message}`);
                              }
                            }}
                          >
                            Confirmar Reset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reset Global */}
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-destructive">Resetar SISTEMA COMPLETO</h3>
                    <p className="text-sm text-muted-foreground">
                      Apaga ABSOLUTAMENTE TUDO (Associação, Recursos, Formaturas e Estabelecimentos).
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full sm:w-auto">RESET GLOBAL</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>VOCÊ TEM CERTEZA ABSOLUTA?</AlertDialogTitle>
                        <AlertDialogDescription>
                          ESTA AÇÃO IRÁ APAGAR TODOS OS DADOS DO SISTEMA (Associação, Recursos, Formaturas e Estabelecimentos). Esta operação NÃO pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>CANCELAR</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                          onClick={async () => {
                            try {
                              const { error } = await extendedSupabase.rpc("reset_all_data", {});
                              if (error) throw error;
                              toast.success("Banco de dados totalmente limpo.");
                              setTimeout(() => window.location.reload(), 1500);
                            } catch (error: any) {
                              toast.error(`Erro crítico: ${error.message}`);
                            }
                          }}
                        >
                          SIM, APAGAR TUDO
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
