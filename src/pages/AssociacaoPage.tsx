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
    setMensalidadeDate, setMensalidadeTurno, setMensalidadeCash, setMensalidadePix,
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
                  <DateInput value={mensalidade.date} onChange={setMensalidadeDate} />
                </div>
                <div className="space-y-2">
                  <Label>Turno *</Label>
                  <Select value={mensalidade.turno} onValueChange={setMensalidadeTurno}>
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
                  <CurrencyInput value={mensalidade.cash} onChange={setMensalidadeCash} />
                </div>
                <div className="space-y-2">
                  <Label>PIX (R$)</Label>
                  <CurrencyInput value={mensalidade.pix} onChange={setMensalidadePix} />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const success = await handleMensalidadeSubmit();
                    if (success) setOpenDialog(null);
                  }}
                  disabled={actionsLoading}
                >
                  {actionsLoading ? "Registrando..." : "Registrar"}
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
                  <DateInput value={gasto.date} onChange={setGastoDate} />
                </div>
                <div className="space-y-2">
                  <Label>Meio de Pagamento *</Label>
                  <Select value={gasto.meio} onValueChange={setGastoMeio}>
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
                  <CurrencyInput value={gasto.valor} onChange={setGastoValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {shortcuts.map((s) => (
                      <div key={s} className="group relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2 bg-muted/30 border-muted-foreground/20 hover:bg-muted pr-6"
                          onClick={() => setGastoDescricao(s)}
                        >
                          {s}
                        </Button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeShortcut(s); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {!showShortcutInput && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowShortcutInput(true)}
                      >
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                  {showShortcutInput && (
                    <div className="flex gap-2 items-center mb-4">
                      <Input
                        value={newShortcut}
                        onChange={(e) => setNewShortcut(e.target.value)}
                        placeholder="Novo atalho (ex: Gelo)"
                        className="h-8 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addShortcut(newShortcut);
                            setNewShortcut("");
                            setShowShortcutInput(false);
                          }
                          if (e.key === 'Escape') {
                            setNewShortcut("");
                            setShowShortcutInput(false);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          addShortcut(newShortcut);
                          setNewShortcut("");
                          setShowShortcutInput(false);
                        }}
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Input
                    value={gasto.descricao}
                    onChange={(e) => setGastoDescricao(e.target.value)}
                    placeholder="Descreva o gasto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={gasto.obs} onChange={(e) => setGastoObs(e.target.value)} placeholder="Opcional" />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const success = await handleGastoSubmit();
                    if (success) setOpenDialog(null);
                  }}
                  disabled={actionsLoading}
                >
                  {actionsLoading ? "Registrando..." : "Registrar"}
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
                  <DateInput value={mov.date} onChange={setMovDate} />
                </div>
                <div className="space-y-2">
                  <Label>De *</Label>
                  <Select value={mov.de} onValueChange={setMovDe}>
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
                  <Select value={mov.para} onValueChange={setMovPara}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.id !== mov.de).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{getAccountDisplayName(acc.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput value={mov.valor} onChange={setMovValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={mov.descricao} onChange={(e) => setMovDescricao(e.target.value)} placeholder="Descreva a movimentação" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={mov.obs} onChange={(e) => setMovObs(e.target.value)} placeholder="Opcional" />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const success = await handleMovimentarSubmit();
                    if (success) setOpenDialog(null);
                  }}
                  disabled={actionsLoading}
                >
                  {actionsLoading ? "Registrando..." : "Registrar"}
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
            <Dialog open={openDialog === "ajuste-especie"} onOpenChange={(open) => setOpenDialog(open ? "ajuste-especie" : null)}>
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
                  <DialogTitle>Ajustar Saldo em Espécie</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <DateInput value={ajusteEspecie.date} onChange={setAjusteEspecieDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Ajuste (R$) *</Label>
                    <Input
                      type="text"
                      placeholder="Use - para reduzir (ex: -50,00)"
                      value={ajusteEspecie.valor === 0 ? "" : ajusteEspecie.valor.toString().replace(".", ",")}
                      onChange={(e) => {
                        const val = e.target.value.replace(",", ".");
                        const num = parseFloat(val);
                        setAjusteEspecieValor(isNaN(num) ? 0 : num);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Positivo para adicionar, negativo para remover</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo *</Label>
                    <Input value={ajusteEspecie.motivo} onChange={(e) => setAjusteEspecieMotivo(e.target.value)} placeholder="Ex: Valor inicial do caixa" />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input value={ajusteEspecie.obs} onChange={(e) => setAjusteEspecieObs(e.target.value)} placeholder="Opcional" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      const success = await handleAjusteEspecieSubmit();
                      if (success) setOpenDialog(null);
                    }}
                    disabled={actionsLoading}
                  >
                    {actionsLoading ? "Registrando..." : "Registrar Ajuste"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Ajustar Cofre */}
            <Dialog open={openDialog === "ajuste-cofre"} onOpenChange={(open) => setOpenDialog(open ? "ajuste-cofre" : null)}>
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
                  <DialogTitle>Ajustar Saldo do Cofre</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Data *</Label>
                    <DateInput value={ajusteCofre.date} onChange={setAjusteCofreDate} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Ajuste (R$) *</Label>
                    <Input
                      type="text"
                      placeholder="Use - para reduzir (ex: -50,00)"
                      value={ajusteCofre.valor === 0 ? "" : ajusteCofre.valor.toString().replace(".", ",")}
                      onChange={(e) => {
                        const val = e.target.value.replace(",", ".");
                        const num = parseFloat(val);
                        setAjusteCofreValor(isNaN(num) ? 0 : num);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Positivo para adicionar, negativo para remover</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo *</Label>
                    <Input value={ajusteCofre.motivo} onChange={(e) => setAjusteCofreMotivo(e.target.value)} placeholder="Ex: Valor inicial do cofre" />
                  </div>
                  <div className="space-y-2">
                    <Label>Observação</Label>
                    <Input value={ajusteCofre.obs} onChange={(e) => setAjusteCofreObs(e.target.value)} placeholder="Opcional" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      const success = await handleAjusteCofreSubmit();
                      if (success) setOpenDialog(null);
                    }}
                    disabled={actionsLoading}
                  >
                    {actionsLoading ? "Registrando..." : "Registrar Ajuste"}
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
                      <TableHead>Meio</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Registrado por</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id} className={t.status === 'voided' ? 'opacity-50 grayscale' : ''}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateBR(t.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                            {MODULE_LABELS[t.module] || t.module}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${t.direction === "in" ? "text-success" :
                          t.direction === "out" ? "text-destructive" : ""
                          }`}>
                          {t.direction === "in" ? "+" : t.direction === "out" ? "-" : ""}
                          {formatCurrencyBRL(Number(t.amount))}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {t.description || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.payment_method === 'cash' ? 'Espécie' : t.payment_method === 'pix' ? 'PIX' : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.shift === 'matutino' ? 'Matutino' : t.shift === 'vespertino' ? 'Vespertino' : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {t.notes || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.creator_name || "-"}
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
