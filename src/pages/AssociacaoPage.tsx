import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useExpenseShortcuts } from "@/hooks/use-expense-shortcuts";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Building2, Banknote, CreditCard, ArrowRightLeft, Settings, Wallet, Loader2, XCircle, X, PlusCircle, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { useVoidTransaction } from "@/hooks/use-transactions";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { useAssociacaoTransactions } from "@/hooks/use-entity-transactions";
import { formatDateBR } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { ACCOUNT_NAMES, MODULE_LABELS } from "@/lib/constants";
import { useAssociacaoActions } from "@/hooks/use-associacao-actions";
import { ActionCard } from "@/components/ActionCard";
import { MensalidadeDialog } from "@/components/forms/MensalidadeDialog";
import { GastoAssociacaoDialog } from "@/components/forms/GastoAssociacaoDialog";
import { MovimentarSaldoDialog } from "@/components/forms/MovimentarSaldoDialog";
import { AjustarSaldoDialog } from "@/components/forms/AjustarSaldoDialog";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { PixFeeBatchDialog } from "@/components/forms/PixFeeBatchDialog";
import { PixNaoIdentificadoDialog } from "@/components/forms/PixNaoIdentificadoDialog";
import { FileText, Ghost, ListPlus } from "lucide-react";
import { TransactionExportActions } from "@/components/transactions/TransactionExportActions";

export default function AssociacaoPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const voidTransaction = useVoidTransaction();
  const { data: accounts, isLoading: accountsLoading } = useAssociacaoAccounts();
  const { data: entities } = useEntities();
  const { data: transitions, isLoading: transactionsLoading } = useAssociacaoTransactions();
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

  const selectedSourceAccount = accounts?.find(a => a.id === mov.de);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Associação</h1>
          <p className="text-muted-foreground">
            Gestão de mensalidades, gastos e movimentações
          </p>
        </div>

        {/* Balances */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyBRL(Number(specieAccount?.balance || 0))}
                </p>
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
                <p className={`text-2xl font-bold ${(Number(pixAccount?.balance || 0)) < 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatCurrencyBRL(Number(pixAccount?.balance || 0))}
                </p>
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
                <p className={`text-2xl font-bold ${(Number(contaDigitalAccount?.balance || 0)) < 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatCurrencyBRL(Number(contaDigitalAccount?.balance || 0))}
                </p>
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
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyBRL(cofreAccount?.balance || 0)}
                </p>
              )}
            </CardContent>
          </Card>
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
        </div>


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
              transactions={transitions}
              isLoading={transactionsLoading}
              onVoid={(id) => setVoidingId(id)}
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
        <Dialog open={!!voidingId} onOpenChange={(open) => !open && setVoidingId(null)}>
          <DialogContent className="w-[95vw] max-w-md border-destructive/20">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Anular Lançamento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="void-reason-assoc">Motivo da Anulação <span className="text-destructive">*</span></Label>
                <Input
                  id="void-reason-assoc"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ex: Valor digitado errado"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground italic">Mínimo de 3 caracteres para confirmar.</p>
              </div>
              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive-foreground font-medium">
                  <strong>Atenção:</strong> Esta ação é irreversível e reverterá o impacto financeiro no saldo das contas envolvidas imediatamente.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setVoidingId(null)}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleVoidTx}
                  disabled={voidTransaction.isPending || voidReason.trim().length < 3}
                >
                  {voidTransaction.isPending ? "Anulando..." : "Confirmar Anulação"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
