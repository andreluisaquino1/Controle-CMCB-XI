import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/features/auth/contexts/AuthContext";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { PageLoader } from "@/shared/components/PageLoader";

// Lazy Pages
const AuthPage = lazy(() => import("@/features/auth/pages/AuthPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const AssociacaoPage = lazy(() => import("@/features/associacao/pages/AssociacaoPage"));
const SaldosPage = lazy(() => import("@/features/recursos/pages/SaldosPage"));
const RecursosPage = lazy(() => import("@/features/recursos/pages/RecursosPage"));
const RelatoriosPage = lazy(() => import("@/features/transactions/pages/RelatoriosPage"));
const PerfilPage = lazy(() => import("@/features/users/pages/PerfilPage"));
const UsuariosPage = lazy(() => import("@/features/users/pages/UsuariosPage"));
const LogPage = lazy(() => import("@/features/transactions/pages/LogPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const FormaturasPage = lazy(() => import("@/features/graduations/pages/FormaturasPage"));
const GraduationDetailPage = lazy(() => import("@/features/graduations/pages/GraduationDetailPage"));
const GraduationClassDetailPage = lazy(() => import("@/features/graduations/pages/GraduationClassDetailPage"));
const ContadorDinheiroPage = lazy(() => import("@/features/recursos/pages/ContadorDinheiroPage"));
const NotFound = lazy(() => import("@/shared/components/NotFound"));


// Optimized QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner position="top-right" closeButton richColors />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/associacao"
                element={
                  <ProtectedRoute>
                    <AssociacaoPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saldos"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <SaldosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recursos"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <RecursosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <RelatoriosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <PerfilPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute adminOnly>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/logs"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <LogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formaturas"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <FormaturasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formaturas/:slug"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <GraduationDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formaturas/:slug/:classSlug"
                element={
                  <ProtectedRoute blockedRoles={["secretaria"]}>
                    <GraduationClassDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contador"
                element={
                  <ProtectedRoute>
                    <ContadorDinheiroPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
