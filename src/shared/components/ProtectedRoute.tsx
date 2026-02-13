import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { extendedSupabase } from "@/integrations/supabase/extendedClient";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  blockedRoles?: string[];
}

export function ProtectedRoute({ children, adminOnly = false, blockedRoles = [] }: ProtectedRouteProps) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();

  // Texto de suporte configurável via tabela `settings` (admin).
  // Fallback neutro caso não exista configuração.
  const { data: supportContactText } = useQuery({
    queryKey: ["settings", "support_contact_text"],
    queryFn: async () => {
      const { data, error = null } = await extendedSupabase
        .from("settings")
        .select("value")
        .eq("key", "support_contact_text")
        .maybeSingle();

      if (error) {
        console.warn("Falha ao buscar settings:support_contact_text", error);
        return null;
      }

      return (data?.value as string | null) ?? null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  if (loading || (user && !profile)) {
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
  if (!profile || !profile.active) {
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
            Sua conta ainda não foi ativada ou o perfil foi removido.{" "}
            {supportContactText ? (
              <>
                Entre em contato: <strong>{supportContactText}</strong>
              </>
            ) : (
              <>
                Entre em contato com o <strong>Tenente Aquino</strong> solicitando a ativação para acessar o sistema.
              </>
            )}
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

  // Check admin permission if required
  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Block specific roles from certain routes
  if (profile?.role && blockedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
