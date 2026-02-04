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
        source: { name: string | null } | null;
        destination: { name: string | null } | null;
        merchant: { name: string | null } | null;
        entity: { name: string | null } | null;
        notes: string | null;
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
            direction,
            notes,
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
                    <p className="text-muted-foreground">Rastreabilidade de anulações seguindo o padrão do sistema</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Histórico de Operações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-8 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                            </div>
                        ) : !logs || logs.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                Nenhuma transação encontrada
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Conta / Estab.</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Registrado por</TableHead>
                                            <TableHead>Observação</TableHead>
                                            <TableHead className="min-w-[150px]">Motivo da Anulação</TableHead>
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
                                                    <TableCell className="text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="truncate max-w-[150px]">
                                                                {t?.merchant?.name || t?.source?.name || t?.destination?.name || t?.entity?.name || "-"}
                                                            </span>
                                                        </div>
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
                                                    <TableCell className="text-sm border-l bg-muted/5 font-medium px-4">
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
