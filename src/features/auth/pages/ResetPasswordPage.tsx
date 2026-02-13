import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo-cmcb.png";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if we have a recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("Sessão expirada ou link inválido. Tente recuperar a senha novamente.");
                navigate("/auth");
            }
        };
        checkSession();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                toast.error(`Erro ao atualizar senha: ${error.message}`);
            } else {
                toast.success("Senha atualizada com sucesso! Você já pode entrar.");
                // Sign out to ensure clean state
                await supabase.auth.signOut();
                navigate("/auth");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md text-center mb-8">
                <div className="inline-block mb-4">
                    <img
                        src={logo}
                        alt="CMCB-XI"
                        className="w-24 h-24 object-contain rounded-full shadow-elevated"
                    />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Nova Senha</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Defina uma nova senha para sua conta
                </p>
            </div>

            <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-card p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">Nova Senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="No mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Repita a nova senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Atualizar Senha"
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
