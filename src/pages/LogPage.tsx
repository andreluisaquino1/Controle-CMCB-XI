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
import { Loader2, History, AlertCircle, RotateCcw } from "lucide-react";
import { formatCurrencyBRL } from "@/lib/currency";
import { formatDateBR } from "@/lib/date-utils";
import { MODULE_LABELS } from "@/lib/constants";

interface AuditLog {
    id: string;
    created_at: string;
    action: string;
    reason: string | null;
    profiles: { name: string | null } | null;
    transactions: {
        description: string | null;
        amount: number;
        module: string;
        transaction_date: string;
        source: { name: string | null } | null;
        destination: { name: string | null } | null;
        merchant: { name: string | null } | null;
        entity: { name: string | null } | null;
    } | null;
}

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
          transactions:transactions!audit_logs_transaction_id_fkey(
            description, 
            amount, 
            module, 
            transaction_date,
            source:accounts!transactions_source_account_id_fkey(name),
            destination:accounts!transactions_destination_account_id_fkey(name),
            merchant:merchants(name),
            entity:entities(name)
          )
        `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Erro ao buscar logs:", error);
                throw error;
            }
            return data as unknown as AuditLog[];
        },
    });

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Auditoria e Logs</h1>
                    <p className="text-muted-foreground">Rastreabilidade completa de edições e anulações de transações</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Histórico de Alterações Detalhado
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
                            <div className="overflow-x-auto rounded-md border">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Data/Hora (Log)</TableHead>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Ação</TableHead>
                                            <TableHead className="whitespace-nowrap">Data Transação</TableHead>
                                            <TableHead>Módulo</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Origem / Destino</TableHead>
                                            <TableHead>Local / Entidade</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead className="min-w-[200px]">Motivo da Alteração</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap text-xs">
                                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                                </TableCell>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {log.profiles?.name || "Sistema"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-colors ${log.action === 'void' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                                        }`}>
                                                        {log.action === 'void' ? <AlertCircle className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                                                        {log.action === 'void' ? 'Anulação' : 'Edição'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {log.transactions?.transaction_date ? formatDateBR(log.transactions.transaction_date) : "-"}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/10 text-secondary-foreground border border-secondary/20">
                                                        {log.transactions?.module ? (MODULE_LABELS[log.transactions.module] || log.transactions.module) : "-"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="max-w-[150px] truncate text-sm" title={log.transactions?.description || ""}>
                                                    {log.transactions?.description || "-"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex flex-col gap-0.5">
                                                        {log.transactions?.source?.name && (
                                                            <span className="text-destructive font-medium">De: {log.transactions.source.name}</span>
                                                        )}
                                                        {log.transactions?.destination?.name && (
                                                            <span className="text-success font-medium">Para: {log.transactions.destination.name}</span>
                                                        )}
                                                        {!log.transactions?.source?.name && !log.transactions?.destination?.name && "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {log.transactions?.merchant?.name || log.transactions?.entity?.name || "-"}
                                                </TableCell>
                                                <TableCell className="text-right font-bold tabular-nums whitespace-nowrap">
                                                    {formatCurrencyBRL(log.transactions?.amount || 0)}
                                                </TableCell>
                                                <TableCell className="text-sm italic text-muted-foreground">{log.reason || "Não informado"}</TableCell>
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
