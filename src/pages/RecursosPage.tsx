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
import { CreditCard, Building2, Loader2, ArrowUpCircle, ArrowDownCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { useEntitiesWithAccounts } from "@/hooks/use-accounts";
import { useRecursosTransactions } from "@/hooks/use-entity-transactions";
import { getTodayString, formatDateBR } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { cleanAccountDisplayName } from "@/lib/account-display";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RecursosPage() {
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const { toast } = useToast();
  const createTransaction = useCreateTransaction();
  const { data: entitiesData, isLoading: entitiesLoading } = useEntitiesWithAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useRecursosTransactions();

  // Form state
  const [date, setDate] = useState(getTodayString());
  const [origem, setOrigem] = useState<string>("");
  const [conta, setConta] = useState<string>("");
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [obs, setObs] = useState("");

  const ueEntity = entitiesData?.entities?.find(e => e.type === "ue");
  const cxEntity = entitiesData?.entities?.find(e => e.type === "cx");

  const filteredAccounts = entitiesData?.accounts?.filter(acc => {
    if (origem === "UE") return acc.entity_id === ueEntity?.id;
    if (origem === "CX") return acc.entity_id === cxEntity?.id;
    return false;
  }) || [];

  const selectedAccount = entitiesData?.accounts?.find(a => a.id === conta);
  const willBeNegative = openDialog === "gasto" && selectedAccount && (Number(selectedAccount.balance) - valor < 0);

  const resetForm = () => {
    setDate(getTodayString());
    setOrigem("");
    setConta("");
    setValor(0);
    setDescricao("");
    setObs("");
  };

  const handleSubmit = async (direction: "in" | "out") => {
    if (!date || !origem || !conta || valor <= 0 || !descricao.trim()) {
      toast({ title: "Erro", description: "Preencha todos os campos obrigatórios (*).", variant: "destructive" });
      return;
    }

    const entityId = origem === "UE" ? ueEntity?.id : cxEntity?.id;

    await createTransaction.mutateAsync({
      transaction: {
        transaction_date: date,
        module: "pix_direto_uecx",
        entity_id: entityId || null,
        source_account_id: direction === "out" ? conta : null,
        destination_account_id: direction === "in" ? conta : null,
        amount: valor,
        direction: direction,
        payment_method: "pix",
        origin_fund: origem as "UE" | "CX",
        description: descricao,
        notes: obs || null,
      },
    });

    toast({ title: "Sucesso", description: direction === "in" ? "Entrada registrada." : "Gasto registrado." });
    resetForm();
    setOpenDialog(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recursos (UE e CX)</h1>
            <p className="text-muted-foreground">Entradas e gastos diretos das contas da Unidade Executora e Caixa Escolar</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <Dialog open={openDialog === "entrada"} onOpenChange={(open) => { setOpenDialog(open ? "entrada" : null); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-elevated transition-shadow border-l-4 border-l-success">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                      <ArrowUpCircle className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Entrada de Recurso</h3>
                      <p className="text-sm text-muted-foreground">Registrar aporte na conta</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Nova Entrada de Recurso</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Data *</Label><DateInput value={date} onChange={setDate} /></div>
                <div className="space-y-2">
                  <Label>Origem *</Label>
                  <Select value={origem} onValueChange={(v) => { setOrigem(v); setConta(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="UE">Unidade Executora</SelectItem><SelectItem value="CX">Caixa Escolar</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta *</Label>
                  <Select value={conta} onValueChange={setConta} disabled={!origem}>
                    <SelectTrigger><SelectValue placeholder="Selecione conta" /></SelectTrigger>
                    <SelectContent>{filteredAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{cleanAccountDisplayName(acc.name)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Valor (R$) *</Label><CurrencyInput value={valor} onChange={setValor} /></div>
                <div className="space-y-2"><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Repasse PDDE" /></div>
                <div className="space-y-2"><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></div>
                <Button className="w-full bg-success hover:bg-success/90" onClick={() => handleSubmit("in")} disabled={createTransaction.isPending}>Registrar Entrada</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openDialog === "gasto"} onOpenChange={(open) => { setOpenDialog(open ? "gasto" : null); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-elevated transition-shadow border-l-4 border-l-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <ArrowDownCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Gasto de Recurso</h3>
                      <p className="text-sm text-muted-foreground">Registrar pagamento direto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Gasto de Recurso</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Data *</Label><DateInput value={date} onChange={setDate} /></div>
                <div className="space-y-2">
                  <Label>Origem *</Label>
                  <Select value={origem} onValueChange={(v) => { setOrigem(v); setConta(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="UE">Unidade Executora</SelectItem><SelectItem value="CX">Caixa Escolar</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta *</Label>
                  <Select value={conta} onValueChange={setConta} disabled={!origem}>
                    <SelectTrigger><SelectValue placeholder="Selecione conta" /></SelectTrigger>
                    <SelectContent>{filteredAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{cleanAccountDisplayName(acc.name)}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedAccount && <p className="text-xs text-muted-foreground">Saldo atual: {formatCurrencyBRL(Number(selectedAccount.balance))}</p>}
                </div>
                <div className="space-y-2"><Label>Valor (R$) *</Label><CurrencyInput value={valor} onChange={setValor} /></div>
                <div className="space-y-2"><Label>Descrição *</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que foi pago?" /></div>
                <div className="space-y-2"><Label>Observação</Label><Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></div>

                {willBeNegative && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>Esta operação deixará o saldo da conta negativo.</AlertDescription>
                  </Alert>
                )}

                <Button className="w-full bg-destructive hover:bg-destructive/90" onClick={() => handleSubmit("out")} disabled={createTransaction.isPending}>Registrar Gasto</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* History Table */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Histórico Recente (UE/CX)</CardTitle></CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : !transactions || transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma movimentação</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Registrado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">{formatDateBR(t.transaction_date)}</TableCell>
                        <TableCell><span className="font-semibold">{t.origin_fund || (t.entity_type?.toUpperCase())}</span></TableCell>
                        <TableCell>{t.source_account_name || t.destination_account_name || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${t.direction === "in" ? "text-success" : "text-destructive"}`}>
                          {t.direction === "in" ? "+" : "-"}{formatCurrencyBRL(Number(t.amount))}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                        <TableCell className="text-muted-foreground">{t.creator_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
                {entitiesLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {entitiesData?.accounts
                      ?.filter(a => a.entity_id === ueEntity?.id)
                      .map(a => (
                        <li key={a.id}>• {cleanAccountDisplayName(a.name)}</li>
                      ))}
                    {!entitiesData?.accounts?.some(a => a.entity_id === ueEntity?.id) && (
                      <li>Nenhuma conta encontrada</li>
                    )}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="font-bold text-foreground mb-2">Caixa Escolar:</h4>
                {entitiesLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {entitiesData?.accounts
                      ?.filter(a => a.entity_id === cxEntity?.id)
                      .map(a => (
                        <li key={a.id}>• {cleanAccountDisplayName(a.name)}</li>
                      ))}
                    {!entitiesData?.accounts?.some(a => a.entity_id === cxEntity?.id) && (
                      <li>Nenhuma conta encontrada</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                * Dados atualizados automaticamente a partir do cadastro de contas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
