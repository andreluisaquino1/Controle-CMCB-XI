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
  Wallet,
  CreditCard,
  Building2,
  Building as Library,
  Loader2,
  Banknote,
  Plus,
  Minus,
  Settings,
  ArrowRightLeft,
} from "lucide-react";
import { useState } from "react";
import { formatCurrencyBRL } from "@/lib/currency";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useAssociacaoAccounts, useEntitiesWithAccounts } from "@/hooks/use-accounts";
import { useToast } from "@/hooks/use-toast";
import { getTodayString } from "@/lib/date-utils";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { cleanAccountDisplayName } from "@/lib/account-display";

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardData();
  const { toast } = useToast();
  // Force deploy refresh
  const createTransaction = useCreateTransaction();
  const { data: assocAccounts } = useAssociacaoAccounts();
  const { data: entitiesData } = useEntitiesWithAccounts();
  const [openDialog, setOpenDialog] = useState<string | null>(null);

  // --- Shortcut States ---
  // Mensalidade
  const [mensalidadeDate, setMensalidadeDate] = useState(getTodayString());
  const [mensalidadeTurno, setMensalidadeTurno] = useState<string>("");
  const [mensalidadeCash, setMensalidadeCash] = useState(0);
  const [mensalidadePix, setMensalidadePix] = useState(0);
  // Gasto Associação
  const [gastoAssocDate, setGastoAssocDate] = useState(getTodayString());
  const [gastoAssocMeio, setGastoAssocMeio] = useState<string>("");
  const [gastoAssocValor, setGastoAssocValor] = useState(0);
  const [gastoAssocDesc, setGastoAssocDesc] = useState("");
  // Aporte Estabelecimento
  const [aporteDate, setAporteDate] = useState(getTodayString());
  const [aporteOrigem, setAporteOrigem] = useState<string>("");
  const [aporteConta, setAporteConta] = useState<string>("");
  const [aporteMerchant, setAporteMerchant] = useState<string>("");
  const [aporteValor, setAporteValor] = useState(0);
  const [aporteDesc, setAporteDesc] = useState("");
  // Consumo Estabelecimento
  const [consumoDate, setConsumoDate] = useState(getTodayString());
  const [consumoMerchant, setConsumoMerchant] = useState<string>("");
  const [consumoValor, setConsumoValor] = useState(0);
  const [consumoDesc, setConsumoDesc] = useState("");

  const associacaoEntity = entitiesData?.entities?.find(e => e.type === "associacao");
  const ueEntity = entitiesData?.entities?.find(e => e.type === "ue");
  const cxEntity = entitiesData?.entities?.find(e => e.type === "cx");

  const especieAccount = assocAccounts?.find(a => a.name === ACCOUNT_NAMES.ESPECIE);
  const pixAccount = assocAccounts?.find(a => a.name === ACCOUNT_NAMES.BB_ASSOCIACAO_PIX);

  const resetMensalidade = () => {
    setMensalidadeDate(getTodayString());
    setMensalidadeTurno("");
    setMensalidadeCash(0);
    setMensalidadePix(0);
  };

  const handleMensalidadeSubmit = async () => {
    if (!mensalidadeTurno) return toast({ title: "Erro", description: "Selecione o turno.", variant: "destructive" });
    if (mensalidadeCash === 0 && mensalidadePix === 0) return toast({ title: "Erro", description: "Informe um valor.", variant: "destructive" });
    if (!especieAccount || !pixAccount || !associacaoEntity) return;

    if (mensalidadeCash > 0) {
      await createTransaction.mutateAsync({
        transaction: {
          transaction_date: mensalidadeDate,
          module: "mensalidade",
          entity_id: associacaoEntity.id,
          destination_account_id: especieAccount.id,
          amount: mensalidadeCash,
          direction: "in",
          payment_method: "cash",
          shift: mensalidadeTurno as "matutino" | "vespertino",
          description: `Mensalidade ${mensalidadeTurno}`,
        },
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
      });
    }

    toast({ title: "Sucesso", description: "Mensalidade registrada." });
    resetMensalidade();
    setOpenDialog(null);
    refetch();
  };

  const handleGastoAssocSubmit = async () => {
    if (!gastoAssocMeio) return toast({ title: "Erro", description: "Selecione o meio.", variant: "destructive" });
    if (gastoAssocValor <= 0) return toast({ title: "Erro", description: "Informe o valor.", variant: "destructive" });
    if (!gastoAssocDesc.trim()) return toast({ title: "Erro", description: "Informe a descrição.", variant: "destructive" });
    if (!associacaoEntity) return;

    const sourceAccount = gastoAssocMeio === "cash" ? especieAccount : pixAccount;
    if (!sourceAccount) return;

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: gastoAssocDate,
        module: "gasto_associacao",
        entity_id: associacaoEntity.id,
        source_account_id: sourceAccount.id,
        amount: gastoAssocValor,
        direction: "out",
        payment_method: gastoAssocMeio as "cash" | "pix",
        description: gastoAssocDesc,
      },
    });

    toast({ title: "Sucesso", description: "Gasto registrado." });
    setGastoAssocValor(0); setGastoAssocDesc("");
    setOpenDialog(null);
    refetch();
  };

  const handleAporteSubmit = async () => {
    if (!aporteOrigem || !aporteConta || !aporteMerchant || aporteValor <= 0 || !aporteDesc.trim()) {
      return toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
    }

    let entityId: string | undefined;
    if (aporteOrigem === "ASSOC") entityId = associacaoEntity?.id;
    else if (aporteOrigem === "UE") entityId = ueEntity?.id;
    else if (aporteOrigem === "CX") entityId = cxEntity?.id;

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
        origin_fund: (aporteOrigem === "UE" || aporteOrigem === "CX") ? (aporteOrigem as "UE" | "CX") : null,
        description: aporteDesc,
      },
    });

    toast({ title: "Sucesso", description: "Aporte registrado." });
    setAporteValor(0); setAporteDesc("");
    setOpenDialog(null);
    refetch();
  };

  const handleConsumoSubmit = async () => {
    if (!consumoMerchant || consumoValor <= 0 || !consumoDesc.trim()) {
      return toast({ title: "Erro", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
    }

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: consumoDate,
        module: "consumo_saldo",
        merchant_id: consumoMerchant,
        amount: consumoValor,
        direction: "out",
        description: consumoDesc,
      },
    });

    toast({ title: "Sucesso", description: "Consumo registrado." });
    setConsumoValor(0); setConsumoDesc("");
    setOpenDialog(null);
    refetch();
  };

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

  const aporteAccounts = entitiesData?.accounts?.filter(acc => {
    if (aporteOrigem === "ASSOC") return acc.entity_id === associacaoEntity?.id;
    if (aporteOrigem === "UE") return acc.entity_id === ueEntity?.id;
    if (aporteOrigem === "CX") return acc.entity_id === cxEntity?.id;
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Dialog open={openDialog === "mensalidade"} onOpenChange={(o) => setOpenDialog(o ? "mensalidade" : null)}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-16 justify-start gap-4 px-4 bg-success/5 border-success/20 hover:bg-success/10 group">
                  <Banknote className="h-6 w-6 text-success transition-transform group-hover:scale-110" />
                  <div className="text-left">
                    <p className="font-semibold text-success">Mensalidade</p>
                    <p className="text-xs text-muted-foreground">Nova entrada</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Mensalidade</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Data *</Label><DateInput value={mensalidadeDate} onChange={setMensalidadeDate} /></div>
                  <div className="space-y-2">
                    <Label>Turno *</Label>
                    <Select value={mensalidadeTurno} onValueChange={setMensalidadeTurno}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent><SelectItem value="matutino">Matutino</SelectItem><SelectItem value="vespertino">Vespertino</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Espécie (R$)</Label><CurrencyInput value={mensalidadeCash} onChange={setMensalidadeCash} /></div>
                  <div className="space-y-2"><Label>PIX (R$)</Label><CurrencyInput value={mensalidadePix} onChange={setMensalidadePix} /></div>
                  <Button className="w-full" onClick={handleMensalidadeSubmit} disabled={createTransaction.isPending}>Registrar</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={openDialog === "gasto-assoc"} onOpenChange={(o) => setOpenDialog(o ? "gasto-assoc" : null)}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-16 justify-start gap-4 px-4 bg-destructive/5 border-destructive/20 hover:bg-destructive/10 group">
                  <Minus className="h-6 w-6 text-destructive transition-transform group-hover:scale-110" />
                  <div className="text-left">
                    <p className="font-semibold text-destructive">Gasto Associação</p>
                    <p className="text-xs text-muted-foreground">Nova despesa</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Gasto da Associação</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Data *</Label><DateInput value={gastoAssocDate} onChange={setGastoAssocDate} /></div>
                  <div className="space-y-2">
                    <Label>Meio *</Label>
                    <Select value={gastoAssocMeio} onValueChange={setGastoAssocMeio}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent><SelectItem value="cash">Espécie</SelectItem><SelectItem value="pix">PIX</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Valor *</Label><CurrencyInput value={gastoAssocValor} onChange={setGastoAssocValor} /></div>
                  <div className="space-y-2"><Label>Descrição *</Label><Input value={gastoAssocDesc} onChange={(e) => setGastoAssocDesc(e.target.value)} placeholder="O que foi pago?" /></div>
                  <Button className="w-full" onClick={handleGastoAssocSubmit} disabled={createTransaction.isPending}>Registrar</Button>
                </div>
              </DialogContent>
            </Dialog>



            <Dialog open={openDialog === "consumo-mer"} onOpenChange={(o) => setOpenDialog(o ? "consumo-mer" : null)}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-16 justify-start gap-4 px-4 bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/10 group">
                  <ArrowRightLeft className="h-6 w-6 text-orange-500 transition-transform group-hover:scale-110" />
                  <div className="text-left">
                    <p className="font-semibold text-orange-500">Gasto Estabelecimento</p>
                    <p className="text-xs text-muted-foreground">Baixa de saldo</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Consumo Estabelecimento</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>Data *</Label><DateInput value={consumoDate} onChange={setConsumoDate} /></div>
                  <div className="space-y-2">
                    <Label>Estabelecimento *</Label>
                    <Select value={consumoMerchant} onValueChange={setConsumoMerchant}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{data.merchantBalances.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Valor *</Label><CurrencyInput value={consumoValor} onChange={setConsumoValor} /></div>
                  <div className="space-y-2"><Label>Descrição *</Label><Input value={consumoDesc} onChange={(e) => setConsumoDesc(e.target.value)} placeholder="Ex: Lanche alunos" /></div>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleConsumoSubmit} disabled={createTransaction.isPending}>Registrar Consumo</Button>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </section>

        {/* Associação Section */}
        <section>
          <div className="module-header">
            <div className="module-icon"><Building2 className="h-5 w-5" /></div>
            <h2 className="text-lg font-semibold text-foreground">Saldos Associação</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="stat-card-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" />Espécie</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrencyBRL(data.especieBalance)}</p></CardContent>
            </Card>
            <Card className="stat-card-secondary">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4" />PIX</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${data.pixBalance < 0 ? "text-destructive" : ""}`}>{formatCurrencyBRL(data.pixBalance)}</p></CardContent>
            </Card>
            <Card className="stat-card-accent">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wallet className="h-4 w-4" />Cofre</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatCurrencyBRL(data.cofreBalance)}</p></CardContent>
            </Card>
          </div>
        </section>

        {/* Established Balances Section */}
        <section>
          <div className="module-header">
            <div className="module-icon bg-secondary/10 text-secondary"><Wallet className="h-5 w-5" /></div>
            <h2 className="text-lg font-semibold text-foreground">Saldos dos Estabelecimentos</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.merchantBalances.length === 0 ? (
              <p className="text-muted-foreground col-span-full">Nenhum estabelecimento com saldo</p>
            ) : (
              data.merchantBalances.map((m) => (
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
                {data.resourceBalances.UE.map(acc => (
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
                {data.resourceBalances.CX.map(acc => (
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
      </div>
    </DashboardLayout>
  );
}

