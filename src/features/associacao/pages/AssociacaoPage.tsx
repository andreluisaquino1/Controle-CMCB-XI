import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useExpenseShortcuts } from "@/features/transactions/hooks/use-expense-shortcuts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { useState } from "react";
import { Building2, Banknote, CreditCard, ArrowRightLeft, Settings, Wallet, Loader2, XCircle, X, PlusCircle, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";
import { useVoidTransaction } from "@/features/transactions/hooks/use-transactions";
import { useAssociacaoAccounts, useEntities } from "@/shared/hooks/use-accounts";
import { useAssociacaoTransactions } from "@/features/transactions/hooks/use-entity-transactions";
import { formatDateBR } from "@/shared/lib/date-utils";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { ACCOUNT_NAMES, MODULE_LABELS } from "@/shared/lib/constants";
import { useAssociacaoActions } from "@/features/associacao/hooks/use-associacao-actions";
import { VoidTransactionDialog } from "@/shared/components/VoidTransactionDialog";
import { ActionCard } from "@/shared/components/ActionCard";
import { MensalidadeDialog } from "@/features/associacao/components/MensalidadeDialog";
import { GastoAssociacaoDialog } from "@/features/associacao/components/GastoAssociacaoDialog";
import { MovimentarSaldoDialog } from "@/features/associacao/components/MovimentarSaldoDialog";
import { AjustarSaldoDialog } from "@/features/recursos/components/AjustarSaldoDialog";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { PixFeeBatchDialog } from "@/features/associacao/components/PixFeeBatchDialog";
import { PixNaoIdentificadoDialog } from "@/features/associacao/components/PixNaoIdentificadoDialog";
import { FileText, Ghost, ListPlus } from "lucide-react";
import { TransactionExportActions } from "@/features/transactions/components/TransactionExportActions";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { startOfMonth } from "date-fns";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { useApproveTransaction } from "@/features/transactions/hooks/use-transactions";
import { useReportData } from "@/features/dashboard/hooks/use-dashboard-data";
import { getWeekStartDate, formatDateString, getTodayString } from "@/shared/lib/date-utils";

export default function AssociacaoPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: formatDateString(startOfMonth(new Date())),
    end: getTodayString()
  });
  const [searchTerm, setSearchTerm] = useState("");

  const voidTransaction = useVoidTransaction();
  const { data: accounts, isLoading: accountsLoading } = useAssociacaoAccounts();
  const { data: entities } = useEntities();
  const { data: transitions, isLoading: transactionsLoading } = useAssociacaoTransactions(dateRange.start, dateRange.end);
  const { isSecretaria, isAdmin, profile } = useAuth();
  const approveTransaction = useApproveTransaction();

  const weekStart = getWeekStartDate();
  const weekStartStr = formatDateString(weekStart);
  const todayStr = getTodayString();

  const { data: reportData } = useReportData(
    weekStartStr,
    todayStr,
    entities?.find(e => e.type === "associacao")?.id
  );

  const totalWeeklyEntries = (reportData?.weeklyEntriesCash || 0) + (reportData?.weeklyEntriesPix || 0);

  const { shortcuts: expenseShortcuts, addShortcut, removeShortcut } = useExpenseShortcuts();

  const associacaoEntity = entities?.find(e => e.type === "associacao");
  const specieAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE);
  const cofreAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.COFRE);
  const pixAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.PIX);

  const {
    state,
    setters,
    handlers,
    isLoading: actionsLoading
  } = useAssociacaoActions(accounts || [], associacaoEntity);

  const contaDigitalAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.CONTA_DIGITAL);

  const { mensalidade, gasto, mov, ajuste } = state;
  const {
    setMensalidadeDate, setMensalidadeTurno, setMensalidadeCash, setMensalidadePix, setMensalidadeObs,
    setGastoDate, setGastoMeio, setGastoObs,
    setMovDate, setMovDe, setMovPara, setMovValor, setMovDescricao, setMovObs,
    setMovTaxa,
    setAjusteDate, setAjusteAccountId, setAjusteValor, setAjusteMotivo, setAjusteObs,
  } = setters;
  const {
    handleMensalidadeSubmit, handleMovimentarSubmit,
    handleAjusteSubmit,
    resetMensalidade, resetGasto, resetMov, resetAjuste
  } = handlers;


  // Void transaction state
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const handleVoidTx = async () => {
    if (!voidingId || !voidReason.trim()) return;
    await voidTransaction.mutateAsync({ transactionId: voidingId, reason: voidReason });
    setVoidingId(null);
    setVoidReason("");
  };

  const getAccountDisplayName = (name: string) => {
    if (name === ACCOUNT_NAMES.ESPECIE) return "Espécie";
    if (name === ACCOUNT_NAMES.COFRE) return "Cofre";
    if (name === ACCOUNT_NAMES.PIX) return "PIX (Conta BB)";
    if (name === ACCOUNT_NAMES.CONTA_DIGITAL) return "Conta Digital (Escolaweb)";
    return name;
  };

  const totalBalance = (Number(specieAccount?.balance || 0)) +
    (Number(pixAccount?.balance || 0)) +
    (Number(contaDigitalAccount?.balance || 0)) +
    (Number(cofreAccount?.balance || 0));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Associação</h1>
            <p className="text-muted-foreground">
              Gestão de mensalidades, gastos e movimentações
            </p>
          </div>
          {!isSecretaria && (
            <div className="bg-primary/10 px-3 py-1.5 rounded-full flex items-center gap-2 border border-primary/20">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Saldo Total</span>
              {accountsLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <span className="text-sm font-bold text-foreground tabular-nums">{formatCurrencyBRL(totalBalance)}</span>
              )}
            </div>
          )}
        </div>

        {/* Balances */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isSecretaria ? (
            <Card className="stat-card-success lg:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Entradas da Semana (Arrecadação)
                </CardTitle>
                <div className="text-xs text-muted-foreground">
                  Período: {formatDateBR(weekStartStr)} até hoje
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {formatCurrencyBRL(totalWeeklyEntries)}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>

              <Card className="stat-card-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Espécie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrencyBRL(Number(specieAccount?.balance || 0))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="stat-card-secondary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    PIX (Conta BB)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className={`text-2xl font-bold ${(Number(pixAccount?.balance || 0)) < 0 ? "text-destructive" : "text-foreground"}`}>
                      {formatCurrencyBRL(Number(pixAccount?.balance || 0))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="stat-card-primary border-l-indigo-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Conta Digital (Escolaweb)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className={`text-2xl font-bold ${(Number(contaDigitalAccount?.balance || 0)) < 0 ? "text-destructive" : "text-foreground"}`}>
                      {formatCurrencyBRL(Number(contaDigitalAccount?.balance || 0))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="stat-card-accent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Cofre
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrencyBRL(cofreAccount?.balance || 0)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions Consolidated with Visual Hierarchy */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Row 1 - Stronger Colors */}
          <ActionCard
            title="Mensalidades"
            description="Registrar entrada de alunos"
            icon={Banknote}
            variant="success"
            onClick={() => setOpenDialog("mensalidade")}
            className="bg-success/15 border-l-success shadow-sm"
          />

          <ActionCard
            title="Despesa Associação"
            description="Registrar pagamento direto"
            icon={CreditCard}
            variant="destructive"
            onClick={() => setOpenDialog("gasto")}
            className="bg-destructive/15 border-l-destructive shadow-sm"
          />

          {!isSecretaria && (
            <>
              <ActionCard
                title="Movimentar Saldo"
                description="Transferência ou Depósito"
                icon={ArrowRightLeft}
                variant="secondary"
                onClick={() => setOpenDialog("movimentar")}
                className="bg-secondary/15 border-l-secondary shadow-sm"
              />

              {/* Row 2 - Subtle Colors */}
              <ActionCard
                title="PIX Fantasma"
                description="Registrar PIX não identificado"
                icon={Ghost}
                variant="warning"
                onClick={() => setOpenDialog("pix_nao_id")}
                className="opacity-80 border-l-amber-500/50"
              />

              <ActionCard
                title="Taxas PIX"
                description="Lançar tarifas em lote"
                icon={FileText}
                variant="info"
                onClick={() => setOpenDialog("pix_batch")}
                className="opacity-80 border-l-blue-600/50"
              />

              <ActionCard
                title="Ajustar Saldo"
                description="Correção ou valor inicial"
                icon={Settings}
                variant="warning"
                onClick={() => setOpenDialog("ajuste")}
                className="opacity-80 border-l-warning/50"
              />
            </>
          )}
        </div>


      </div>

      <TransactionFilters
        startDate={dateRange.start}
        endDate={dateRange.end}
        onDateChange={(start, end) => setDateRange({ start, end })}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClear={() => {
          setDateRange({
            start: formatDateString(startOfMonth(new Date())),
            end: getTodayString()
          });
          setSearchTerm("");
        }}
        isLoading={transactionsLoading}
      />

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Histórico da Associação
            </CardTitle>
            <TransactionExportActions transactions={transitions} filename="associacao_relatorio" />
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transitions?.filter(t => {
              // Status Filter
              if (t.status === 'voided') return false;

              // Permission Filter
              if (isSecretaria && t.created_by !== profile?.user_id) return false;

              // Search Filter
              if (!searchTerm) return true;

              const searchLower = searchTerm.toLowerCase();
              const description = t.description?.toLowerCase() || '';
              const amount = t.amount?.toString() || '';
              const tx = t as unknown as { account?: { name?: string }; category?: string; metadata?: Record<string, string> | null; description?: string; amount?: number; status?: string; created_by?: string };
              const accountName = tx.account?.name?.toLowerCase() || '';
              const category = tx.category?.toLowerCase() || '';
              const obs = tx.metadata && typeof tx.metadata === 'object' ?
                (tx.metadata.observation || tx.metadata.notes || '').toLowerCase() : '';

              return description.includes(searchLower) ||
                amount.includes(searchLower) ||
                accountName.includes(searchLower) ||
                category.includes(searchLower) ||
                obs.includes(searchLower);
            }) || []}
            isLoading={transactionsLoading}
            onVoid={(id) => setVoidingId(id)}
            onValidate={!isSecretaria ? (id) => approveTransaction.mutate(id) : undefined}
            isValidating={approveTransaction.isPending}
            showShift={true}
            showMethod={true}
          />
        </CardContent>
      </Card>

      {/* Footer Info Section - Collapsible */}
      <Card className="bg-muted/30 border-dashed overflow-hidden">
        <CardHeader
          className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowInfo(!showInfo)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-md font-semibold text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Informações da Associação CMCB-XI
            </CardTitle>
            {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showInfo && (
          <CardContent className="pt-2 pb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">Institucional:</h4>
                  <p className="text-sm text-muted-foreground"><strong>CNPJ:</strong> 37.812.756/0001-45</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Responsável pela gestão das mensalidades voluntárias e custeio das despesas operacionais.
                  </p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2">Canais de Recebimento:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-background/50 p-2 rounded border border-border/50 text-[11px]">
                    <span className="font-semibold block">PIX (Banco do Brasil)</span>
                    Ag: 0782-0 | CC: 36500-9
                  </div>
                  <div className="bg-background/50 p-2 rounded border border-border/50 text-[11px]">
                    <span className="font-semibold block">Escolaweb</span>
                    Mensalidades recorrentes e sistema de taxas.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Void Transaction Dialog */}
      <VoidTransactionDialog
        open={!!voidingId}
        onClose={() => setVoidingId(null)}
        reason={voidReason}
        onReasonChange={setVoidReason}
        onConfirm={handleVoidTx}
        isPending={voidTransaction.isPending}
        inputId="void-reason-assoc"
      />

      {/* Dialogs shifted outside the main content for better organization */}
      <MensalidadeDialog
        open={openDialog === "mensalidade"}
        onOpenChange={(o) => {
          setOpenDialog(o ? "mensalidade" : null);
          if (!o) resetMensalidade();
        }}
        state={mensalidade}
        setters={{
          setDate: setMensalidadeDate,
          setTurno: setMensalidadeTurno,
          setCash: setMensalidadeCash,
          setPix: setMensalidadePix,
          setObs: setMensalidadeObs,
        }}
        onSubmit={handleMensalidadeSubmit}
        isLoading={actionsLoading}
      />

      <GastoAssociacaoDialog
        open={openDialog === "gasto"}
        onOpenChange={(o) => {
          setOpenDialog(o ? "gasto" : null);
          if (!o) resetGasto();
        }}
        state={gasto}
        setters={{
          setDate: setGastoDate,
          setMeio: setGastoMeio,
          setObs: setGastoObs,
        }}
        shortcuts={expenseShortcuts}
        addShortcut={addShortcut}
        removeShortcut={removeShortcut}
        onSubmit={handlers.handleGastoSubmit}
        isLoading={actionsLoading}
      />

      <MovimentarSaldoDialog
        open={openDialog === "movimentar"}
        onOpenChange={(o) => {
          setOpenDialog(o ? "movimentar" : null);
          if (!o) resetMov();
        }}
        state={mov}
        setters={{
          setDate: setMovDate,
          setDe: setMovDe,
          setPara: setMovPara,
          setValor: setMovValor,
          setTaxa: setMovTaxa,
          setDescricao: setMovDescricao,
          setObs: setMovObs,
        }}
        accounts={accounts || []}
        onSubmit={handleMovimentarSubmit}
        isLoading={actionsLoading}
      />

      <AjustarSaldoDialog
        open={openDialog === "ajuste"}
        onOpenChange={(o) => {
          setOpenDialog(o ? "ajuste" : null);
          if (!o) handlers.resetAjuste();
        }}
        state={ajuste}
        setters={{
          setDate: setters.setAjusteDate,
          setAccountId: setters.setAjusteAccountId,
          setValor: setters.setAjusteValor,
          setMotivo: setters.setAjusteMotivo,
          setObs: setters.setAjusteObs,
        }}
        accounts={accounts || []}
        onSubmit={handlers.handleAjusteSubmit}
        isLoading={actionsLoading}
      />

      <PixFeeBatchDialog
        open={openDialog === "pix_batch"}
        onOpenChange={(o) => setOpenDialog(o ? "pix_batch" : null)}
        entityId={associacaoEntity?.id || null}
      />

      <PixNaoIdentificadoDialog
        open={openDialog === "pix_nao_id"}
        onOpenChange={(o) => setOpenDialog(o ? "pix_nao_id" : null)}
        entityId={associacaoEntity?.id || null}
      />
    </DashboardLayout >
  );
}
