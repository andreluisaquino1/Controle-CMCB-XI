import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Building2, Loader2, ArrowUpCircle, ArrowDownCircle, ScrollText, Pencil, Trash2, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useCreateTransaction, useCreateResourceTransaction, useVoidTransaction } from "@/hooks/use-transactions";
import { useEntitiesWithAccounts, useCreateAccount, useUpdateAccount, useDeactivateAccount } from "@/hooks/use-accounts";
import { useMerchants } from "@/hooks/use-merchants";
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
import { Switch } from "@/components/ui/switch";
import { Account } from "@/types";
import { ListPlus } from "lucide-react";

export default function RecursosPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const createTransaction = useCreateResourceTransaction();
  const voidTransaction = useVoidTransaction();
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { data: entitiesData, isLoading: entitiesLoading, refetch: refetchEntities } = useEntitiesWithAccounts(showInactive);
  const { data: transactions, isLoading: transactionsLoading } = useRecursosTransactions();
  const { data: merchantsData } = useMerchants();

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
    merchantId: "",
    notes: "",
    capitalCusteio: "",
  });

  const setGastoDate = (date: string) => setGasto(prev => ({ ...prev, date }));
  const setGastoEntityId = (entityId: string) => setGasto(prev => ({ ...prev, entityId, accountId: "" }));
  const setGastoAccountId = (accountId: string) => setGasto(prev => ({ ...prev, accountId }));
  const setGastoMerchantId = (merchantId: string) => setGasto(prev => ({ ...prev, merchantId }));
  const setGastoNotes = (notes: string) => setGasto(prev => ({ ...prev, notes }));
  const setGastoCapitalCusteio = (capitalCusteio: string) => setGasto(prev => ({ ...prev, capitalCusteio }));

  const resetGasto = () => {
    setGasto({
      date: getTodayString(),
      entityId: "",
      accountId: "",
      merchantId: "",
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
      console.error("Error creating resource transaction:", error);
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
      console.error("Error voiding transaction:", error);
    }
  };

  const handleCreateAccount = async (data: { name: string; account_number: string; entity_id: string }) => {
    setActionsLoading(true);
    try {
      await createAccount.mutateAsync(data);
      refetchEntities();
      return true;
    } catch (error) {
      console.error("Error creating account:", error);
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
      console.error("Error updating account:", error);
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
      console.error("Error deactivating account:", error);
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
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-1.5 rounded-full border">
              <Switch
                id="show-inactive-recursos"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive-recursos" className="text-xs cursor-pointer">Inativos</Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => setOpenDialog("nova-conta")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>
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
                  <Card key={acc.id} className={`bg-card border-none shadow-sm relative group ${!acc.active ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{cleanAccountDisplayName(acc.name)}</p>
                          {!acc.active && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Inativo</span>
                          )}
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
                  <Card key={acc.id} className={`bg-card border-none shadow-sm relative group ${!acc.active ? "opacity-60" : ""}`}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{cleanAccountDisplayName(acc.name)}</p>
                          {!acc.active && (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Inativo</span>
                          )}
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
            setMerchantId: setGastoMerchantId,
            setNotes: setGastoNotes,
            setCapitalCusteio: setGastoCapitalCusteio,
          }}
          entities={entities}
          accounts={accounts}
          merchants={merchantsData || []}
          onSubmit={async () => true} // Not used as dialog handles its own batch submit
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
              showMerchant={true}
              onVoid={(id) => setVoidingId(id)}
            />
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
                <Label htmlFor="void-reason-recursos">Motivo da Anulação <span className="text-destructive">*</span></Label>
                <Input
                  id="void-reason-recursos"
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

        {/* Footer Info Section */}
        <Card className="bg-muted/30 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Entidades Vinculadas (UE e Caixa)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    Unidade Executora CMCB-XI
                  </h4>
                  <p className="text-xs text-muted-foreground"><strong>CNPJ:</strong> 38.331.489/0001-57</p>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Focada em recursos federais diretos via FNDE para a manutenção administrativa e tecnológica.
                  </p>
                </div>
                <div className="bg-background/40 p-2 rounded text-[10px] text-muted-foreground border border-border/40">
                  <p className="font-medium text-foreground mb-1">Contas Principais (BB Ag 0782-0):</p>
                  <ul className="grid grid-cols-1 gap-1">
                    <li>• <strong>PDDE:</strong> 36699-4</li>
                    <li>• <strong>Educação Conectada:</strong> 37715-5</li>
                    <li>• <strong>PDDE Equidade:</strong> 46996-3</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    Caixa Escolar CMCB-XI
                  </h4>
                  <p className="text-xs text-muted-foreground"><strong>CNPJ:</strong> 37.812.693/0001-27</p>
                  <p className="text-sm text-muted-foreground leading-snug">
                    Gere repasses estaduais e federais destinados especificamente à alimentação e manutenção estrutural.
                  </p>
                </div>
                <div className="bg-background/40 p-2 rounded text-[10px] text-muted-foreground border border-border/40">
                  <p className="font-medium text-foreground mb-1">Contas Principais (BB Ag 0782-0):</p>
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <li>• <strong>PNAE Merenda:</strong> 47358-8</li>
                    <li>• <strong>PDDE:</strong> 36761-3</li>
                    <li>• <strong>FEE Estaduais:</strong> 36501-7</li>
                    <li>• <strong>Educ. Conect:</strong> 37714-7</li>
                    <li>• <strong>PDDE Equidade:</strong> 46995-5</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
