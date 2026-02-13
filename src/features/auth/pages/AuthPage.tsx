import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo-cmcb.png";

type AuthMode = "login" | "register" | "forgot-password";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  if (user) {
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
            toast.error("E-mail ou senha incorretos. Tente novamente.");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Verifique sua caixa de entrada e confirme seu e-mail.");
          } else {
            toast.error(`Erro ao entrar: ${error.message}`);
          }
        } else {
          navigate("/");
        }
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          toast.error("As senhas não coincidem.");
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este e-mail já está em uso. Tente fazer login.");
          } else {
            toast.error(`Erro ao cadastrar: ${error.message}`);
          }
        } else {
          toast.success("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
          setMode("login");
        }
      } else if (mode === "forgot-password") {
        const { error } = await resetPassword(email);
        if (error) {
          toast.error(`Erro ao recuperar senha: ${error.message}`);
        } else {
          toast.success("E-mail enviado! Verifique sua caixa de entrada.");
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
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ex: Posto/Grad Nome"
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
              <div className="space-y-4">
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

                {mode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                )}
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
