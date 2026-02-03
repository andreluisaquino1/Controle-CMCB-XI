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
import { Wallet, Plus, Minus, Store, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMerchants, useCreateMerchant } from "@/hooks/use-merchants";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useEntitiesWithAccounts, useUpdateMerchant, useDeactivateMerchant } from "@/hooks/use-accounts";
import { useSaldosTransactions } from "@/hooks/use-entity-transactions";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { formatCurrencyBRL } from "@/lib/currency";
import { getTodayString, formatDateBR } from "@/lib/date-utils";
import { cleanAccountDisplayName } from "@/lib/account-display";
import { MODULE_LABELS } from "@/lib/constants";

export default function SaldosPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [newMerchantName, setNewMerchantName] = useState("");
  const [editingMerchant, setEditingMerchant] = useState<{ id: string; name: string } | null>(null);
  const [deletingMerchant, setDeletingMerchant] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const { data: merchants, refetch: refetchMerchants } = useMerchants("saldo");
  const { data: entitiesData } = useEntitiesWithAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useSaldosTransactions();
  const createMerchant = useCreateMerchant();
  const createTransaction = useCreateTransaction();
  const updateMerchant = useUpdateMerchant();
  const deactivateMerchant = useDeactivateMerchant();

  // Aporte state
  const [aporteDate, setAporteDate] = useState(getTodayString());
  const [aporteOrigem, setAporteOrigem] = useState<string>("");
  const [aporteConta, setAporteConta] = useState<string>("");
  const [aporteMerchant, setAporteMerchant] = useState<string>("");
  const [aporteValor, setAporteValor] = useState(0);
  const [aporteDescricao, setAporteDescricao] = useState("");
  const [aporteObs, setAporteObs] = useState("");
  const [aporteCapitalCusteio, setAporteCapitalCusteio] = useState<string>("");

  // Gasto state
  const [gastoDate, setGastoDate] = useState(getTodayString());
  const [gastoMerchant, setGastoMerchant] = useState<string>("");
  const [gastoValor, setGastoValor] = useState(0);
  const [gastoDescricao, setGastoDescricao] = useState("");
  const [gastoObs, setGastoObs] = useState("");

  // Get entities
  const associacaoEntity = entitiesData?.entities?.find(e => e.type === "associacao");
  const ueEntity = entitiesData?.entities?.find(e => e.type === "ue");
  const cxEntity = entitiesData?.entities?.find(e => e.type === "cx");

  // Get accounts filtered by origin
  const filteredAccounts = entitiesData?.accounts?.filter(acc => {
    if (aporteOrigem === "ASSOC") return acc.entity_id === associacaoEntity?.id;
    if (aporteOrigem === "UE") return acc.entity_id === ueEntity?.id;
    if (aporteOrigem === "CX") return acc.entity_id === cxEntity?.id;
    return false;
  }) || [];

  const resetAporte = () => {
    setAporteDate(getTodayString());
    setAporteOrigem("");
    setAporteConta("");
    setAporteMerchant("");
    setAporteValor(0);
    setAporteDescricao("");
    setAporteObs("");
    setAporteCapitalCusteio("");
  };

  const resetGasto = () => {
    setGastoDate(getTodayString());
    setGastoMerchant("");
    setGastoValor(0);
    setGastoDescricao("");
    setGastoObs("");
  };

  const handleAddMerchant = async () => {
    if (!newMerchantName.trim()) return;
    await createMerchant.mutateAsync({ name: newMerchantName, mode: "saldo" });
    setNewMerchantName("");
    setOpenDialog(null);
    refetchMerchants();
  };

  const handleEditMerchant = async () => {
    if (!editingMerchant || !editingMerchant.name.trim()) return;
    await updateMerchant.mutateAsync({ id: editingMerchant.id, name: editingMerchant.name });
    setEditingMerchant(null);
    refetchMerchants();
  };

  const handleDeleteMerchant = async () => {
    if (!deletingMerchant) return;
    await deactivateMerchant.mutateAsync(deletingMerchant.id);
    setDeletingMerchant(null);
    refetchMerchants();
  };

  const handleAporteSubmit = async () => {
    if (!aporteOrigem) {
      toast({ title: "Erro", description: "Selecione a origem.", variant: "destructive" });
      return;
    }
    if (!aporteConta) {
      toast({ title: "Erro", description: "Selecione a conta.", variant: "destructive" });
      return;
    }
    if (!aporteMerchant) {
      toast({ title: "Erro", description: "Selecione o estabelecimento.", variant: "destructive" });
      return;
    }
    if (aporteValor <= 0) {
      toast({ title: "Erro", description: "Informe o valor.", variant: "destructive" });
      return;
    }
    if (!aporteDescricao.trim()) {
      toast({ title: "Erro", description: "Informe a descrição.", variant: "destructive" });
      return;
    }

    let entityId: string | undefined;
    let originFund: "UE" | "CX" | null = null;

    if (aporteOrigem === "ASSOC") {
      entityId = associacaoEntity?.id;
    } else if (aporteOrigem === "UE") {
      entityId = ueEntity?.id;
      originFund = "UE";
    } else if (aporteOrigem === "CX") {
      entityId = cxEntity?.id;
      originFund = "CX";
    }

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: aporteDate,
        module: "aporte_saldo",
        entity_id: entityId || null,
        source_account_id: aporteConta,
        merchant_id: aporteMerchant,
        amount: aporteValor,
        direction: "out",
        payment_method: "pix",
        origin_fund: originFund,
        capital_custeio: aporteCapitalCusteio ? (aporteCapitalCusteio as "capital" | "custeio") : null,
        description: aporteDescricao,
        notes: aporteObs || null,
      },
    });

    toast({ title: "Sucesso", description: "Aporte registrado." });
    resetAporte();
    setOpenDialog(null);
  };

  const handleGastoSubmit = async () => {
    if (!gastoMerchant) {
      toast({ title: "Erro", description: "Selecione o estabelecimento.", variant: "destructive" });
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

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: gastoDate,
        module: "consumo_saldo",
        merchant_id: gastoMerchant,
        amount: gastoValor,
        direction: "out",
        description: gastoDescricao,
        notes: gastoObs || null,
      },
    });

    toast({ title: "Sucesso", description: "Gasto registrado." });
    resetGasto();
    setOpenDialog(null);
  };

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
                <Button className="w-full" onClick={handleAddMerchant} disabled={createMerchant.isPending}>
                  {createMerchant.isPending ? "Adicionando..." : "Adicionar"}
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
              <Button className="w-full" onClick={handleEditMerchant} disabled={updateMerchant.isPending}>
                {updateMerchant.isPending ? "Salvando..." : "Salvar"}
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
              <Button variant="destructive" onClick={handleDeleteMerchant} disabled={deactivateMerchant.isPending}>
                {deactivateMerchant.isPending ? "Desativando..." : "Desativar"}
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
                  <DateInput value={aporteDate} onChange={setAporteDate} />
                </div>
                <div className="space-y-2">
                  <Label>Origem do Recurso *</Label>
                  <Select value={aporteOrigem} onValueChange={(v) => { setAporteOrigem(v); setAporteConta(""); }}>
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
                  <Select value={aporteConta} onValueChange={setAporteConta} disabled={!aporteOrigem}>
                    <SelectTrigger>
                      <SelectValue placeholder={aporteOrigem ? "Selecione a conta" : "Selecione origem primeiro"} />
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
                  <Select value={aporteMerchant} onValueChange={setAporteMerchant}>
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
                  <CurrencyInput value={aporteValor} onChange={setAporteValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={aporteDescricao} onChange={(e) => setAporteDescricao(e.target.value)} placeholder="Descreva o aporte" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={aporteObs} onChange={(e) => setAporteObs(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="space-y-2">
                  <Label>Capital/Custeio (opcional)</Label>
                  <Select value={aporteCapitalCusteio} onValueChange={setAporteCapitalCusteio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capital">Capital</SelectItem>
                      <SelectItem value="custeio">Custeio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleAporteSubmit} disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? "Registrando..." : "Registrar Aporte"}
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
                  <DateInput value={gastoDate} onChange={setGastoDate} />
                </div>
                <div className="space-y-2">
                  <Label>Estabelecimento *</Label>
                  <Select value={gastoMerchant} onValueChange={setGastoMerchant}>
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
                  <CurrencyInput value={gastoValor} onChange={setGastoValor} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input value={gastoDescricao} onChange={(e) => setGastoDescricao(e.target.value)} placeholder="Descreva a compra" />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={gastoObs} onChange={(e) => setGastoObs(e.target.value)} placeholder="Opcional" />
                </div>
                <p className="text-xs text-muted-foreground">
                  * Gasto pode deixar o saldo negativo
                </p>
                <Button className="w-full" onClick={handleGastoSubmit} disabled={createTransaction.isPending}>
                  {createTransaction.isPending ? "Registrando..." : "Registrar Gasto"}
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
      </div>
    </DashboardLayout>
  );
}
