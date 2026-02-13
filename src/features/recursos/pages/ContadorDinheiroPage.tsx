import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { Calculator, Banknote, Coins, RotateCcw, TrendingUp, TrendingDown, Equal } from "lucide-react";
import { useState, useEffect } from "react";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { graduationModuleService } from "@/features/graduations/services";

const NOTES = [200, 100, 50, 20, 10, 5, 2];
const COINS = [1, 0.50, 0.25, 0.10, 0.05];

import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";

const STORAGE_KEY = "contador_dinheiro_counts";

export default function ContadorDinheiroPage() {
    const { isSecretaria } = useAuth();
    const [counts, setCounts] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    });
    const [sourceType, setSourceType] = useState<string>("associacao");
    const [selectedGraduationId, setSelectedGraduationId] = useState<string>("");
    const [systemBalance, setSystemBalance] = useState<number>(0);

    const { data: dashboardData } = useDashboardData();

    // Persist counts to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    }, [counts]);

    const { data: graduations } = useQuery({
        queryKey: ["graduations-list"],
        queryFn: async () => {
            return await graduationModuleService.listGraduations();
        },
        enabled: !isSecretaria
    });

    const handleCountChange = (value: string, denomination: number) => {
        const qty = parseInt(value) || 0;
        setCounts(prev => ({
            ...prev,
            [denomination]: qty
        }));
    };

    const calculateTotal = () => {
        return Object.entries(counts).reduce((acc, [denom, qty]) => {
            return acc + (parseFloat(denom) * qty);
        }, 0);
    };

    const totalCounted = calculateTotal();
    const totalNotes = NOTES.reduce((acc, note) => acc + (note * (counts[note] || 0)), 0);
    const totalCoins = COINS.reduce((acc, coin) => acc + (coin * (counts[coin] || 0)), 0);

    const difference = totalCounted - systemBalance;

    const resetCounts = () => {
        setCounts({});
        localStorage.removeItem(STORAGE_KEY);
        toast.info("Contagem reiniciada.");
    };

    useEffect(() => {
        if (isSecretaria) return;

        const fetchBalance = async () => {
            try {
                let balance = 0;

                if (sourceType === "associacao") {
                    // Busca saldo real do Ledger via dashboardData.especieBalance
                    balance = dashboardData?.especieBalance ?? 0;
                } else if (selectedGraduationId) {
                    // Usa o serviço para buscar saldo calculado das formaturas
                    const summary = await graduationModuleService.getFinancialSummary(selectedGraduationId);

                    if (sourceType === "grad_cash") {
                        balance = summary.balanceCash;
                    } else if (sourceType === "grad_treasurer") {
                        balance = summary.totalWithTreasurer;
                    }
                }

                setSystemBalance(balance);
            } catch (error) {
                console.error("Error fetching balance:", error);
                toast.error("Erro ao buscar saldo para conferência.");
            }
        };

        fetchBalance();
    }, [sourceType, selectedGraduationId, isSecretaria, dashboardData]);

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Contador de Dinheiro</h1>
                        <p className="text-muted-foreground">{isSecretaria ? "Ferramenta de auxílio para contagem de valores em espécie." : "Ferramenta para conferência de caixa e fechamento."}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetCounts} className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Limpar
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Notes Section */}
                            <Card className="shadow-sm">
                                <CardHeader className="py-4 bg-muted/20">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-primary" />
                                        Cédulas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4">
                                    {NOTES.map(note => (
                                        <div key={note} className="flex items-center justify-between gap-3">
                                            <Label className="w-16 font-mono text-right text-sm">R$ {note}</Label>
                                            <div className="flex-1">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    className="h-9 text-right font-medium"
                                                    value={counts[note] || ""}
                                                    onChange={(e) => handleCountChange(e.target.value, note)}
                                                />
                                            </div>
                                            <div className="w-20 text-right text-xs text-muted-foreground font-medium">
                                                {formatCurrencyBRL(note * (counts[note] || 0))}
                                            </div>
                                        </div>
                                    ))}
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-sm font-bold">Total Cédulas</span>
                                        <span className="text-sm font-bold text-primary">{formatCurrencyBRL(totalNotes)}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Coins Section */}
                            <Card className="shadow-sm">
                                <CardHeader className="py-4 bg-muted/20">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-primary" />
                                        Moedas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4">
                                    {COINS.map(coin => (
                                        <div key={coin} className="flex items-center justify-between gap-3">
                                            <Label className="w-16 font-mono text-right text-sm">R$ {coin.toFixed(2)}</Label>
                                            <div className="flex-1">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    className="h-9 text-right font-medium"
                                                    value={counts[coin] || ""}
                                                    onChange={(e) => handleCountChange(e.target.value, coin)}
                                                />
                                            </div>
                                            <div className="w-20 text-right text-xs text-muted-foreground font-medium">
                                                {formatCurrencyBRL(coin * (counts[coin] || 0))}
                                            </div>
                                        </div>
                                    ))}
                                    <Separator className="my-2" />
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-sm font-bold">Total Moedas</span>
                                        <span className="text-sm font-bold text-primary">{formatCurrencyBRL(totalCoins)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Results/Summary Section */}
                    <div className="lg:col-span-1 space-y-4">
                        <Card className="sticky top-6 shadow-md border-primary/20 bg-primary/5">
                            <CardHeader className="py-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-primary" />
                                    {isSecretaria ? "Resumo" : "Conferência"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <div className="space-y-2 p-3 rounded-lg bg-background/50 border shadow-inner">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-muted-foreground">Cédulas</span>
                                        <span className="font-medium">{formatCurrencyBRL(totalNotes)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-b pb-1">
                                        <span className="text-muted-foreground">Moedas</span>
                                        <span className="font-medium">{formatCurrencyBRL(totalCoins)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="text-sm font-bold">Total Contado</span>
                                        <span className="text-xl font-black text-primary">{formatCurrencyBRL(totalCounted)}</span>
                                    </div>
                                </div>

                                {!isSecretaria && (
                                    <>
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Comparar Com:</Label>
                                                <Select value={sourceType} onValueChange={setSourceType}>
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Selecione a origem" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="associacao">Associação (Espécie)</SelectItem>
                                                        <SelectItem value="grad_cash">Formatura (Saldo em Caixa)</SelectItem>
                                                        <SelectItem value="grad_treasurer">Formatura (Com Tesoureiros)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {(sourceType === "grad_cash" || sourceType === "grad_treasurer") && (
                                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                                    <Label className="text-xs">Formaturas Ativas:</Label>
                                                    <Select value={selectedGraduationId} onValueChange={setSelectedGraduationId}>
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {graduations?.map((grad) => (
                                                                <SelectItem key={grad.id} value={grad.id}>
                                                                    {grad.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-3 border-t">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-muted-foreground uppercase text-[10px] font-bold">Saldo Sistema</span>
                                                <span className="font-bold">{formatCurrencyBRL(systemBalance)}</span>
                                            </div>

                                            <div className={`p-3 rounded-lg border-l-4 flex flex-col gap-1 ${difference === 0
                                                ? "bg-green-500/10 border-green-500"
                                                : difference > 0
                                                    ? "bg-blue-500/10 border-blue-500"
                                                    : "bg-destructive/10 border-destructive"
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        Diferença
                                                    </span>
                                                    {difference === 0 ? (
                                                        <Badge variant="outline" className="h-4 text-[9px] bg-green-500 text-white border-none"><Equal className="h-2 w-2 mr-1" /> OK</Badge>
                                                    ) : difference > 0 ? (
                                                        <Badge variant="outline" className="h-4 text-[9px] bg-blue-500 text-white border-none"><TrendingUp className="h-2 w-2 mr-1" /> SOBRA</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="h-4 text-[9px] bg-destructive text-white border-none"><TrendingDown className="h-2 w-2 mr-1" /> FALTA</Badge>
                                                    )}
                                                </div>
                                                <span className={`text-xl font-black ${difference === 0 ? "text-green-600" : difference > 0 ? "text-blue-600" : "text-destructive"
                                                    }`}>
                                                    {formatCurrencyBRL(difference)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
