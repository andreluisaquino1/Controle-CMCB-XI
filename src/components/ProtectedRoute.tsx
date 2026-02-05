import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has active profile
  if (profile && !profile.active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 rounded-full bg-warning/10 p-4 inline-block">
            <span className="text-4xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Aguardando Ativação
          </h1>
          <p className="text-muted-foreground mb-4">
            Sua conta ainda não foi ativada. Entre em contato com o <strong>Tenente Aquino</strong>{" "}
            solicitando a ativação para acessar o sistema.
          </p>
          <button
            onClick={() => signOut()}
            className="text-primary hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
