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
                    <p className="text-muted-foreground">Rastreabilidade completa sem necessidade de rolagem lateral</p>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Histórico de Alterações (Visão Consolidada)
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
                            <div className="rounded-md border bg-card">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[140px] px-3">Registro</TableHead>
                                            <TableHead className="px-2">Transação / Contexto</TableHead>
                                            <TableHead className="px-2 min-w-[150px]">Envolvidos</TableHead>
                                            <TableHead className="w-[110px] text-right px-2">Valor</TableHead>
                                            <TableHead className="px-3">Motivo da Alteração</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id} className="group">
                                                <TableCell className="px-3 py-3 align-top">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11px] font-semibold text-foreground">
                                                            {new Date(log.created_at).toLocaleDateString('pt-BR')} {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                                            {log.profiles?.name || "Sistema"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-3 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-medium text-muted-foreground">
                                                                {log.transactions?.transaction_date ? formatDateBR(log.transactions.transaction_date) : "-"}
                                                            </span>
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/10 text-secondary-foreground border border-secondary/20 font-medium whitespace-nowrap">
                                                                {log.transactions?.module ? (MODULE_LABELS[log.transactions.module] || log.transactions.module) : "-"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] leading-tight text-foreground line-clamp-2" title={log.transactions?.description || ""}>
                                                            {log.transactions?.description || "-"}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-3 align-top">
                                                    <div className="flex flex-col gap-1 text-[10px]">
                                                        {log.transactions?.source?.name && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-destructive font-bold">DE:</span>
                                                                <span className="text-muted-foreground truncate">{log.transactions.source.name}</span>
                                                            </div>
                                                        )}
                                                        {log.transactions?.destination?.name && (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-success font-bold">PARA:</span>
                                                                <span className="text-muted-foreground truncate">{log.transactions.destination.name}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-1 pt-0.5 border-t border-muted/30">
                                                            <span className="text-primary/70 font-semibold uppercase text-[8px]">Unidade:</span>
                                                            <span className="font-medium truncate max-w-[100px]">{log.transactions?.merchant?.name || log.transactions?.entity?.name || "-"}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-2 py-3 align-top text-right font-bold tabular-nums text-sm">
                                                    {formatCurrencyBRL(log.transactions?.amount || 0)}
                                                </TableCell>
                                                <TableCell className="px-3 py-3 align-top">
                                                    <p className="text-[11px] italic text-muted-foreground bg-muted/20 p-1.5 rounded leading-normal border border-muted/10">
                                                        {log.reason || "Não informado"}
                                                    </p>
                                                </TableCell>
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
