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
  DialogFooter,
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
import { Wallet, Plus, Minus, Store, Pencil, Trash2, Loader2, XCircle } from "lucide-react";
import { useMerchants } from "@/hooks/use-merchants";
import { useVoidTransaction } from "@/hooks/use-transactions";
import { useEntitiesWithAccounts } from "@/hooks/use-accounts";
import { useSaldosTransactions } from "@/hooks/use-entity-transactions";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { formatCurrencyBRL } from "@/lib/currency";
import { formatDateBR } from "@/lib/date-utils";
import { cleanAccountDisplayName } from "@/lib/account-display";
import { MODULE_LABELS } from "@/lib/constants";
import { useSaldosActions } from "@/hooks/use-saldos-actions";

export default function SaldosPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { data: merchants, refetch: refetchMerchants } = useMerchants();
  const { data: entitiesData } = useEntitiesWithAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useSaldosTransactions();
  const voidTransaction = useVoidTransaction();

  const {
    state,
    setters,
    handlers,
    isLoading: actionsLoading
  } = useSaldosActions(merchants, entitiesData?.entities);

  const { aporte, gasto, newMerchantName, editingMerchant, deletingMerchant } = state;
  const {
    setAporteDate, setAporteOrigem, setAporteAccount, setAporteMerchant, setAporteValor, setAporteDescricao, setAporteObs, setAporteCapitalCusteio,
    setGastoDate, setGastoMerchant, setGastoValor, setGastoDescricao, setGastoObs,
    setNewMerchantName, setEditingMerchant, setDeletingMerchant
  } = setters;
  const {
    handleAddMerchant, handleEditMerchant, handleDeleteMerchant, handleAporteSubmit, handleGastoSubmit, resetAporte, resetGasto
  } = handlers;

  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const handleVoidTx = async () => {
    if (!voidingId || !voidReason.trim()) return;
    await voidTransaction.mutateAsync({ transactionId: voidingId, reason: voidReason });
    setVoidingId(null);
    setVoidReason("");
  };

  const associacaoEntity = entitiesData?.entities?.find(e => e.type === "associacao");
  const ueEntity = entitiesData?.entities?.find(e => e.type === "ue");
  const cxEntity = entitiesData?.entities?.find(e => e.type === "cx");

  const filteredAccounts = (entitiesData?.accounts?.filter(acc => {
    if (aporte.origem === "ASSOC") return acc.entity_id === associacaoEntity?.id;
    if (aporte.origem === "UE") return acc.entity_id === ueEntity?.id;
    if (aporte.origem === "CX") return acc.entity_id === cxEntity?.id;
    return false;
  }) || []).sort((a, b) => {
    const order = ["Espécie", "PIX", "Cofre"];
    const idxA = order.indexOf(a.name);
    const idxB = order.indexOf(b.name);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Saldos em Estabelecimentos</h1>
            <p className="text-muted-foreground">
              Gestão de saldos em supermercados e fornecedores
            </p>
          </div>
          <Dialog open={openDialog === "novo"} onOpenChange={(open) => setOpenDialog(open ? "novo" : null)}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Store className="h-4 w-4 mr-2" />
                Novo Estabelecimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Estabelecimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do Estabelecimento</Label>
                  <Input
                    placeholder="Ex: Supermercado XYZ"
                    value={newMerchantName}
                    onChange={(e) => setNewMerchantName(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const success = await handleAddMerchant(newMerchantName);
                    if (success) {
                      setOpenDialog(null);
                      refetchMerchants();
                    }
                  }}
                  disabled={actionsLoading}
                >
                  {actionsLoading ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Merchant Balances */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {merchants?.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum estabelecimento cadastrado
              </CardContent>
            </Card>
          ) : (
            merchants?.map((merchant) => (
              <Card key={merchant.id} className="stat-card-secondary relative group">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {merchant.name}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMerchant({ id: merchant.id, name: merchant.name });
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingMerchant({ id: merchant.id, name: merchant.name });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${Number(merchant.balance) < 0 ? "text-destructive" : "text-foreground"}`}>
                    {formatCurrencyBRL(Number(merchant.balance))}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Merchant Dialog */}
        <Dialog open={!!editingMerchant} onOpenChange={(open) => !open && setEditingMerchant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Estabelecimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingMerchant?.name || ""}
                  onChange={(e) => setEditingMerchant(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <Button
                className="w-full"
                onClick={async () => {
                  if (editingMerchant) {
                    const success = await handleEditMerchant(editingMerchant.id, editingMerchant.name);
                    if (success) refetchMerchants();
                  }
                }}
                disabled={actionsLoading}
              >
                {actionsLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Merchant Dialog */}
        <Dialog open={!!deletingMerchant} onOpenChange={(open) => !open && setDeletingMerchant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="py-4">
              Tem certeza que deseja desativar o estabelecimento <strong>{deletingMerchant?.name}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingMerchant(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (deletingMerchant) {
                    const success = await handleDeleteMerchant(deletingMerchant.id);
                    if (success) refetchMerchants();
                  }
                }}
                disabled={actionsLoading}
              >
                {actionsLoading ? "Desativando..." : "Desativar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Actions */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Aportar Saldo */}
          <Dialog open={openDialog === "aporte"} onOpenChange={(open) => { setOpenDialog(open ? "aporte" : null); if (!open) resetAporte(); }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-elevated transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Aportar Saldo</h3>
                      <p className="text-sm text-muted-foreground">Depósito em estabelecimento</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Aportar Saldo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <DateInput value={aporte.date} onChange={setAporteDate} />
                </div>
                <div className="space-y-2">
                  <Label>Origem do Recurso *</Label>
                  <Select value={aporte.origem} onValueChange={setAporteOrigem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASSOC">Associação</SelectItem>
                      <SelectItem value="UE">Unidade Executora</SelectItem>
                      <SelectItem value="CX">Caixa Escolar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta *</Label>
                  <Select value={aporte.conta} onValueChange={setAporteAccount} disabled={!aporte.origem}>
                    <SelectTrigger>
                      <SelectValue placeholder={aporte.origem ? "Selecione a conta" : "Selecione origem primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {cleanAccountDisplayName(acc.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estabelecimento *</Label>
                  <Select value={aporte.merchant} onValueChange={setAporteMerchant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput value={aporte.valor} onChange={setAporteValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={aporte.descricao} onChange={(e) => setAporteDescricao(e.target.value)} placeholder="Descreva o aporte" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={aporte.obs} onChange={(e) => setAporteObs(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Capital/Custeio (opcional)</Label>
                  <Select value={aporte.capitalCusteio} onValueChange={setAporteCapitalCusteio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capital">Capital</SelectItem>
                      <SelectItem value="custeio">Custeio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const success = await handleAporteSubmit();
                    if (success) setOpenDialog(null);
                  }}
                  disabled={actionsLoading}
                >
                  {actionsLoading ? "Registrando..." : "Registrar Aporte"}
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
                      <Minus className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Gastos</h3>
                      <p className="text-sm text-muted-foreground">Registrar compra</p>
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
                  <Label>Estabelecimento *</Label>
                  <Select value={gasto.merchant} onValueChange={setGastoMerchant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({formatCurrencyBRL(Number(m.balance))})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput value={gasto.valor} onChange={setGastoValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={gasto.descricao} onChange={(e) => setGastoDescricao(e.target.value)} placeholder="Descreva a compra" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={gasto.obs} onChange={(e) => setGastoObs(e.target.value)} placeholder="Opcional" />
                </div>
                <p className="text-xs text-muted-foreground">
                  * Gasto pode deixar o saldo negativo
                </p>
                <Button
                  className="w-full"
                  onClick={async () => {
                    const success = await handleGastoSubmit();
                    if (success) setOpenDialog(null);
                  }}
                  disabled={actionsLoading}
                >
                  {actionsLoading ? "Registrando..." : "Registrar Gasto"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-secondary" />
              Transações
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
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Meio</TableHead>
                      <TableHead>Registrado por</TableHead>
                      <TableHead>Observação</TableHead>
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${t.module === "aporte_saldo" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            }`}>
                            {MODULE_LABELS[t.module] || t.module}
                          </span>
                        </TableCell>
                        <TableCell>{t.merchant_name || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${t.module === "aporte_saldo" ? "text-success" : "text-destructive"
                          }`}>
                          {t.module === "aporte_saldo" ? "+" : "-"}
                          {formatCurrencyBRL(Number(t.amount))}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {t.description || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t.payment_method === 'cash' ? 'Espécie' : t.payment_method === 'pix' ? 'PIX' : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {t.creator_name || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {t.notes || "-"}
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
                  placeholder="Ex: Lançado em estabelecimento errado"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-destructive/5 p-2 rounded border border-destructive/20">
                <strong>Atenção:</strong> Esta ação reverterá o impacto financeiro no saldo do estabelecimento e da conta de origem.
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
