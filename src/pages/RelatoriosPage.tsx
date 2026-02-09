import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  MessageCircle,
  FileText,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { useDashboardData, useReportData } from "@/hooks/use-dashboard-data";
import { useAllTransactionsWithCreator } from "@/hooks/use-entity-transactions";
import { useEntities } from "@/hooks/use-accounts";
import { formatCurrencyBRL } from "@/lib/currency";
import { formatDateBR, getWeekStartDate, formatDateString, getTodayString } from "@/lib/date-utils";
import { MODULE_LABELS } from "@/lib/constants";
import { DateInput } from "@/components/forms/DateInput";
import { useReports } from "@/hooks/use-reports";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RelatoriosPage() {
  // Date range state
  const [startDate, setStartDate] = useState(formatDateString(getWeekStartDate()));
  const [endDate, setEndDate] = useState(getTodayString());
  const [showResources, setShowResources] = useState(false);

  // Transactions filter state
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch current balances
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData();

  // Fetch entities to get association ID
  const { data: entities } = useEntities();
  const associacaoId = entities?.find(e => e.type === 'associacao')?.id;

  // Fetch period-based summary
  const { data: reportData, isLoading: reportLoading } = useReportData(startDate, endDate, associacaoId);
  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useAllTransactionsWithCreator(startDate, endDate);

  // Reporting Hook - NOW PASSING showResources
  const reports = useReports(startDate, endDate, dashboardData, reportData, transactions, showResources);

  const filteredTransactions = (transactions || []).filter((t) => {
    const matchesFilter = filter === "all" || t.module === filter;
    const matchesSearch =
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      MODULE_LABELS[t.module]?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Prestação de contas e histórico de movimentações
          </p>
        </div>

        {/* Global Date Controls */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <DateInput value={startDate} onChange={setStartDate} />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <DateInput value={endDate} onChange={setEndDate} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* REPORTE WHATSAPP + EXPORT */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/50 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-success" />
              Preview do Relatório (WhatsApp)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Toggle Resources */}
            <div className="flex items-center space-x-2 p-4 bg-muted/30 rounded-lg border">
              <Switch
                id="show-resources"
                checked={showResources}
                onCheckedChange={setShowResources}
              />
              <Label htmlFor="show-resources" className="cursor-pointer font-medium">
                Incluir saldos dos Recursos (UE/CX)
              </Label>
            </div>

            {/* Preview Box */}
            <div className="bg-white dark:bg-zinc-950 border rounded-lg p-6 font-mono text-sm whitespace-pre-wrap shadow-inner relative min-h-[200px]">
              {(dashboardLoading || reportLoading) ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : null}
              {reports.getWhatsAppReportText()}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button onClick={reports.copyReport} variant="outline" className="flex-1" disabled={dashboardLoading}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Texto
              </Button>
              <Button onClick={reports.openWhatsApp} className="flex-1 bg-success hover:bg-success/90 text-white" disabled={dashboardLoading}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Abrir WhatsApp
              </Button>
              <Button onClick={reports.exportPDF} className="flex-1 bg-primary hover:bg-primary/90" disabled={dashboardLoading || transactionsLoading}>
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
            <p className="text-xs text-center text-muted-foreground px-4">
              O PDF exportado conterá exatamente as informações acima, acrescidas da tabela detalhada de transações do período.
            </p>
          </CardContent>
        </Card>

        {/* TRANSACOES SECTION */}
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 md:hidden" />
            Histórico do Período
          </h2>

          <Card>
            <CardContent className="pt-6">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar transações..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="mensalidade">Mensalidades</SelectItem>
                    <SelectItem value="gasto_associacao">Gastos Associação</SelectItem>
                    <SelectItem value="assoc_transfer">Movimentações Associação</SelectItem>
                    <SelectItem value="especie_transfer">Movimentações Gerais</SelectItem>
                    <SelectItem value="conta_digital_taxa">Taxas Escolaweb</SelectItem>
                    <SelectItem value="conta_digital_ajuste">Ajustes Conta Digital</SelectItem>
                    <SelectItem value="especie_ajuste">Ajustes Espécie</SelectItem>
                    <SelectItem value="pix_ajuste">Ajustes PIX</SelectItem>
                    <SelectItem value="cofre_ajuste">Ajustes Cofre</SelectItem>
                    <SelectItem value="aporte_saldo">Aportes Estabelecimento</SelectItem>
                    <SelectItem value="consumo_saldo">Consumos Estabelecimento</SelectItem>
                    <SelectItem value="pix_direto_uecx">Gasto de Recurso (UE/CX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transactionsLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-muted-foreground">Carregando transações...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground font-medium">Nenhuma transação encontrada no período.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-md border shadow-inner">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Meio</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead>Origem / Conta</TableHead>
                        <TableHead>Estabelecimento</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registrado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t) => (
                        <TableRow key={t.id} className={t.status === 'voided' ? 'opacity-50 grayscale bg-muted/30' : ''}>
                          <TableCell className="whitespace-nowrap font-medium">
                            {formatDateBR(t.transaction_date)}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary-foreground">
                              {MODULE_LABELS[t.module] || t.module}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.payment_method || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.shift || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.source_account_name || t.destination_account_name || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.entity_name || '-'}
                          </TableCell>
                          <TableCell className={`text-right font-bold tabular-nums ${t.direction === "in" ? "text-success" :
                            t.direction === "out" ? "text-destructive" : ""
                            }`}>
                            {t.direction === "in" ? "+" : t.direction === "out" ? "-" : ""}
                            {formatCurrencyBRL(Number(t.amount))}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm" title={t.description || ""}>
                            {t.description || "-"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-muted-foreground text-[10px] italic" title={t.notes || ""}>
                            {t.notes || "-"}
                          </TableCell>
                          <TableCell>
                            {t.ledger_status === 'pending' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                Pendente
                              </span>
                            ) : t.ledger_status === 'validated' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Validado
                              </span>
                            ) : t.status === 'voided' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                Anulado
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                Efetivado
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {t.creator_name || "-"}
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
      </div>
    </DashboardLayout>
  );
}
