import { DashboardLayout } from "@/shared/components/DashboardLayout";
import { useExpenseShortcuts } from "@/features/transactions/hooks/use-expense-shortcuts";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Wallet,
  CreditCard,
  Building2,
  Building as Library,
  Loader2,
  Banknote,
  Plus,
  Minus,
  ArrowRightLeft,
  X,
  PlusCircle,
} from "lucide-react";
import { useState } from "react";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { useAssociacaoAccounts, useEntitiesWithAccounts } from "@/shared/hooks/use-accounts";
import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";
import { cleanAccountDisplayName } from "@/shared/lib/account-display";
import { useAssociacaoActions } from "@/features/associacao/hooks/use-associacao-actions";
import { useSaldosActions } from "@/features/recursos/hooks/use-saldos-actions";
import { ActionCard } from "@/shared/components/ActionCard";
import { MensalidadeDialog } from "@/features/associacao/components/MensalidadeDialog";
import { GastoAssociacaoDialog } from "@/features/associacao/components/GastoAssociacaoDialog";
import { ConsumoSaldoDialog } from "@/features/recursos/components/ConsumoSaldoDialog";
import { useAuth } from "@/features/auth/contexts/AuthContext";

export default function DashboardPage() {
  const { isSecretaria } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardData();
  const { data: assocAccounts } = useAssociacaoAccounts();
  const { data: entitiesData } = useEntitiesWithAccounts();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const associacaoEntity = entitiesData?.entities?.find(e => e.type === "associacao");
  const ueEntity = entitiesData?.entities?.find(e => e.type === "ue");
  const cxEntity = entitiesData?.entities?.find(e => e.type === "cx");

  // --- Reusing Hooks ---
  const assocActions = useAssociacaoActions(
    assocAccounts,
    associacaoEntity,
    () => { refetch(); setOpenDialog(null); }
  );

  const saldosActions = useSaldosActions(
    data?.merchantBalances,
    entitiesData?.entities,
    () => { refetch(); setOpenDialog(null); }
  );

  const {
    state: assocState,
    setters: assocSetters,
    handlers: assocHandlers,
    isLoading: assocLoading
  } = assocActions;

  const {
    state: saldosState,
    setters: saldosSetters,
    handlers: saldosHandlers,
    isLoading: saldosLoading
  } = saldosActions;

  // Shortcut States (Specific to Dashboard)
  const [newShortcut, setNewShortcut] = useState("");
  const [showShortcutInput, setShowShortcutInput] = useState(false);
  const { shortcuts, addShortcut, removeShortcut } = useExpenseShortcuts();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-destructive">Erro ao carregar dados do resumo.</p>
        </div>
      </DashboardLayout>
    );
  }

  const filteredAporteAccounts = entitiesData?.accounts?.filter(acc => {
    if (saldosState.aporte.origem === "ASSOC") return acc.entity_id === associacaoEntity?.id;
    if (saldosState.aporte.origem === "UE") return acc.entity_id === ueEntity?.id;
    if (saldosState.aporte.origem === "CX") return acc.entity_id === cxEntity?.id;
    return false;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resumo</h1>
          <p className="text-muted-foreground">Saldos atuais do sistema</p>
        </div>

        {/* Shortcuts Section */}
        <section>
          <div className="module-header">
            <div className="module-icon">
              <Plus className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Ações Rápidas</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            <ActionCard
              title="Mensalidade"
              description="Nova entrada de alunos"
              icon={Banknote}
              variant="success"
              onClick={() => setOpenDialog("mensalidade")}
            />

            <MensalidadeDialog
              open={openDialog === "mensalidade"}
              onOpenChange={(o) => {
                setOpenDialog(o ? "mensalidade" : null);
                if (!o) assocHandlers.resetMensalidade();
              }}
              state={assocState.mensalidade}
              setters={{
                setDate: assocSetters.setMensalidadeDate,
                setTurno: assocSetters.setMensalidadeTurno,
                setCash: assocSetters.setMensalidadeCash,
                setPix: assocSetters.setMensalidadePix,
                setObs: assocSetters.setMensalidadeObs,
              }}
              onSubmit={assocHandlers.handleMensalidadeSubmit}
              isLoading={assocLoading}
            />

            <ActionCard
              title="Despesa Associação"
              description="Novo pagamento direto"
              icon={Minus}
              variant="destructive"
              onClick={() => setOpenDialog("gasto-assoc")}
            />

            <GastoAssociacaoDialog
              open={openDialog === "gasto-assoc"}
              onOpenChange={(o) => {
                setOpenDialog(o ? "gasto-assoc" : null);
                if (!o) assocHandlers.resetGasto();
              }}
              state={assocState.gasto}
              setters={{
                setDate: assocSetters.setGastoDate,
                setMeio: assocSetters.setGastoMeio,
                setObs: assocSetters.setGastoObs,
              }}
              shortcuts={shortcuts}
              addShortcut={addShortcut}
              removeShortcut={removeShortcut}
              onSubmit={assocHandlers.handleGastoSubmit}
              isLoading={assocLoading}
              strictBalance={true}
            />

            {!isSecretaria && (
              <>
                <ActionCard
                  title="Gasto Estabelecimento"
                  description="Baixa de saldo devedor"
                  icon={ArrowRightLeft}
                  variant="secondary"
                  onClick={() => setOpenDialog("consumo-mer")}
                />

                <ConsumoSaldoDialog
                  open={openDialog === "consumo-mer"}
                  onOpenChange={(o) => {
                    setOpenDialog(o ? "consumo-mer" : null);
                    if (!o) saldosHandlers.resetGasto();
                  }}
                  state={saldosState.gasto}
                  setters={{
                    setDate: saldosSetters.setGastoDate,
                    setMerchant: saldosSetters.setGastoMerchant,
                    setValor: saldosSetters.setGastoValor,
                    setDescricao: saldosSetters.setGastoDescricao,
                    setObs: saldosSetters.setGastoObs,
                  }}
                  merchants={data?.merchantBalances || []}
                  onSubmit={saldosHandlers.handleGastoSubmit}
                  isLoading={saldosLoading}
                />
              </>
            )}

          </div>
        </section>

        {/* Associação Section */}
        <section>
          <div className="module-header">
            <div className="module-icon"><Building2 className="h-5 w-5" /></div>
            <h2 className="text-lg font-semibold text-foreground">Saldos Associação</h2>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="stat-card-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Espécie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrencyBRL(data.especieBalance)}</p>
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
                <p className={`text-2xl font-bold ${data.pixBalance < 0 ? "text-destructive" : ""}`}>
                  {formatCurrencyBRL(data.pixBalance)}
                </p>
              </CardContent>
            </Card>

            <Card className="stat-card-primary border-l-indigo-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Conta Digital
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${data.contaDigitalBalance < 0 ? "text-destructive" : ""}`}>
                  {formatCurrencyBRL(data.contaDigitalBalance)}
                </p>
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
                <p className="text-2xl font-bold">{formatCurrencyBRL(data.cofreBalance)}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {!isSecretaria && (
          <>
            {/* Established Balances Section */}
            <section>
              <div className="module-header">
                <div className="module-icon bg-secondary/10 text-secondary"><Wallet className="h-5 w-5" /></div>
                <h2 className="text-lg font-semibold text-foreground">Saldos dos Estabelecimentos</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {!data.merchantBalances || data.merchantBalances.length === 0 ? (
                  <p className="text-muted-foreground col-span-full">Nenhum estabelecimento com saldo</p>
                ) : (
                  [...(data.merchantBalances || [])]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((m) => (
                      <Card key={m.id} className="bg-card border-l-4 border-l-secondary">
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase">{m.name}</CardTitle></CardHeader>
                        <CardContent><p className={`text-xl font-bold ${Number(m.balance) < 0 ? "text-destructive" : ""}`}>{formatCurrencyBRL(Number(m.balance))}</p></CardContent>
                      </Card>
                    ))
                )}
              </div>
            </section>

            {/* Resources Section grouped by origin */}
            <section>
              <div className="module-header">
                <div className="module-icon"><Library className="h-5 w-5" /></div>
                <h2 className="text-lg font-semibold text-foreground">Saldos dos Recursos (por conta)</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Unidade Executora</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.resourceBalances?.UE
                      ?.sort((a, b) => a.name.localeCompare(b.name))
                      ?.map(acc => (
                        <Card key={acc.id} className="bg-muted/50 border-none">
                          <CardContent className="py-3 flex justify-between items-center">
                            <span className="text-sm font-medium">{cleanAccountDisplayName(acc.name)}</span>
                            <span className={`font-bold ${acc.balance < 0 ? "text-destructive" : ""}`}>{formatCurrencyBRL(acc.balance)}</span>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Caixa Escolar</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {data.resourceBalances?.CX
                      ?.sort((a, b) => a.name.localeCompare(b.name))
                      ?.map(acc => (
                        <Card key={acc.id} className="bg-muted/50 border-none">
                          <CardContent className="py-3 flex justify-between items-center">
                            <span className="text-sm font-medium">{cleanAccountDisplayName(acc.name)}</span>
                            <span className={`font-bold ${acc.balance < 0 ? "text-destructive" : ""}`}>{formatCurrencyBRL(acc.balance)}</span>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
