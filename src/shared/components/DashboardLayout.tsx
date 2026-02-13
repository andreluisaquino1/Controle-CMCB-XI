import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/shared/ui/button";
import { DemoModeBanner } from "@/shared/components/DemoModeBanner";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  CreditCard,
  Download,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Users,
  Settings,
  History,
  GraduationCap,
  Banknote,
} from "lucide-react";
import logo from "@/assets/logo-cmcb.png";
import { cn } from "@/shared/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Resumo", href: "/", icon: LayoutDashboard },
  { label: "Associação", href: "/associacao", icon: Building2 },
  { label: "Saldos em Estabelecimentos", href: "/saldos", icon: Wallet },
  { label: "Recursos", href: "/recursos", icon: CreditCard },
  { label: "Relatórios", href: "/relatorios", icon: Download },
  { label: "Formaturas", href: "/formaturas", icon: GraduationCap },
  { label: "Contador de Dinheiro", href: "/contador", icon: Banknote },
  { label: "Usuários", href: "/usuarios", icon: Users },
  { label: "Logs", href: "/logs", icon: History },
  { label: "Perfil", href: "/perfil", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, isAdmin, isDemo, isSecretaria, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <DemoModeBanner />
      </div>

      {/* Mobile Header */}
      <header className={cn(
        "lg:hidden sticky z-50 bg-sidebar border-b border-sidebar-border",
        isDemo ? "top-[44px]" : "top-0"
      )}>
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CMCB-XI" className="w-10 h-10 rounded-full" />
            <span className="font-semibold text-sidebar-foreground">
              CMCB-XI
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 z-50 h-[calc(100%-44px)] w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          isDemo ? "top-[44px]" : "top-0 h-full",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <img src={logo} alt="CMCB-XI" className="w-12 h-12 rounded-full" />
            <div>
              <h1 className="font-bold text-sidebar-foreground">CMCB-XI</h1>
              <p className="text-xs text-sidebar-foreground/70">
                Prestação de Contas
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            // Restriction: Only admin can see Users
            if (item.label === "Usuários" && !isAdmin) return null;

            // Restriction: Demo user cannot see Users
            if (isDemo && item.label === "Usuários") return null;

            // Restriction for Secretaria: Only can see "Associação", "Contador de Dinheiro" and "Perfil"
            if (isSecretaria && item.label !== "Associação" && item.label !== "Contador de Dinheiro" && item.label !== "Perfil") {
              return null;
            }

            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center">
              <span className="text-sm font-bold text-sidebar-primary-foreground">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.name || "Usuário"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "lg:ml-64 min-h-screen flex flex-col transition-all duration-200",
        isDemo ? "pt-[44px]" : ""
      )}>
        <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
