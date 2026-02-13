import { useAuth } from "@/features/auth/contexts/AuthContext";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function DemoModeBanner() {
    const { isDemo } = useAuth();

    if (!isDemo) return null;

    const handleResetDemo = () => {
        localStorage.removeItem("demo_state");
        window.location.reload();
    };

    return (
        <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">
                    MODO DEMONSTRAÇÃO — Você está visualizando dados fictícios. Nenhuma alteração será salva no banco de dados.
                </p>
            </div>
            <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs bg-white/20 hover:bg-white/30 text-white border-none"
                onClick={handleResetDemo}
            >
                <RefreshCcw className="h-3 w-3 mr-2" />
                Resetar Demo
            </Button>
        </div>
    );
}
