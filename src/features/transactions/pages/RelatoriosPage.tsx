import { useState } from "react";
import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  Copy,
  MessageCircle,
  FileText,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { useDashboardData, useReportData } from "@/features/dashboard/hooks/use-dashboard-data";
import { useAllTransactionsWithCreator } from "@/features/transactions/hooks/use-entity-transactions";
import { useEntities } from "@/shared/hooks/use-accounts";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { formatDateBR, getWeekStartDate, formatDateString, getTodayString } from "@/shared/lib/date-utils";
import { MODULE_LABELS } from "@/shared/lib/constants";
import { DateInput } from "@/shared/components/forms/DateInput";
import { useReports } from "@/features/transactions/hooks/use-reports";
import { Switch } from "@/shared/ui/switch";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";

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

  // Reporting Hook - NOW PASSING showResources AND associacaoId
  const reports = useReports(startDate, endDate, dashboardData, reportData, transactions, showResources, associacaoId);

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
                <TransactionTable
                  transactions={filteredTransactions}
                  isLoading={transactionsLoading}
                  showOrigin
                  showAccount
                  showMerchant
                  showMethod
                  showShift
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
