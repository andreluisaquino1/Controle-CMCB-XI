import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, History, AlertCircle, RotateCcw, Download } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { exportToCSV } from "@/lib/export-utils";

export default function LogPage() {
    const { data: logs, isLoading } = useQuery({
        queryKey: ["audit-logs"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("audit_logs")
                .select(`
          id,
          created_at,
          action,
          reason,
          profiles:profiles!audit_logs_user_id_profiles_fkey(name),
          transactions:transactions!audit_logs_transaction_id_fkey(description, amount)
        `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Erro ao buscar logs:", error);
                throw error;
            }
            return data;
        },
    });

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Auditoria e Logs</h1>
                    <p className="text-muted-foreground">Rastreabilidade de edições e anulações de transações</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Histórico de Alterações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            </div>
                        ) : !logs || logs.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Nenhuma alteração registrada nos logs.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Ação</TableHead>
                                            <TableHead>Transação Original</TableHead>
                                            <TableHead>Motivo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log: any) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {log.profiles?.name || "Sistema"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${log.action === 'void' ? 'bg-destructive/10 text-destructive' : 'bg-orange-500/10 text-orange-500'
                                                        }`}>
                                                        {log.action === 'void' ? <AlertCircle className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                                                        {log.action === 'void' ? 'Anulação' : 'Edição'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs">
                                                        <p className="font-semibold">{log.transactions?.description || "Sem descrição"}</p>
                                                        <p className="text-muted-foreground">{formatCurrencyBRL(log.transactions?.amount || 0)}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-xs">{log.reason}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
