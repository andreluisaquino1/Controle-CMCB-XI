import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { useState } from "react";
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
import { formatDateBR } from "@/lib/date-utils";
import { MODULE_LABELS } from "@/lib/constants";
import { Database } from "@/integrations/supabase/types";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter, Calendar as MapPin, User as UserIcon, XCircle, AlertCircle, ShieldCheck, History as HistoryIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL } from "@/lib/currency";

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
    const { isDemo, isAdmin } = useAuth();
    const { getLogs } = useDemoData();

    const [page, setPage] = useState(1);
    const pageSize = 15;
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [selectedAction, setSelectedAction] = useState<string>("all");

    // Fetch users for filter
    const { data: users } = useQuery({
        queryKey: ["users-list"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_id, name")
                .order("name");
            if (error) throw error;
            return data;
        },
        enabled: !isDemo,
    });

    const { data: logsData, isLoading } = useQuery({
        queryKey: ["audit-logs", page, startDate, endDate, selectedUser, selectedAction],
        queryFn: async () => {
            let query = supabase
                .from("audit_logs")
                .select(`
          id,
          created_at,
          action,
          reason,
          before_json,
          after_json,
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
        `, { count: "exact" });

            if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
            if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);
            if (selectedUser !== "all") query = query.eq("user_id", selectedUser);
            if (selectedAction !== "all") {
                query = query.eq("action", selectedAction as Database["public"]["Enums"]["audit_action"]);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order("created_at", { ascending: false })
                .range(from, to);

            if (error) {
                console.error("Erro ao buscar logs:", error);
                throw error;
            }
            return {
                logs: data as unknown as AuditLog[],
                totalCount: count || 0
            };
        },
        enabled: !isDemo,
    });

    const realLogs = logsData?.logs || [];
    const totalCount = logsData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Use direct getter for synchronous demo data access
    const logs = isDemo ? getLogs() : realLogs;

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Trilha de Auditoria</h1>
                        <p className="text-muted-foreground">Histórico de anulações, ajustes e alterações de segurança</p>
                    </div>

                    {!isDemo && (
                        <div className="flex flex-wrap gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase ml-1">Início</Label>
                                <Input
                                    type="date"
                                    className="h-8 text-xs w-[130px]"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase ml-1">Fim</Label>
                                <Input
                                    type="date"
                                    className="h-8 text-xs w-[130px]"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase ml-1">Usuário</Label>
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger className="h-8 text-xs w-[150px]">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os usuários</SelectItem>
                                        {users?.map(u => (
                                            <SelectItem key={u.user_id} value={u.user_id}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase ml-1">Ação</Label>
                                <Select value={selectedAction} onValueChange={setSelectedAction}>
                                    <SelectTrigger className="h-8 text-xs w-[110px]">
                                        <SelectValue placeholder="Todas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        <SelectItem value="void">Anulações</SelectItem>
                                        <SelectItem value="edit">Edições</SelectItem>
                                        <SelectItem value="change">Segurança</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {(startDate || endDate || selectedUser !== "all" || selectedAction !== "all") && (
                                <div className="flex items-end pb-0.5">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            setStartDate("");
                                            setEndDate("");
                                            setSelectedUser("all");
                                            setSelectedAction("all");
                                            setPage(1);
                                        }}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HistoryIcon className="h-5 w-5 text-primary" />
                            Logs de Atividade
                        </CardTitle>
                        {!isDemo && totalCount > 0 && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                                {totalCount} {totalCount === 1 ? "registro" : "registros"}
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-20 text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/40 mb-2" />
                                <p className="text-xs text-muted-foreground animate-pulse">Buscando registros...</p>
                            </div>
                        ) : !logs || logs.length === 0 ? (
                            <div className="py-12 text-center">
                                <Search className="h-10 w-10 text-muted/30 mx-auto mb-3" />
                                <p className="text-muted-foreground text-sm font-medium">Nenhum log encontrado para estes filtros</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-md border border-border/40">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Timestamp</TableHead>
                                                <TableHead>Ação</TableHead>
                                                <TableHead>Contexto / Usuário</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                                <TableHead>Detalhes</TableHead>
                                                <TableHead className="w-[200px] border-l font-bold text-destructive/80">Justificativa</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.map((log) => {
                                                const t = log.transactions;
                                                const isSecurity = log.action === 'change';

                                                return (
                                                    <TableRow key={log.id} className={isSecurity ? "bg-muted/5 italic" : "bg-card"}>
                                                        <TableCell className="text-[10px] font-mono whitespace-nowrap opacity-60">
                                                            {format(new Date(log.created_at), "dd/MM HH:mm:ss")}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {isSecurity ? (
                                                                    <Badge variant="outline" className="bg-blue-500/5 text-blue-500 border-blue-500/20 text-[9px] px-1.5 h-5 uppercase">
                                                                        <ShieldCheck className="h-3 w-3 mr-1" /> Segurança
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className={`${log.action === 'void' ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-warning/5 text-warning border-warning/20'} text-[9px] px-1.5 h-5 uppercase`}>
                                                                        {log.action === 'void' ? 'Anulação' : 'Edição'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <UserIcon className="h-3 w-3 text-muted-foreground/60" />
                                                                    <span className="text-xs font-semibold">{log.profiles?.name || "Sistema"}</span>
                                                                </div>
                                                                {t?.module && (
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {t.origin_fund || t.entity?.type?.toUpperCase()} • {MODULE_LABELS[t.module] || t.module}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className={`text-right font-mono text-xs tabular-nums ${t?.direction === "in" || t?.module === "aporte_saldo" ? "text-success" : "text-destructive"}`}>
                                                            {t ? (
                                                                <>
                                                                    {t.direction === "in" || t.module === "aporte_saldo" ? "+" : "-"}
                                                                    {formatCurrencyBRL(Number(t.amount))}
                                                                </>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="max-w-[300px]">
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-xs leading-tight line-clamp-2">
                                                                    {t?.description || (isSecurity ? "Evento de Segurança (Role/Status)" : "-")}
                                                                </p>
                                                                {t?.merchant?.name && (
                                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                        <MapPin className="h-2.5 w-2.5" /> {t.merchant.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs border-l bg-muted/5 font-medium px-4 py-3 leading-relaxed">
                                                            <div className="flex items-start gap-2">
                                                                <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 shrink-0" />
                                                                <span className="text-foreground/80 italic">"{log.reason || "Nenhuma justificativa fornecida"}"</span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {!isDemo && totalPages > 1 && (
                                    <div className="flex justify-center pt-2">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (page > 1) setPage(p => p - 1);
                                                        }}
                                                        className={page === 1 ? "pointer-events-none opacity-50" : ""}
                                                    />
                                                </PaginationItem>

                                                <div className="flex items-center gap-2 mx-4 text-sm text-muted-foreground">
                                                    Página <span className="font-bold text-foreground">{page}</span> de {totalPages}
                                                </div>

                                                <PaginationItem>
                                                    <PaginationNext
                                                        href="#"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            if (page < totalPages) setPage(p => p + 1);
                                                        }}
                                                        className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
