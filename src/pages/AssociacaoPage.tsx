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
import { Building2, Banknote, CreditCard, ArrowRightLeft, Settings, Wallet, Loader2, XCircle, X, PlusCircle } from "lucide-react";
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

export default function AssociacaoPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const voidTransaction = useVoidTransaction();
  const { data: accounts, isLoading: accountsLoading } = useAssociacaoAccounts();
  const { data: entities } = useEntities();
  const { data: transitions, isLoading: transactionsLoading } = useAssociacaoTransactions();

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

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Mensalidades */}
          <ActionCard
            title="Mensalidades"
            description="Registrar entrada de alunos"
            icon={Banknote}
            variant="success"
            onClick={() => setOpenDialog("mensalidade")}
          />

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

          {/* Gastos */}
          <ActionCard
            title="Despesa Associação"
            description="Registrar pagamento direto"
            icon={CreditCard}
            variant="destructive"
            onClick={() => setOpenDialog("gasto")}
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
            onSubmit={async () => true} // Not used as dialog handles its own batch submit
            isLoading={actionsLoading}
          />

          {/* Movimentar Saldo */}
          <ActionCard
            title="Movimentar Saldo"
            description="Transferência ou Depósito"
            icon={ArrowRightLeft}
            variant="secondary"
            onClick={() => setOpenDialog("movimentar")}
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

          {/* Ajustar Saldo */}
          <ActionCard
            title="Ajustar Saldo"
            description="Correção ou valor inicial"
            icon={Settings}
            variant="warning"
            onClick={() => setOpenDialog("ajuste")}
          />

          <AjustarSaldoDialog
            open={openDialog === "ajuste"}
            onOpenChange={(o) => {
              setOpenDialog(o ? "ajuste" : null);
              if (!o) handlers.resetAjuste();
            }}
            state={state.ajuste}
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

          {/* Taxas PIX (Lote) */}
          <ActionCard
            title="Taxas PIX (Lote)"
            description="Lançar tarifas em lote"
            icon={FileText}
            variant="info"
            className="border-l-4 border-l-blue-600"
            onClick={() => setOpenDialog("pix_batch")}
          />

          <PixFeeBatchDialog
            open={openDialog === "pix_batch"}
            onOpenChange={(o) => setOpenDialog(o ? "pix_batch" : null)}
          />

          {/* PIX Não Identificado */}
          <ActionCard
            title="PIX Fantasma"
            description="Registrar PIX não identificado"
            icon={Ghost}
            variant="warning"
            className="border-l-4 border-l-amber-500"
            onClick={() => setOpenDialog("pix_nao_id")}
          />

          <PixNaoIdentificadoDialog
            open={openDialog === "pix_nao_id"}
            onOpenChange={(o) => setOpenDialog(o ? "pix_nao_id" : null)}
          />
        </div>


        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Histórico da Associação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={transitions}
              isLoading={transactionsLoading}
              onVoid={(id) => setVoidingId(id)}
            />
          </CardContent>
        </Card>

        {/* Footer Info Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Sobre a Associação CMCB-XI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">Informações Institucionais:</h4>
                  <p className="text-sm text-muted-foreground"><strong>CNPJ:</strong> 37.812.756/0001-45</p>
                  <p className="text-sm text-muted-foreground text-balance">
                    Responsável pela gestão das mensalidades voluntárias e custeio das despesas operacionais do cotidiano escolar.
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground">Gestão de Recursos:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Arrecadação mensal de sócios contribuintes</li>
                    <li>• Gestão de materiais e serviços da associação</li>
                    <li>• Suporte financeiro imediato via contas locais</li>
                  </ul>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2">Contas Gerenciadas:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-background/50 p-2 rounded border border-border/50">
                    <p className="text-xs font-semibold text-foreground">Espécie & Cofre</p>
                    <p className="text-[10px] text-muted-foreground">Controle físico de valores no local (Bolsinha e Reserva).</p>
                  </div>
                  <div className="bg-background/50 p-2 rounded border border-border/50">
                    <p className="text-xs font-semibold text-foreground">PIX (Banco do Brasil)</p>
                    <p className="text-[10px] text-muted-foreground">Agência: 0782-0 | Conta: 36500-9</p>
                  </div>
                  <div className="bg-background/50 p-2 rounded border border-border/50">
                    <p className="text-xs font-semibold text-foreground">Conta Digital (Escolaweb)</p>
                    <p className="text-[10px] text-muted-foreground">Integração com sistema de taxas e mensalidades recorrentes.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
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
    </DashboardLayout>
  );
}
