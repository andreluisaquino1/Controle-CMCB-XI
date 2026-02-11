import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Banknote, Coins, RotateCcw, Calculator, TrendingUp, TrendingDown, Equal } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { useAssociacaoAccounts } from "@/hooks/use-accounts";
import { useQuery } from "@tanstack/react-query";
import { graduationModuleService } from "@/services/graduationModuleService";
import { ACCOUNT_NAMES } from "@/lib/constants";

interface Denomination {
    label: string;
    value: number;
    type: 'note' | 'coin';
}

const NOTES: Denomination[] = [
    { label: "R$ 200", value: 200, type: 'note' },
    { label: "R$ 100", value: 100, type: 'note' },
    { label: "R$ 50", value: 50, type: 'note' },
    { label: "R$ 20", value: 20, type: 'note' },
    { label: "R$ 10", value: 10, type: 'note' },
    { label: "R$ 5", value: 5, type: 'note' },
    { label: "R$ 2", value: 2, type: 'note' },
];

const COINS: Denomination[] = [
    { label: "R$ 1,00", value: 1, type: 'coin' },
    { label: "R$ 0,50", value: 0.5, type: 'coin' },
    { label: "R$ 0,25", value: 0.25, type: 'coin' },
    { label: "R$ 0,10", value: 0.1, type: 'coin' },
    { label: "R$ 0,05", value: 0.05, type: 'coin' },
];

export default function ContadorDinheiroPage() {
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [sourceType, setSourceType] = useState<string>("associacao");
    const [selectedGraduationId, setSelectedGraduationId] = useState<string>("");

    // Data fetching
    const { data: assocAccounts } = useAssociacaoAccounts();
    const { data: graduations } = useQuery({
        queryKey: ["graduations-module"],
        queryFn: () => graduationModuleService.listGraduations(),
    });

    const { data: gradSummary } = useQuery({
        queryKey: ["graduation-summary", selectedGraduationId],
        queryFn: () => graduationModuleService.getFinancialSummary(selectedGraduationId),
        enabled: !!selectedGraduationId && (sourceType === "grad_cash" || sourceType === "grad_treasurer"),
    });

    // Calculations
    const totalNotes = NOTES.reduce((acc, note) => acc + (counts[note.label] || 0) * note.value, 0);
    const totalCoins = COINS.reduce((acc, coin) => acc + (counts[coin.label] || 0) * coin.value, 0);
    const totalCounted = totalNotes + totalCoins;

    const systemBalance = useMemo(() => {
        if (sourceType === "associacao") {
            const especieAcc = assocAccounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE);
            return especieAcc?.balance || 0;
        }
        if (sourceType === "grad_cash") {
            return gradSummary?.balanceCash || 0;
        }
        if (sourceType === "grad_treasurer") {
            return gradSummary?.totalWithTreasurer || 0;
        }
        return 0;
    }, [sourceType, assocAccounts, gradSummary]);

    const difference = totalCounted - systemBalance;

    const handleClear = () => {
        setCounts({});
    };

    const updateCount = (label: string, value: string) => {
        const numValue = parseInt(value) || 0;
        setCounts(prev => ({ ...prev, [label]: Math.max(0, numValue) }));
    };

    return (
        <DashboardLayout>
            <div className="space-y-4 animate-fade-in">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Contador de Dinheiro</h1>
                        <p className="text-xs text-muted-foreground">Conte notas e moedas e compare com o saldo do sistema.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleClear} className="h-8 shadow-sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Limpar Tudo
                    </Button>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Inputs Section */}
                    <div className="xl:col-span-3 space-y-4">
                        <Card className="shadow-sm">
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Banknote className="h-5 w-5 text-primary" />
                                    Cédulas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-0">
                                {NOTES.map((note) => (
                                    <div key={note.label} className="flex flex-col gap-1 p-2 rounded-lg border bg-card/50">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor={`note-${note.label}`} className="text-xs font-bold">{note.label}</Label>
                                        </div>
                                        <Input
                                            id={`note-${note.label}`}
                                            type="number"
                                            className="h-8 text-right text-sm"
                                            placeholder="0"
                                            min="0"
                                            value={counts[note.label] || ""}
                                            onChange={(e) => updateCount(note.label, e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground text-right truncate">
                                            {formatCurrencyBRL((counts[note.label] || 0) * note.value)}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader className="py-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-yellow-500" />
                                    Moedas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 lg:grid-cols-5 gap-2 pt-0">
                                {COINS.map((coin) => (
                                    <div key={coin.label} className="flex flex-col gap-1 p-2 rounded-lg border bg-card/50">
                                        <Label htmlFor={`coin-${coin.label}`} className="text-xs font-bold">{coin.label}</Label>
                                        <Input
                                            id={`coin-${coin.label}`}
                                            type="number"
                                            className="h-8 text-right text-sm"
                                            placeholder="0"
                                            min="0"
                                            value={counts[coin.label] || ""}
                                            onChange={(e) => updateCount(coin.label, e.target.value)}
                                        />
                                        <p className="text-[10px] text-muted-foreground text-right truncate">
                                            {formatCurrencyBRL((counts[coin.label] || 0) * coin.value)}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results Section */}
                    <div className="space-y-4">
                        <Card className="sticky top-6 shadow-md border-primary/20 bg-primary/5">
                            <CardHeader className="py-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calculator className="h-5 w-5 text-primary" />
                                    Conferência
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
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
