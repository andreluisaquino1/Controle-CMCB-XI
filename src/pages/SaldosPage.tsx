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
import { Wallet, Plus, Minus, Store, Pencil, Trash2, Loader2, XCircle, PlusCircle, MinusCircle, ScrollText } from "lucide-react";
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
import { ActionCard } from "@/components/ActionCard";
import { AporteSaldoDialog } from "@/components/forms/AporteSaldoDialog";
import { ConsumoSaldoDialog } from "@/components/forms/ConsumoSaldoDialog";
import { TransactionTable } from "@/components/transactions/TransactionTable";

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
    const order = ["Espécie", "PIX (Conta BB)", "Conta Digital (Escolaweb)", "Cofre"];
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
          {!merchants || merchants.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum estabelecimento cadastrado
              </CardContent>
            </Card>
          ) : (
            [...(merchants || [])]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((merchant) => (
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
              <DialogTitle>Desativar Estabelecimento</DialogTitle>
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
        {/* Action Triggers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            title="Aportar Saldo"
            description="Lançar depósito em estabelecimento"
            icon={PlusCircle}
            variant="info"
            onClick={() => setOpenDialog("aporte")}
          />
          <ActionCard
            title="Registrar Gasto"
            description="Baixa de saldo por compra"
            icon={MinusCircle}
            variant="secondary"
            onClick={() => setOpenDialog("gasto")}
          />
        </div>

        {/* Dialogs */}
        <AporteSaldoDialog
          open={openDialog === "aporte"}
          onOpenChange={(o) => {
            setOpenDialog(o ? "aporte" : null);
            if (!o) resetAporte();
          }}
          state={aporte}
          setters={{
            setDate: setAporteDate,
            setOrigem: setAporteOrigem,
            setAccount: setAporteAccount,
            setMerchant: setAporteMerchant,
            setValor: setAporteValor,
            setDescricao: setAporteDescricao,
            setObs: setAporteObs,
            setCapitalCusteio: setAporteCapitalCusteio,
          }}
          entities={entitiesData?.entities || []}
          accounts={entitiesData?.accounts || []}
          merchants={merchants || []}
          onSubmit={handleAporteSubmit}
          isLoading={actionsLoading}
        />

        <ConsumoSaldoDialog
          open={openDialog === "gasto"}
          onOpenChange={(o) => {
            setOpenDialog(o ? "gasto" : null);
            if (!o) resetGasto();
          }}
          state={gasto}
          setters={{
            setDate: setGastoDate,
            setMerchant: setGastoMerchant,
            setValor: setGastoValor,
            setDescricao: setGastoDescricao,
            setObs: setGastoObs,
          }}
          merchants={merchants || []}
          onSubmit={handleGastoSubmit}
          isLoading={actionsLoading}
        />

        {/* Transactions Table Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="h-5 w-5 text-primary" />
              Histórico de Saldos nos Estabelecimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={transactions}
              isLoading={transactionsLoading}
              onVoid={(id) => setVoidingId(id)}
              showMerchant={true}
              showOrigin={true}
              showAccount={true}
            />
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
