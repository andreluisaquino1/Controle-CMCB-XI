import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Copy,
  MessageCircle,
  FileText,
  FileSpreadsheet,
  Loader2,
  Search,
  Filter,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useAllTransactionsWithCreator } from "@/hooks/use-entity-transactions";
import { useVoidTransaction } from "@/hooks/use-transactions";
import { formatCurrencyBRL } from "@/lib/currency";
import { formatDateBR, getWeekStartDate, formatDateString, getTodayString } from "@/lib/date-utils";
import { MODULE_LABELS } from "@/lib/constants";
import { DateInput } from "@/components/forms/DateInput";

export default function RelatoriosPage() {
  const { toast } = useToast();

  // Date range state
  const [startDate, setStartDate] = useState(formatDateString(getWeekStartDate()));
  const [endDate, setEndDate] = useState(getTodayString());

  // Transactions filter state
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const voidTransaction = useVoidTransaction();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  // Fetch data with date range
  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardData(startDate, endDate);
  const { data: transactions, isLoading: transactionsLoading } = useAllTransactionsWithCreator(startDate, endDate);

  const filteredTransactions = (transactions || []).filter((t) => {
    const matchesFilter = filter === "all" || t.module === filter;
    const matchesSearch =
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      MODULE_LABELS[t.module]?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const generateWhatsAppReport = (): string => {
    if (!dashboardData) return "";

    const startStr = formatDateBR(startDate);
    const endStr = formatDateBR(endDate);

    let report = `📊 *PRESTAÇÃO DE CONTAS CMCB-XI*\n`;
    report += `📅 DE ${startStr} À ${endStr}\n\n`;

    report += `🏛️ *ASSOCIAÇÃO*\n`;
    report += `├ Saldo Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}\n`;
    report += `├ Saldo PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}\n`;
    report += `├ Saldo Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}\n`;
    report += `├ Gastos Espécie: ${formatCurrencyBRL(dashboardData.weeklyExpensesCash)}\n`;
    report += `├ Gastos PIX: ${formatCurrencyBRL(dashboardData.weeklyExpensesPix)}\n`;
    report += `├ Entradas Espécie: ${formatCurrencyBRL(dashboardData.weeklyEntriesCash)}\n`;
    report += `└ Entradas PIX: ${formatCurrencyBRL(dashboardData.weeklyEntriesPix)}\n\n`;

    report += `💳 *Saldos dos Estabelecimentos*\n`;
    const activeMerchants = (dashboardData.merchantBalances || []).filter(m => Number(m.balance) !== 0);

    if (activeMerchants.length === 0) {
      report += `└ (Todos os saldos zerados)\n`;
    } else {
      activeMerchants.forEach((m, i) => {
        const prefix = i === activeMerchants.length - 1 ? "└" : "├";
        report += `${prefix} ${m.name}: ${formatCurrencyBRL(Number(m.balance))}\n`;
      });
    }

    return report;
  };

  const copyReport = () => {
    const report = generateWhatsAppReport();
    navigator.clipboard.writeText(report);
    toast({
      title: "Copiado!",
      description: "Relatório copiado para a área de transferência.",
    });
  };

  const openWhatsApp = () => {
    const report = generateWhatsAppReport();
    const encoded = encodeURIComponent(report);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const handleVoidTx = async () => {
    if (!voidingId || !voidReason.trim()) return;
    await voidTransaction.mutateAsync({ transactionId: voidingId, reason: voidReason });
    setVoidingId(null);
    setVoidReason("");
  };

  const exportExcel = async () => {
    if (!dashboardData || !transactions) return;

    toast({ title: "Processando...", description: "Preparando planilha Excel..." });

    try {
      // Dynamically import XLSX
      const XLSX = await import("xlsx");

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["Prestação de Contas CMCB-XI"],
        [`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`],
        [],
        ["ASSOCIAÇÃO"],
        ["Saldo Espécie", formatCurrencyBRL(dashboardData.especieBalance)],
        ["Saldo PIX", formatCurrencyBRL(dashboardData.pixBalance)],
        ["Saldo Cofre", formatCurrencyBRL(dashboardData.cofreBalance)],
        ["Gastos Espécie", formatCurrencyBRL(dashboardData.weeklyExpensesCash)],
        ["Gastos PIX", formatCurrencyBRL(dashboardData.weeklyExpensesPix)],
        ["Entradas Espécie", formatCurrencyBRL(dashboardData.weeklyEntriesCash)],
        ["Entradas PIX", formatCurrencyBRL(dashboardData.weeklyEntriesPix)],
        [],
        ["SALDOS EM ESTABELECIMENTOS"],
        ...(dashboardData.merchantBalances || []).map(m => [m.name, formatCurrencyBRL(Number(m.balance))]),
      ];
      const wsSum = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSum, "Resumo");

      // Transactions sheet
      const txHeaders = ["Data", "Origem", "Conta", "Estabelecimento", "Valor", "Descrição", "Observação", "Registrado por"];
      const txData = transactions.map(t => [
        formatDateBR(t.transaction_date),
        t.entity_name || "-",
        t.source_account_name || t.destination_account_name || "-",
        t.merchant_name || "-",
        formatCurrencyBRL(Number(t.amount)),
        t.description || "-",
        t.notes || "-",
        t.creator_name || "-",
      ]);
      const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txData]);
      XLSX.utils.book_append_sheet(wb, wsTx, "Transações");

      // Save
      XLSX.writeFile(wb, `prestacao-contas-${startDate}-${endDate}.xlsx`);
      toast({ title: "Sucesso", description: "Arquivo Excel exportado." });
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast({ title: "Erro", description: "Não foi possível gerar o Excel.", variant: "destructive" });
    }
  };

  const exportPDF = async () => {
    if (!dashboardData || !transactions) return;

    toast({ title: "Processando...", description: "Preparando relatório PDF..." });

    try {
      // Dynamically import jsPDF and autoTable
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Prestação de Contas CMCB-XI", 14, 20);
      doc.setFontSize(12);
      doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, 14, 30);

      // Associação
      doc.setFontSize(14);
      doc.text("Associação", 14, 45);
      doc.setFontSize(10);
      doc.text(`Saldo Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}`, 14, 55);
      doc.text(`Saldo PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}`, 14, 62);
      doc.text(`Saldo Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}`, 14, 69);
      doc.text(`Gastos Espécie: ${formatCurrencyBRL(dashboardData.weeklyExpensesCash)}`, 14, 76);
      doc.text(`Gastos PIX: ${formatCurrencyBRL(dashboardData.weeklyExpensesPix)}`, 14, 83);
      doc.text(`Entradas Espécie: ${formatCurrencyBRL(dashboardData.weeklyEntriesCash)}`, 14, 90);
      doc.text(`Entradas PIX: ${formatCurrencyBRL(dashboardData.weeklyEntriesPix)}`, 14, 97);

      // Saldos
      doc.setFontSize(14);
      doc.text("Saldos dos Estabelecimentos", 14, 112);

      let yPos = 122;
      doc.setFontSize(10);
      (dashboardData.merchantBalances || []).forEach(m => {
        doc.text(`${m.name}: ${formatCurrencyBRL(Number(m.balance))}`, 14, yPos);
        yPos += 7;
      });

      // Transactions table
      if (transactions.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Transações", 14, 20);

        autoTable(doc, {
          startY: 30,
          head: [["Data", "Tipo", "Valor", "Descrição"]],
          body: transactions.slice(0, 50).map(t => [
            formatDateBR(t.transaction_date),
            MODULE_LABELS[t.module] || t.module,
            formatCurrencyBRL(Number(t.amount)),
            t.description || "-",
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [196, 30, 58] },
        });
      }

      doc.save(`prestacao-contas-${startDate}-${endDate}.pdf`);
      toast({ title: "Sucesso", description: "Arquivo PDF exportado." });
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast({ title: "Erro", description: "Não foi possível gerar o PDF.", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Relatórios, transações e exportação de dados
          </p>
        </div>

        <Tabs defaultValue="whatsapp" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            <TabsTrigger value="transacoes">Transações</TabsTrigger>
            <TabsTrigger value="exportacao">Exportação</TabsTrigger>
          </TabsList>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-6">
            {/* Date Range */}
            <Card>
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

            {/* WhatsApp Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-5 w-5 text-success" />
                  Relatório WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                  {dashboardLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : generateWhatsAppReport()}
                </div>
                <div className="flex gap-3">
                  <Button onClick={copyReport} variant="outline" className="flex-1" disabled={dashboardLoading}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Texto
                  </Button>
                  <Button onClick={openWhatsApp} className="flex-1 bg-success hover:bg-success/90" disabled={dashboardLoading}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Abrir WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transações Tab */}
          <TabsContent value="transacoes" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="grid gap-4 sm:grid-cols-2 flex-1">
                    <div className="space-y-2">
                      <Label>Data Inicial</Label>
                      <DateInput value={startDate} onChange={setStartDate} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Final</Label>
                      <DateInput value={endDate} onChange={setEndDate} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
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
                      <SelectItem value="aporte_saldo">Aportes</SelectItem>
                      <SelectItem value="consumo_saldo">Consumos</SelectItem>
                      <SelectItem value="pix_direto_uecx">Recursos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
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
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Registrado por</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((t) => (
                          <TableRow key={t.id} className={t.status === 'voided' ? 'opacity-50 grayscale' : ''}>
                            <TableCell className="whitespace-nowrap">
                              {formatDateBR(t.transaction_date)}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                                {MODULE_LABELS[t.module] || t.module}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {t.description || "-"}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${t.direction === "in" ? "text-success" :
                              t.direction === "out" ? "text-destructive" : ""
                              }`}>
                              {t.direction === "in" ? "+" : t.direction === "out" ? "-" : ""}
                              {formatCurrencyBRL(Number(t.amount))}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {t.creator_name || "-"}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${t.status === "posted"
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                                }`}>
                                {t.status === "posted" ? "Ativo" : "Anulado"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {t.status === 'posted' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setVoidingId(t.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exportação Tab */}
          <TabsContent value="exportacao" className="space-y-6">
            {/* Date Range */}
            <Card>
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

            {/* Export Options */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card
                className="cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={exportExcel}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Exportar Excel</h3>
                      <p className="text-sm text-muted-foreground">Planilha com resumo e transações</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={dashboardLoading || transactionsLoading}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-elevated transition-shadow"
                onClick={exportPDF}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">Exportar PDF</h3>
                      <p className="text-sm text-muted-foreground">Relatório formatado</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={dashboardLoading || transactionsLoading}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Void Transaction Dialog */}
        <Dialog open={!!voidingId} onOpenChange={(open) => !open && setVoidingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Anular Lançamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Motivo da Anulação *</Label>
                <Input
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ex: Erro de digitação"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-destructive/5 p-2 rounded border border-destructive/20">
                <strong>Atenção:</strong> Esta ação é irreversível e afetará permanentemente os saldos atuais para refletir a correção.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleVoidTx}
                disabled={voidTransaction.isPending || !voidReason.trim()}
              >
                {voidTransaction.isPending ? "Anulando..." : "Confirmar Anulação"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
