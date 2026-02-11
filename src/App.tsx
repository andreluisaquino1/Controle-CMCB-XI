import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageLoader } from "@/components/PageLoader";

// Lazy Pages
// Lazy Pages
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AssociacaoPage = lazy(() => import("./pages/AssociacaoPage"));
const SaldosPage = lazy(() => import("./pages/SaldosPage"));
const RecursosPage = lazy(() => import("./pages/RecursosPage"));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage"));
const PerfilPage = lazy(() => import("./pages/PerfilPage"));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage"));
const LogPage = lazy(() => import("./pages/LogPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const FormaturasPage = lazy(() => import("./pages/graduations/FormaturasPage"));
const GraduationDetailPage = lazy(() => import("./pages/graduations/GraduationDetailPage"));
const ClassDetailPage = lazy(() => import("./pages/graduations/ClassDetailPage"));
const NotFound = lazy(() => import("./pages/NotFound"));


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
      <BrowserRouter>
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
                  <ProtectedRoute>
                    <SaldosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recursos"
                element={
                  <ProtectedRoute>
                    <RecursosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <ProtectedRoute>
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
                  <ProtectedRoute>
                    <LogPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formaturas"
                element={
                  <ProtectedRoute>
                    <FormaturasPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formaturas/:graduationId"
                element={
                  <ProtectedRoute>
                    <GraduationDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/formaturas/turma/:classId"
                element={
                  <ProtectedRoute>
                    <ClassDetailPage />
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
