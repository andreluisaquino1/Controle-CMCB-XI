import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyBRL } from "@/lib/currency";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LedgerCheck {
    account_name: string;
    ledger_balance: number;
    transaction_sum: number;
    difference: number;
    status: 'ok' | 'error';
    transaction_count: number;
}

export default function IntegridadePage() {
    const { data: checks, isLoading, refetch } = useQuery({
        queryKey: ["ledger-integrity-check"],
        queryFn: async () => {
            // 1. Fetch current balances from ledger_balances view
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: balances, error: balanceError } = await (supabase as any)
                .from("ledger_balances")
                .select("*");

            if (balanceError) throw balanceError;

            // 2. Fetch all transactions to sum them up manually
            // Note: In a production system with millions of rows, this should be a stored procedure or use simpler checks.
            // For this size, fetching all is acceptable for a deep verify.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: transactions, error: txError } = await (supabase as any)
                .from("ledger_transactions")
                .select("source_account, destination_account, amount, type");

            if (txError) throw txError;

            // 3. Calculate sums locally
            const calculatedBalances: Record<string, number> = {};

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (transactions as any[])?.forEach(tx => {
                const amount = Number(tx.amount);

                // Debit origin
                if (tx.source_account) {
                    calculatedBalances[tx.source_account] = (calculatedBalances[tx.source_account] || 0) - amount;
                }

                // Credit destination
                if (tx.destination_account) {
                    calculatedBalances[tx.destination_account] = (calculatedBalances[tx.destination_account] || 0) + amount;
                }
            });

            // 4. Compare
            // Allow small floating point diffs if we were using floats, but we use integer cents/numeric so it should be exact.
            // However, the DB view might sum efficiently.
            // Wait! ledger_balances view IS derived from transactions.
            // So this check essentially verifies if the VIEW matches a manual javascript sum.
            // It's a valid "application level" verify that the view logic is consistent with our expectation.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results: LedgerCheck[] = (balances as any[])?.map(bal => {
                const calculated = calculatedBalances[bal.account_key] || 0;
                const current = Number(bal.balance);
                const diff = current - calculated;

                return {
                    account_name: bal.account_key, // We might map this to human readable names if available
                    ledger_balance: current,
                    transaction_sum: calculated,
                    difference: diff,
                    status: Math.abs(diff) < 0.01 ? 'ok' : 'error',
                    transaction_count: 0 // We didn't count per account, but could.
                };
            }) || [];

            return results.sort((a, b) => a.account_name.localeCompare(b.account_name));
        }
    });

    const hasErrors = checks?.some(c => c.status === 'error');

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Relatório de Integridade</h1>
                        <p className="text-muted-foreground">Verificação de consistência do Ledger Imutável</p>
                    </div>
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>

                <div className="grid gap-6">
                    <Card className={hasErrors ? "border-destructive/50" : "border-success/50"}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {isLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : hasErrors ? (
                                    <XCircle className="h-6 w-6 text-destructive" />
                                ) : (
                                    <CheckCircle className="h-6 w-6 text-success" />
                                )}
                                Status Geral: {isLoading ? "Verificando..." : hasErrors ? "Inconsistências Encontradas" : "Sistema Íntegro"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Este relatório compara o saldo atual exibido (via view de banco de dados) com um recálculo total de todas as transações registradas, garantindo que não há divergências matemáticas.
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento por Conta (Chave Ledger)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Conta (Chave)</TableHead>
                                        <TableHead className="text-right">Saldo (View)</TableHead>
                                        <TableHead className="text-right">Saldo (Recálculo Manual)</TableHead>
                                        <TableHead className="text-right">Diferença</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : checks?.map((check) => (
                                        <TableRow key={check.account_name}>
                                            <TableCell className="font-medium font-mono text-xs">{check.account_name}</TableCell>
                                            <TableCell className="text-right">{formatCurrencyBRL(check.ledger_balance)}</TableCell>
                                            <TableCell className="text-right">{formatCurrencyBRL(check.transaction_sum)}</TableCell>
                                            <TableCell className={`text-right font-bold ${check.difference !== 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                                {formatCurrencyBRL(check.difference)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {check.status === 'ok' ? (
                                                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">OK</Badge>
                                                ) : (
                                                    <Badge variant="destructive">ERRO</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
