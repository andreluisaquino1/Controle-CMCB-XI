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
import { TransactionTable } from "@/components/transactions/TransactionTable";

export default function AssociacaoPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const voidTransaction = useVoidTransaction();
  const { data: accounts, isLoading: accountsLoading } = useAssociacaoAccounts();
  const { data: entities } = useEntities();
  const { data: transactions, isLoading: transactionsLoading } = useAssociacaoTransactions();
  const { shortcuts, addShortcut, removeShortcut } = useExpenseShortcuts();

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

  const { mensalidade, gasto, mov, ajusteEspecie, ajusteCofre } = state;
  const {
    setMensalidadeDate, setMensalidadeTurno, setMensalidadeCash, setMensalidadePix, setMensalidadeObs,
    setGastoDate, setGastoMeio, setGastoValor, setGastoDescricao, setGastoObs,
    setMovDate, setMovDe, setMovPara, setMovValor, setMovDescricao, setMovObs,
    setAjusteEspecieDate, setAjusteEspecieValor, setAjusteEspecieMotivo, setAjusteEspecieObs,
    setAjusteCofreDate, setAjusteCofreValor, setAjusteCofreMotivo, setAjusteCofreObs,
  } = setters;
  const {
    handleMensalidadeSubmit, handleGastoSubmit, handleMovimentarSubmit,
    handleAjusteEspecieSubmit, handleAjusteCofreSubmit,
    resetMensalidade, resetGasto, resetMov
  } = handlers;

  // Shortcuts UI state (kept here as it's purely UI transition)
  const [newShortcut, setNewShortcut] = useState("");
  const [showShortcutInput, setShowShortcutInput] = useState(false);

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
    if (name === ACCOUNT_NAMES.PIX) return "PIX";
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
        <div className="grid gap-4 sm:grid-cols-3">
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
                PIX
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              setValor: setGastoValor,
              setDescricao: setGastoDescricao,
              setObs: setGastoObs,
            }}
            shortcuts={shortcuts}
            addShortcut={addShortcut}
            removeShortcut={removeShortcut}
            onSubmit={handleGastoSubmit}
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
              setDescricao: setMovDescricao,
              setObs: setMovObs,
            }}
            accounts={accounts || []}
            onSubmit={handleMovimentarSubmit}
            isLoading={actionsLoading}
          />
        </div>

        {/* Ajustes Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Ajustes</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ActionCard
              title="Ajustar Espécie"
              description="Correção ou valor inicial"
              icon={Settings}
              variant="warning"
              onClick={() => setOpenDialog("ajuste-especie")}
            />
            <ActionCard
              title="Ajustar Cofre"
              description="Correção ou valor inicial"
              icon={Settings}
              variant="warning"
              onClick={() => setOpenDialog("ajuste-cofre")}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Transações da Associação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={transactions}
              isLoading={transactionsLoading}
              onVoid={(id) => setVoidingId(id)}
            />
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Sobre a Associação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              <strong>CNPJ:</strong> 37.812.756/0001-45
            </p>
            <p className="mt-2">
              A Associação é a única entidade com dinheiro em espécie (Espécie e Cofre).
              Recebe mensalidades escolares e é usada para despesas do dia-a-dia.
            </p>
          </CardContent>
        </Card>

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
                  placeholder="Ex: Valor digitado errado"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-destructive/5 p-2 rounded border border-destructive/20">
                <strong>Atenção:</strong> Esta ação reverterá o impacto financeiro no saldo das contas envolvidas.
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
