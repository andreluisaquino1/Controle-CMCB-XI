import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo-cmcb.jpg";

type AuthMode = "login" | "register" | "forgot-password";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Redirect if already logged in
  if (user) {
    const from = location.state?.from?.pathname || "/";
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Credenciais inválidas",
              description: "E-mail ou senha incorretos. Tente novamente.",
              variant: "destructive",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              title: "E-mail não confirmado",
              description: "Verifique sua caixa de entrada e confirme seu e-mail.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao entrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          navigate("/");
        }
      } else if (mode === "register") {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "E-mail já cadastrado",
              description: "Este e-mail já está em uso. Tente fazer login.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Erro ao cadastrar",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Cadastro realizado!",
            description: "Verifique seu e-mail para confirmar a conta. Após a confirmação, aguarde a ativação pelo Tenente Aquino.",
          });
          setMode("login");
        }
      } else if (mode === "forgot-password") {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            title: "Erro ao recuperar senha",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "E-mail enviado",
            description: "Verifique sua caixa de entrada para redefinir sua senha.",
          });
          setMode("login");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <img
              src={logo}
              alt="CMCB-XI"
              className="w-24 h-24 object-contain rounded-full shadow-elevated"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Prestação de Contas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            CMCB-XI — Barra do Corda
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-lg border border-border shadow-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">
            {mode === "login" && "Entrar"}
            {mode === "register" && "Criar Conta"}
            {mode === "forgot-password" && "Recuperar Senha"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {mode !== "forgot-password" && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" && "Entrar"}
                  {mode === "register" && "Cadastrar"}
                  {mode === "forgot-password" && "Enviar E-mail"}
                </>
              )}
            </Button>
          </form>

          {/* Mode switchers */}
          <div className="mt-6 pt-6 border-t border-border">
            {mode === "login" && (
              <div className="space-y-3 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setMode("forgot-password")}
                  className="text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
                <p className="text-muted-foreground">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-primary hover:underline font-medium"
                  >
                    Cadastre-se
                  </button>
                </p>
              </div>
            )}

            {mode === "register" && (
              <p className="text-center text-sm text-muted-foreground">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </button>
              </p>
            )}

            {mode === "forgot-password" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sistema de controle financeiro interno
        </p>
      </div>
    </div>
  );
}
