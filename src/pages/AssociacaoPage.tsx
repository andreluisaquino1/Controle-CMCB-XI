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
import { Building2, Banknote, CreditCard, ArrowRightLeft, Settings, Wallet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useAssociacaoAccounts, useEntities } from "@/hooks/use-accounts";
import { useAssociacaoTransactions } from "@/hooks/use-entity-transactions";
import { getTodayString, formatDateBR } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { ACCOUNT_NAMES, MODULE_LABELS } from "@/lib/constants";

export default function AssociacaoPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { toast } = useToast();
  const createTransaction = useCreateTransaction();
  const { data: accounts, isLoading: accountsLoading } = useAssociacaoAccounts();
  const { data: entities } = useEntities();
  const { data: transactions, isLoading: transactionsLoading } = useAssociacaoTransactions();

  // Mensalidade state
  const [mensalidadeDate, setMensalidadeDate] = useState(getTodayString());
  const [mensalidadeTurno, setMensalidadeTurno] = useState<string>("");
  const [mensalidadeCash, setMensalidadeCash] = useState(0);
  const [mensalidadePix, setMensalidadePix] = useState(0);

  // Gasto state
  const [gastoDate, setGastoDate] = useState(getTodayString());
  const [gastoMeio, setGastoMeio] = useState<string>("");
  const [gastoValor, setGastoValor] = useState(0);
  const [gastoDescricao, setGastoDescricao] = useState("");
  const [gastoObs, setGastoObs] = useState("");

  // Movimentar Saldo state
  const [movDate, setMovDate] = useState(getTodayString());
  const [movDe, setMovDe] = useState<string>("");
  const [movPara, setMovPara] = useState<string>("");
  const [movValor, setMovValor] = useState(0);
  const [movDescricao, setMovDescricao] = useState("");
  const [movObs, setMovObs] = useState("");

  // Ajuste Bolsinha state
  const [ajusteBolsinhaDate, setAjusteBolsinhaDate] = useState(getTodayString());
  const [ajusteBolsinhaValor, setAjusteBolsinhaValor] = useState(0);
  const [ajusteBolsinhaMotivo, setAjusteBolsinhaMotivo] = useState("");
  const [ajusteBolsinhaObs, setAjusteBolsinhaObs] = useState("");

  // Ajuste Reserva state
  const [ajusteReservaDate, setAjusteReservaDate] = useState(getTodayString());
  const [ajusteReservaValor, setAjusteReservaValor] = useState(0);
  const [ajusteReservaMotivo, setAjusteReservaMotivo] = useState("");
  const [ajusteReservaObs, setAjusteReservaObs] = useState("");

  const associacaoEntity = entities?.find(e => e.type === "associacao");
  const bolsinhaAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.BOLSINHA);
  const reservaAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.RESERVA);
  const pixAccount = accounts?.find(a => a.name === ACCOUNT_NAMES.BB_ASSOCIACAO_PIX);

  const resetMensalidade = () => {
    setMensalidadeDate(getTodayString());
    setMensalidadeTurno("");
    setMensalidadeCash(0);
    setMensalidadePix(0);
  };

  const resetGasto = () => {
    setGastoDate(getTodayString());
    setGastoMeio("");
    setGastoValor(0);
    setGastoDescricao("");
    setGastoObs("");
  };

  const resetMov = () => {
    setMovDate(getTodayString());
    setMovDe("");
    setMovPara("");
    setMovValor(0);
    setMovDescricao("");
    setMovObs("");
  };

  const handleMensalidadeSubmit = async () => {
    if (!mensalidadeTurno) {
      toast({ title: "Erro", description: "Selecione o turno.", variant: "destructive" });
      return;
    }
    if (mensalidadeCash === 0 && mensalidadePix === 0) {
      toast({ title: "Erro", description: "Informe pelo menos um valor.", variant: "destructive" });
      return;
    }
    if (!bolsinhaAccount || !pixAccount || !associacaoEntity) return;

    if (mensalidadeCash > 0) {
      await createTransaction.mutateAsync({
        transaction: {
          transaction_date: mensalidadeDate,
          module: "mensalidade",
          entity_id: associacaoEntity.id,
          destination_account_id: bolsinhaAccount.id,
          amount: mensalidadeCash,
          direction: "in",
          payment_method: "cash",
          shift: mensalidadeTurno as "matutino" | "vespertino",
          description: `Mensalidade ${mensalidadeTurno}`,
        },
        accountUpdates: [
          { accountId: bolsinhaAccount.id, amount: mensalidadeCash, operation: "add" },
        ],
      });
    }

    if (mensalidadePix > 0) {
      await createTransaction.mutateAsync({
        transaction: {
          transaction_date: mensalidadeDate,
          module: "mensalidade",
          entity_id: associacaoEntity.id,
          destination_account_id: pixAccount.id,
          amount: mensalidadePix,
          direction: "in",
          payment_method: "pix",
          shift: mensalidadeTurno as "matutino" | "vespertino",
          description: `Mensalidade ${mensalidadeTurno}`,
        },
        accountUpdates: [
          { accountId: pixAccount.id, amount: mensalidadePix, operation: "add" },
        ],
      });
    }

    toast({ title: "Sucesso", description: "Mensalidade registrada." });
    resetMensalidade();
    setOpenDialog(null);
  };

  const handleGastoSubmit = async () => {
    if (!gastoMeio) {
      toast({ title: "Erro", description: "Selecione o meio de pagamento.", variant: "destructive" });
      return;
    }
    if (gastoValor <= 0) {
      toast({ title: "Erro", description: "Informe o valor.", variant: "destructive" });
      return;
    }
    if (!gastoDescricao.trim()) {
      toast({ title: "Erro", description: "Informe a descrição.", variant: "destructive" });
      return;
    }
    if (!associacaoEntity) return;

    const sourceAccount = gastoMeio === "cash" ? bolsinhaAccount : pixAccount;
    if (!sourceAccount) return;

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: gastoDate,
        module: "gasto_associacao",
        entity_id: associacaoEntity.id,
        source_account_id: sourceAccount.id,
        amount: gastoValor,
        direction: "out",
        payment_method: gastoMeio as "cash" | "pix",
        description: gastoDescricao,
        notes: gastoObs || null,
      },
      accountUpdates: [
        { accountId: sourceAccount.id, amount: gastoValor, operation: "subtract" },
      ],
    });

    toast({ title: "Sucesso", description: "Gasto registrado." });
    resetGasto();
    setOpenDialog(null);
  };

  const handleMovimentarSubmit = async () => {
    if (!movDe || !movPara) {
      toast({ title: "Erro", description: "Selecione origem e destino.", variant: "destructive" });
      return;
    }
    if (movDe === movPara) {
      toast({ title: "Erro", description: "Origem e destino não podem ser iguais.", variant: "destructive" });
      return;
    }
    if (movValor <= 0) {
      toast({ title: "Erro", description: "Informe o valor.", variant: "destructive" });
      return;
    }
    if (!movDescricao.trim()) {
      toast({ title: "Erro", description: "Informe a descrição.", variant: "destructive" });
      return;
    }
    if (!associacaoEntity) return;

    const sourceAccount = accounts?.find(a => a.id === movDe);
    const destAccount = accounts?.find(a => a.id === movPara);
    if (!sourceAccount || !destAccount) return;

    // Validate balance
    if (movValor > sourceAccount.balance) {
      toast({ 
        title: "Erro", 
        description: `Saldo insuficiente. Disponível: ${formatCurrencyBRL(sourceAccount.balance)}`, 
        variant: "destructive" 
      });
      return;
    }

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: movDate,
        module: "bolsinha_transfer",
        entity_id: associacaoEntity.id,
        source_account_id: sourceAccount.id,
        destination_account_id: destAccount.id,
        amount: movValor,
        direction: "transfer",
        description: movDescricao,
        notes: movObs || null,
      },
      accountUpdates: [
        { accountId: sourceAccount.id, amount: movValor, operation: "subtract" },
        { accountId: destAccount.id, amount: movValor, operation: "add" },
      ],
    });

    toast({ title: "Sucesso", description: "Movimentação registrada." });
    resetMov();
    setOpenDialog(null);
  };

  const handleAjusteBolsinhaSubmit = async () => {
    if (!ajusteBolsinhaMotivo.trim()) {
      toast({ title: "Erro", description: "Informe o motivo do ajuste.", variant: "destructive" });
      return;
    }
    if (ajusteBolsinhaValor === 0) {
      toast({ title: "Erro", description: "Informe o valor do ajuste.", variant: "destructive" });
      return;
    }
    if (!bolsinhaAccount || !associacaoEntity) return;

    const direction = ajusteBolsinhaValor > 0 ? "in" : "out";
    const absAmount = Math.abs(ajusteBolsinhaValor);

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: ajusteBolsinhaDate,
        module: "bolsinha_ajuste",
        entity_id: associacaoEntity.id,
        destination_account_id: bolsinhaAccount.id,
        amount: absAmount,
        direction: direction,
        description: ajusteBolsinhaMotivo,
        notes: ajusteBolsinhaObs || null,
      },
      accountUpdates: [
        { 
          accountId: bolsinhaAccount.id, 
          amount: absAmount, 
          operation: ajusteBolsinhaValor > 0 ? "add" : "subtract" 
        },
      ],
    });

    toast({ title: "Sucesso", description: "Ajuste registrado." });
    setAjusteBolsinhaDate(getTodayString());
    setAjusteBolsinhaValor(0);
    setAjusteBolsinhaMotivo("");
    setAjusteBolsinhaObs("");
    setOpenDialog(null);
  };

  const handleAjusteReservaSubmit = async () => {
    if (!ajusteReservaMotivo.trim()) {
      toast({ title: "Erro", description: "Informe o motivo do ajuste.", variant: "destructive" });
      return;
    }
    if (ajusteReservaValor === 0) {
      toast({ title: "Erro", description: "Informe o valor do ajuste.", variant: "destructive" });
      return;
    }
    if (!reservaAccount || !associacaoEntity) return;

    const direction = ajusteReservaValor > 0 ? "in" : "out";
    const absAmount = Math.abs(ajusteReservaValor);

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: ajusteReservaDate,
        module: "reserva_ajuste",
        entity_id: associacaoEntity.id,
        destination_account_id: reservaAccount.id,
        amount: absAmount,
        direction: direction,
        description: ajusteReservaMotivo,
        notes: ajusteReservaObs || null,
      },
      accountUpdates: [
        { 
          accountId: reservaAccount.id, 
          amount: absAmount, 
          operation: ajusteReservaValor > 0 ? "add" : "subtract" 
        },
      ],
    });

    toast({ title: "Sucesso", description: "Ajuste registrado." });
    setAjusteReservaDate(getTodayString());
    setAjusteReservaValor(0);
    setAjusteReservaMotivo("");
    setAjusteReservaObs("");
    setOpenDialog(null);
  };

  // Get display name for account
  const getAccountDisplayName = (name: string) => {
    if (name === ACCOUNT_NAMES.BOLSINHA) return "Espécie";
    if (name === ACCOUNT_NAMES.RESERVA) return "Cofre";
    if (name === ACCOUNT_NAMES.BB_ASSOCIACAO_PIX) return "PIX";
    return name;
  };

  // Selected source account for validation display
  const selectedSourceAccount = accounts?.find(a => a.id === movDe);

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
                  {formatCurrencyBRL(bolsinhaAccount?.balance || 0)}
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
                  {formatCurrencyBRL(reservaAccount?.balance || 0)}
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
                <p className={`text-2xl font-bold ${(pixAccount?.balance || 0) < 0 ? "text-destructive" : "text-foreground"}`}>
                  {formatCurrencyBRL(pixAccount?.balance || 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Mensalidades */}
          <Dialog open={openDialog === "mensalidade"} onOpenChange={(open) => { setOpenDialog(open ? "mensalidade" : null); if (!open) resetMensalidade(); }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-elevated transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Mensalidades</h3>
                      <p className="text-sm text-muted-foreground">Registrar entrada</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Mensalidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <DateInput value={mensalidadeDate} onChange={setMensalidadeDate} />
                </div>
                <div className="space-y-2">
                  <Label>Turno *</Label>
                  <Select value={mensalidadeTurno} onValueChange={setMensalidadeTurno}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matutino">Matutino</SelectItem>
                      <SelectItem value="vespertino">Vespertino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Espécie (R$)</Label>
                  <CurrencyInput value={mensalidadeCash} onChange={setMensalidadeCash} />
                </div>
                <div className="space-y-2">
                  <Label>PIX (R$)</Label>
                  <CurrencyInput value={mensalidadePix} onChange={setMensalidadePix} />
                </div>
                <Button className="w-full" onClick={handleMensalidadeSubmit} disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? "Registrando..." : "Registrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Gastos */}
          <Dialog open={openDialog === "gasto"} onOpenChange={(open) => { setOpenDialog(open ? "gasto" : null); if (!open) resetGasto(); }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-elevated transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Gastos</h3>
                      <p className="text-sm text-muted-foreground">Registrar despesa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Gasto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <DateInput value={gastoDate} onChange={setGastoDate} />
                </div>
                <div className="space-y-2">
                  <Label>Meio de Pagamento *</Label>
                  <Select value={gastoMeio} onValueChange={setGastoMeio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espécie</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput value={gastoValor} onChange={setGastoValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={gastoDescricao} onChange={(e) => setGastoDescricao(e.target.value)} placeholder="Descreva o gasto" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={gastoObs} onChange={(e) => setGastoObs(e.target.value)} placeholder="Opcional" />
                </div>
                <Button className="w-full" onClick={handleGastoSubmit} disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? "Registrando..." : "Registrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Movimentar Saldo */}
          <Dialog open={openDialog === "movimentar"} onOpenChange={(open) => { setOpenDialog(open ? "movimentar" : null); if (!open) resetMov(); }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-elevated transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <ArrowRightLeft className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Movimentar Saldo</h3>
                      <p className="text-sm text-muted-foreground">Transferência/Depósito</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Movimentar Saldo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <DateInput value={movDate} onChange={setMovDate} />
                </div>
                <div className="space-y-2">
                  <Label>De *</Label>
                  <Select value={movDe} onValueChange={setMovDe}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta de origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {getAccountDisplayName(acc.name)} ({formatCurrencyBRL(acc.balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSourceAccount && (
                    <p className="text-xs text-muted-foreground">
                      Saldo disponível: {formatCurrencyBRL(selectedSourceAccount.balance)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Para *</Label>
                  <Select value={movPara} onValueChange={setMovPara}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.id !== movDe).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{getAccountDisplayName(acc.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput value={movValor} onChange={setMovValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={movDescricao} onChange={(e) => setMovDescricao(e.target.value)} placeholder="Descreva a movimentação" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={movObs} onChange={(e) => setMovObs(e.target.value)} placeholder="Opcional" />
                </div>
                <Button className="w-full" onClick={handleMovimentarSubmit} disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? "Registrando..." : "Registrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ajustes Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Ajustes</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Ajustar Espécie */}
            <Dialog open={openDialog === "ajuste-bolsinha"} onOpenChange={(open) => setOpenDialog(open ? "ajuste-bolsinha" : null)}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-elevated transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Settings className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Ajustar Espécie</h3>
                        <p className="text-sm text-muted-foreground">Correção ou valor inicial</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajustar Espécie</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <DateInput value={ajusteBolsinhaDate} onChange={setAjusteBolsinhaDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Ajuste (R$) *</Label>
                    <Input 
                      type="text" 
                      placeholder="Use - para reduzir (ex: -50,00)" 
                      value={ajusteBolsinhaValor === 0 ? "" : ajusteBolsinhaValor.toString().replace(".", ",")}
                      onChange={(e) => {
                        const val = e.target.value.replace(",", ".");
                        const num = parseFloat(val);
                        setAjusteBolsinhaValor(isNaN(num) ? 0 : num);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Positivo para adicionar, negativo para remover</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo *</Label>
                    <Input value={ajusteBolsinhaMotivo} onChange={(e) => setAjusteBolsinhaMotivo(e.target.value)} placeholder="Ex: Valor inicial do caixa" />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input value={ajusteBolsinhaObs} onChange={(e) => setAjusteBolsinhaObs(e.target.value)} placeholder="Opcional" />
                  </div>
                  <Button className="w-full" onClick={handleAjusteBolsinhaSubmit} disabled={createTransaction.isPending}>
                    {createTransaction.isPending ? "Registrando..." : "Registrar Ajuste"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Ajustar Cofre */}
            <Dialog open={openDialog === "ajuste-reserva"} onOpenChange={(open) => setOpenDialog(open ? "ajuste-reserva" : null)}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-elevated transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Settings className="h-6 w-6 text-warning" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Ajustar Cofre</h3>
                        <p className="text-sm text-muted-foreground">Correção ou valor inicial</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajustar Cofre</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <DateInput value={ajusteReservaDate} onChange={setAjusteReservaDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Ajuste (R$) *</Label>
                    <Input 
                      type="text" 
                      placeholder="Use - para reduzir (ex: -50,00)" 
                      value={ajusteReservaValor === 0 ? "" : ajusteReservaValor.toString().replace(".", ",")}
                      onChange={(e) => {
                        const val = e.target.value.replace(",", ".");
                        const num = parseFloat(val);
                        setAjusteReservaValor(isNaN(num) ? 0 : num);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Positivo para adicionar, negativo para remover</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo *</Label>
                    <Input value={ajusteReservaMotivo} onChange={(e) => setAjusteReservaMotivo(e.target.value)} placeholder="Ex: Valor inicial do cofre" />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input value={ajusteReservaObs} onChange={(e) => setAjusteReservaObs(e.target.value)} placeholder="Opcional" />
                  </div>
                  <Button className="w-full" onClick={handleAjusteReservaSubmit} disabled={createTransaction.isPending}>
                    {createTransaction.isPending ? "Registrando..." : "Registrar Ajuste"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
            {transactionsLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma transação registrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Registrado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateBR(t.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                            {MODULE_LABELS[t.module] || t.module}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          t.direction === "in" ? "text-success" : 
                          t.direction === "out" ? "text-destructive" : ""
                        }`}>
                          {t.direction === "in" ? "+" : t.direction === "out" ? "-" : ""}
                          {formatCurrencyBRL(Number(t.amount))}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {t.description || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {t.notes || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
      </div>
    </DashboardLayout>
  );
}
