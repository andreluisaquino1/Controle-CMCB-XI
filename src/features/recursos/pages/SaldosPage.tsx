import { DashboardLayout } from "@/shared/components/DashboardLayout";
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
import { Switch } from "@/shared/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Wallet, Plus, Minus, Store, Pencil, Trash2, Loader2, XCircle, PlusCircle, MinusCircle, ScrollText, RefreshCw } from "lucide-react";
import { useMerchants } from "@/features/merchants/hooks/use-merchants";
import { useVoidTransaction } from "@/features/transactions/hooks/use-transactions";
import { useEntitiesWithAccounts } from "@/shared/hooks/use-accounts";
import { useSaldosTransactions } from "@/features/transactions/hooks/use-entity-transactions";
import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { formatDateBR, formatDateString, getTodayString } from "@/shared/lib/date-utils";
import { cleanAccountDisplayName } from "@/shared/lib/account-display";
import { matchesSearchTerm } from "@/shared/lib/search-filter";
import { MODULE_LABELS, sortByAccountOrder } from "@/shared/lib/constants";
import { useSaldosActions } from "@/features/recursos/hooks/use-saldos-actions";
import { VoidTransactionDialog } from "@/shared/components/VoidTransactionDialog";
import { ActionCard } from "@/shared/components/ActionCard";
import { AporteSaldoDialog } from "@/features/recursos/components/AporteSaldoDialog";
import { ConsumoSaldoDialog } from "@/features/recursos/components/ConsumoSaldoDialog";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { TransactionExportActions } from "@/features/transactions/components/TransactionExportActions";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { startOfMonth } from "date-fns";

export default function SaldosPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: formatDateString(startOfMonth(new Date())),
    end: getTodayString()
  });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: merchants, refetch: refetchMerchants } = useMerchants(showInactive);
  const { data: entitiesData } = useEntitiesWithAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useSaldosTransactions(dateRange.start, dateRange.end);
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
    handleAddMerchant, handleEditMerchant, handleDeleteMerchant, handleActivateMerchant, handleAporteSubmit, resetAporte, resetGasto
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

  const filteredAccounts = sortByAccountOrder(
    (entitiesData?.accounts?.filter(acc => {
      if (aporte.origem === "ASSOC") return acc.entity_id === associacaoEntity?.id;
      if (aporte.origem === "UE") return acc.entity_id === ueEntity?.id;
      if (aporte.origem === "CX") return acc.entity_id === cxEntity?.id;
      return false;
    }) || [])
  );

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
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-full border">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-xs cursor-pointer">Inativos</Label>
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
                    <Label htmlFor="new-merchant-name">Nome do Estabelecimento</Label>
                    <Input
                      id="new-merchant-name"
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
                        {!merchant.active && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Inativo</span>
                        )}
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
                        {merchant.active ? (
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
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-primary"
                            title="Reativar"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const success = await handleActivateMerchant(merchant.id);
                              if (success) refetchMerchants();
                            }}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
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
                <Label htmlFor="edit-merchant-name">Nome</Label>
                <Input
                  id="edit-merchant-name"
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
          onSubmit={async () => true} // Not used as dialog handles its own batch submit
          isLoading={actionsLoading}
        />

        {/* Transactions Table Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-primary" />
                Histórico de Saldos nos Estabelecimentos
              </CardTitle>
              <TransactionExportActions transactions={transactions || []} filename="saldos_relatorio" />
            </div>
          </CardHeader>
          <CardContent>
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
            <TransactionTable
              transactions={transactions?.filter(t => matchesSearchTerm(t, searchTerm)) || []}
              isLoading={transactionsLoading}
              onVoid={(id) => setVoidingId(id)}
              showMerchant={true}
              showOrigin={true}
              showAccount={true}
            />
          </CardContent>
        </Card>

        {/* Void Transaction Dialog */}
        <VoidTransactionDialog
          open={!!voidingId}
          onClose={() => setVoidingId(null)}
          reason={voidReason}
          onReasonChange={setVoidReason}
          onConfirm={handleVoidTx}
          isPending={voidTransaction.isPending}
          warningMessage="Esta ação é irreversível e reverterá o impacto financeiro no saldo do estabelecimento e da conta envolvida imediatamente."
          placeholder="Ex: Lançado em estabelecimento errado"
        />
      </div>
    </DashboardLayout >
  );
}
