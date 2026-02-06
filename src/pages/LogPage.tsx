import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
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
import { Loader2, History } from "lucide-react";
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
        direction: string;
        origin_fund: string | null;
        notes: string | null;
        source: { name: string | null } | null;
        destination: { name: string | null } | null;
        merchant: { name: string | null } | null;
        entity: { name: string | null; type: string } | null;
    } | null;
}

export default function LogPage() {
    const { isDemo } = useAuth();
    const { getLogs } = useDemoData();

    const { data: realLogs, isLoading } = useQuery({
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
            direction,
            origin_fund,
            notes,
            source:accounts!transactions_source_account_id_fkey(name),
            destination:accounts!transactions_destination_account_id_fkey(name),
            merchant:merchants(name),
            entity:entities(name, type)
          )
        `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Erro ao buscar logs:", error);
                throw error;
            }
            return data as unknown as AuditLog[];
        },
        enabled: !isDemo,
    });

    // Use direct getter for synchronous demo data access
    const logs = isDemo ? getLogs() : realLogs;

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Prestação de Contas</h1>
                    <p className="text-muted-foreground">Auditoria detalhada de anulações seguindo o padrão visual do sistema</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Histórico de Auditoria
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            </div>
                        ) : !logs || logs.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Nenhuma transação de auditoria encontrada
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Origem</TableHead>
                                            <TableHead>Conta Origem</TableHead>
                                            <TableHead>Conta Destino</TableHead>
                                            <TableHead>Estabelecimento</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Registrado por</TableHead>
                                            <TableHead>Observação</TableHead>
                                            <TableHead className="min-w-[150px] bg-muted/5 border-l font-bold">Motivo da Anulação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => {
                                            const t = log.transactions;
                                            return (
                                                <TableRow key={log.id} className="opacity-75">
                                                    <TableCell className="whitespace-nowrap">
                                                        {t?.transaction_date ? formatDateBR(t.transaction_date) : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${t?.direction === "in" || t?.module === "aporte_saldo"
                                                            ? "bg-success/10 text-success"
                                                            : "bg-destructive/10 text-destructive"
                                                            }`}>
                                                            {t?.module ? (MODULE_LABELS[t.module] || t.module) : "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-semibold text-[11px]">
                                                            {t?.origin_fund || t?.entity?.type?.toUpperCase() || "-"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {t?.source?.name || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {t?.destination?.name || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {t?.merchant?.name || "-"}
                                                    </TableCell>
                                                    <TableCell className={`text-right font-bold tabular-nums ${t?.direction === "in" || t?.module === "aporte_saldo" ? "text-success" : "text-destructive"
                                                        }`}>
                                                        {t?.direction === "in" || t?.module === "aporte_saldo" ? "+" : "-"}
                                                        {formatCurrencyBRL(Number(t?.amount || 0))}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-sm">
                                                        {t?.description || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                                                        {log.profiles?.name || "Sistema"}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate text-muted-foreground text-xs italic">
                                                        {t?.notes || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-sm border-l bg-muted/10 font-medium px-4">
                                                        {log.reason || "-"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
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
