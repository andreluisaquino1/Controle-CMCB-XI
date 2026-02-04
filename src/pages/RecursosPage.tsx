import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Building2, Loader2, ArrowUpCircle, ArrowDownCircle, ScrollText, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCreateTransaction, useVoidTransaction } from "@/hooks/use-transactions";
import { useEntitiesWithAccounts, useCreateAccount, useUpdateAccount, useDeactivateAccount } from "@/hooks/use-accounts";
import { useRecursosTransactions } from "@/hooks/use-entity-transactions";
import { getTodayString } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { cleanAccountDisplayName } from "@/lib/account-display";
import { ActionCard } from "@/components/ActionCard";
import { EntradaRecursoDialog } from "@/components/forms/EntradaRecursoDialog";
import { GastoRecursoDialog } from "@/components/forms/GastoRecursoDialog";
import { AccountDialog } from "@/components/forms/AccountDialog";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Account } from "@/types";

export default function RecursosPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const createTransaction = useCreateTransaction();
  const voidTransaction = useVoidTransaction();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const { data: entitiesData, isLoading: entitiesLoading, refetch: refetchEntities } = useEntitiesWithAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useRecursosTransactions();

  // Account Management
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deactivateAccount = useDeactivateAccount();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deactivatingAccount, setDeactivatingAccount] = useState<Account | null>(null);

  // Form state for EntradaRecursoDialog
  const [entrada, setEntrada] = useState({
    date: getTodayString(),
    entityId: "",
    accountId: "",
    amount: 0,
    description: "",
    notes: "",
  });

  const setEntradaDate = (date: string) => setEntrada(prev => ({ ...prev, date }));
  const setEntradaEntityId = (entityId: string) => setEntrada(prev => ({ ...prev, entityId, accountId: "" }));
  const setEntradaAccountId = (accountId: string) => setEntrada(prev => ({ ...prev, accountId }));
  const setEntradaAmount = (amount: number) => setEntrada(prev => ({ ...prev, amount }));
  const setEntradaDescription = (description: string) => setEntrada(prev => ({ ...prev, description }));
  const setEntradaNotes = (notes: string) => setEntrada(prev => ({ ...prev, notes }));

  const resetEntrada = () => {
    setEntrada({
      date: getTodayString(),
      entityId: "",
      accountId: "",
      amount: 0,
      description: "",
      notes: "",
    });
  };

  // Form state for GastoRecursoDialog
  const [gasto, setGasto] = useState({
    date: getTodayString(),
    entityId: "",
    accountId: "",
    amount: 0,
    description: "",
    notes: "",
    capitalCusteio: "",
  });

  const setGastoDate = (date: string) => setGasto(prev => ({ ...prev, date }));
  const setGastoEntityId = (entityId: string) => setGasto(prev => ({ ...prev, entityId, accountId: "" }));
  const setGastoAccountId = (accountId: string) => setGasto(prev => ({ ...prev, accountId }));
  const setGastoAmount = (amount: number) => setGasto(prev => ({ ...prev, amount }));
  const setGastoDescription = (description: string) => setGasto(prev => ({ ...prev, description }));
  const setGastoNotes = (notes: string) => setGasto(prev => ({ ...prev, notes }));
  const setGastoCapitalCusteio = (capitalCusteio: string) => setGasto(prev => ({ ...prev, capitalCusteio }));

  const resetGasto = () => {
    setGasto({
      date: getTodayString(),
      entityId: "",
      accountId: "",
      amount: 0,
      description: "",
      notes: "",
      capitalCusteio: "",
    });
  };

  const [actionsLoading, setActionsLoading] = useState(false);

  const ueEntity = entitiesData?.entities?.find(e => e.type === "ue");
  const cxEntity = entitiesData?.entities?.find(e => e.type === "cx");

  const entities = entitiesData?.entities || [];
  const accounts = entitiesData?.accounts || [];

  const handleEntradaSubmit = async () => {
    setActionsLoading(true);
    try {
      await createTransaction.mutateAsync({
        transaction: {
          transaction_date: entrada.date,
          module: "pix_direto_uecx",
          entity_id: entrada.entityId,
          source_account_id: null,
          destination_account_id: entrada.accountId,
          amount: entrada.amount,
          direction: "in",
          payment_method: "pix",
          origin_fund: entities.find(e => e.id === entrada.entityId)?.type === "ue" ? "UE" : "CX",
          description: entrada.description,
          notes: entrada.notes || null,
        },
      });
      toast.success("Entrada registrada.");
      resetEntrada();
      setOpenDialog(null);
      return true;
    } catch (error) {
      return false;
    } finally {
      setActionsLoading(false);
    }
  };

  const handleGastoSubmit = async () => {
    setActionsLoading(true);
    try {
      await createTransaction.mutateAsync({
        transaction: {
          transaction_date: gasto.date,
          module: "pix_direto_uecx",
          entity_id: gasto.entityId,
          source_account_id: gasto.accountId,
          destination_account_id: null,
          amount: gasto.amount,
          direction: "out",
          payment_method: "pix",
          origin_fund: entities.find(e => e.id === gasto.entityId)?.type === "ue" ? "UE" : "CX",
          description: gasto.description,
          notes: gasto.notes || null,
          capital_custeio: (gasto.capitalCusteio as any) || null,
        },
      });
      toast.success("Gasto registrado.");
      resetGasto();
      setOpenDialog(null);
      return true;
    } catch (error) {
      return false;
    } finally {
      setActionsLoading(false);
    }
  };

  const handleVoidTx = async () => {
    if (!voidingId || !voidReason.trim()) return;
    try {
      await voidTransaction.mutateAsync({ transactionId: voidingId, reason: voidReason });
      toast.success("Lançamento anulado com sucesso.");
      setVoidingId(null);
      setVoidReason("");
    } catch (error) {
      // Handled in hook
    }
  };

  const handleCreateAccount = async (data: { name: string; account_number: string; entity_id: string }) => {
    setActionsLoading(true);
    try {
      await createAccount.mutateAsync(data);
      refetchEntities();
      return true;
    } catch (error) {
      return false;
    } finally {
      setActionsLoading(false);
    }
  };

  const handleUpdateAccount = async (data: { name: string; account_number: string; entity_id: string }) => {
    if (!editingAccount) return false;
    setActionsLoading(true);
    try {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        name: data.name,
        account_number: data.account_number,
      });
      refetchEntities();
      setEditingAccount(null);
      return true;
    } catch (error) {
      return false;
    } finally {
      setActionsLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!deactivatingAccount) return;
    setActionsLoading(true);
    try {
      await deactivateAccount.mutateAsync(deactivatingAccount.id);
      refetchEntities();
      setDeactivatingAccount(null);
    } catch (error) {
    } finally {
      setActionsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recursos (UE e CX)</h1>
            <p className="text-muted-foreground">Entradas e gastos diretos das contas da Unidade Executora e Caixa Escolar</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpenDialog("nova-conta")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Saldos por Conta Block */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Unidade Executora Column */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Unidade Executora
              </h3>
              <div className="grid gap-2">
                {entitiesLoading ? (
                  <div className="h-20 flex items-center justify-center bg-muted/20 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : accounts.filter(a => a.entity_id === ueEntity?.id).map(acc => (
                  <Card key={acc.id} className="bg-card border-none shadow-sm relative group">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{cleanAccountDisplayName(acc.name)}</p>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setEditingAccount(acc)}><Pencil className="h-3 w-3" /></button>
                            <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setDeactivatingAccount(acc)}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{acc.account_number || "Sem conta"}</p>
                      </div>
                      <p className={`font-bold ${acc.balance < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrencyBRL(acc.balance)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Caixa Escolar Column */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Caixa Escolar
              </h3>
              <div className="grid gap-2">
                {entitiesLoading ? (
                  <div className="h-20 flex items-center justify-center bg-muted/20 rounded-lg"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : accounts.filter(a => a.entity_id === cxEntity?.id).map(acc => (
                  <Card key={acc.id} className="bg-card border-none shadow-sm relative group">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{cleanAccountDisplayName(acc.name)}</p>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button className="text-muted-foreground hover:text-primary transition-colors" onClick={() => setEditingAccount(acc)}><Pencil className="h-3 w-3" /></button>
                            <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => setDeactivatingAccount(acc)}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{acc.account_number || "Sem conta"}</p>
                      </div>
                      <p className={`font-bold ${acc.balance < 0 ? "text-destructive" : "text-foreground"}`}>{formatCurrencyBRL(acc.balance)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            title="Entrada de Recurso"
            description="Registrar aporte na conta"
            icon={ArrowDownCircle}
            variant="success"
            onClick={() => setOpenDialog("entrada")}
          />
          <ActionCard
            title="Gasto de Recurso"
            description="Registrar pagamento direto"
            icon={ArrowUpCircle}
            variant="destructive"
            onClick={() => setOpenDialog("gasto")}
          />
        </div>

        {/* Account Management Dialogs */}
        <AccountDialog
          open={openDialog === "nova-conta"}
          onOpenChange={(o) => setOpenDialog(o ? "nova-conta" : null)}
          title="Nova Conta de Recurso"
          entities={entities}
          onSubmit={handleCreateAccount}
          isLoading={actionsLoading}
        />

        <AccountDialog
          open={!!editingAccount}
          onOpenChange={(o) => !o && setEditingAccount(null)}
          title="Editar Conta de Recurso"
          initialData={editingAccount ? { name: editingAccount.name, account_number: editingAccount.account_number || "", entity_id: editingAccount.entity_id } : undefined}
          entities={entities}
          onSubmit={handleUpdateAccount}
          isLoading={actionsLoading}
        />

        {/* Deactivate Account Action (Confirm Dialog) */}
        <Dialog open={!!deactivatingAccount} onOpenChange={(o) => !o && setDeactivatingAccount(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desativar Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja desativar a conta <strong>{deactivatingAccount?.name}</strong>?
                Os registros históricos não serão apagados, mas a conta não aparecerá mais para novos lançamentos.
              </p>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setDeactivatingAccount(null)}>Cancelar</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeactivateAccount} disabled={actionsLoading}>
                  {actionsLoading ? "Desativando..." : "Confirmar Desativação"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <EntradaRecursoDialog
          open={openDialog === "entrada"}
          onOpenChange={(o) => {
            setOpenDialog(o ? "entrada" : null);
            if (!o) resetEntrada();
          }}
          state={entrada}
          setters={{
            setDate: setEntradaDate,
            setEntityId: setEntradaEntityId,
            setAccountId: setEntradaAccountId,
            setAmount: setEntradaAmount,
            setDescription: setEntradaDescription,
            setNotes: setEntradaNotes,
          }}
          entities={entities}
          accounts={accounts}
          onSubmit={handleEntradaSubmit}
          isLoading={actionsLoading}
        />

        <GastoRecursoDialog
          open={openDialog === "gasto"}
          onOpenChange={(o) => {
            setOpenDialog(o ? "gasto" : null);
            if (!o) resetGasto();
          }}
          state={gasto}
          setters={{
            setDate: setGastoDate,
            setEntityId: setGastoEntityId,
            setAccountId: setGastoAccountId,
            setAmount: setGastoAmount,
            setDescription: setGastoDescription,
            setNotes: setGastoNotes,
            setCapitalCusteio: setGastoCapitalCusteio,
          }}
          entities={entities}
          accounts={accounts}
          onSubmit={handleGastoSubmit}
          isLoading={actionsLoading}
        />

        {/* Transactions Table Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ScrollText className="h-5 w-5 text-primary" />
              Histórico dos Recursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={transactions || []}
              isLoading={transactionsLoading}
              showOrigin={true}
              showAccount={true}
              onVoid={(id) => setVoidingId(id)}
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

        {/* Footer Info Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Sobre os Recursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="font-bold text-foreground mb-2">Unidade Executora:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {accounts
                    .filter(a => a.entity_id === ueEntity?.id)
                    .map(a => (
                      <li key={a.id}>• {cleanAccountDisplayName(a.name)} ({a.account_number || "Sem número"})</li>
                    ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2">Caixa Escolar:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {accounts
                    .filter(a => a.entity_id === cxEntity?.id)
                    .map(a => (
                      <li key={a.id}>• {cleanAccountDisplayName(a.name)} ({a.account_number || "Sem número"})</li>
                    ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
