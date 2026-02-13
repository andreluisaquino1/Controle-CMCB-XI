
import { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { GraduationPayMethod, GraduationEntryType, GraduationConfig } from "@/features/graduations/services";

export function EntryForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [method, setMethod] = useState<GraduationPayMethod>('PIX');
    const [type, setType] = useState<GraduationEntryType>('OUTROS');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            amount: Number(amount),
            description: desc,
            payment_method: method,
            entry_type: type
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Rifa de Páscoa" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label>Método</Label>
                    <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Tipo de Entrada</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="OUTROS">Outros</SelectItem>
                        <SelectItem value="RIFA">Rifa</SelectItem>
                        <SelectItem value="BINGO">Bingo</SelectItem>
                        <SelectItem value="VENDA">Venda</SelectItem>
                        <SelectItem value="DOACAO">Doação</SelectItem>
                        <SelectItem value="MENSALIDADE">Mensalidade (Avulsa)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Registrar Entrada"}</Button>
        </form>
    );
}

export function ExpenseForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [method, setMethod] = useState<GraduationPayMethod>('PIX');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            amount: Number(amount),
            description: desc,
            payment_method: method,
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Descrição da Despesa</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Valor (R$)</Label>
                    <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label>Método Pagamento</Label>
                    <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Button type="submit" variant="destructive" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Registrar Despesa"}</Button>
        </form>
    );
}

export function TransferForm({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("Transferência");
    const [from, setFrom] = useState<GraduationPayMethod>('ESPECIE');
    const [to, setTo] = useState<GraduationPayMethod>('PIX');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            amount: Number(amount),
            description: desc,
            from_account: from,
            to_account: to
        });
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Registrar transferência entre contas.</p>
            <div className="grid gap-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>De (Origem)</Label>
                    <Select value={from} onValueChange={(v: any) => setFrom(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX / Banco</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro em Mãos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Para (Destino)</Label>
                    <Select value={to} onValueChange={(v: any) => setTo(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PIX">PIX / Banco</SelectItem>
                            <SelectItem value="ESPECIE">Dinheiro em Mãos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>Registrar Transferência</Button>
        </form>
    );
}

export function ConfigForm({ current, onSubmit, isLoading }: {
    current: GraduationConfig | null | undefined;
    onSubmit: (data: any) => void;
    isLoading: boolean;
}) {
    const [val, setVal] = useState<string>(current?.installment_value?.toString() || "");
    const [count, setCount] = useState<string>(current?.installments_count?.toString() || "");
    const [day, setDay] = useState<string>(current?.due_day?.toString() || "10");
    const [month, setMonth] = useState<string>(current?.start_month?.toString() || "2");

    useEffect(() => {
        if (current) {
            setVal(current.installment_value.toString());
            setCount(current.installments_count.toString());
            setDay(current.due_day.toString());
            setMonth(current.start_month.toString());
        }
    }, [current]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            installment_value: Number(val),
            installments_count: Number(count),
            due_day: Number(day),
            start_month: Number(month)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Valor da Mensalidade (R$)</Label>
                <Input type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)} required />
            </div>
            <div className="grid gap-2">
                <Label>Quantidade de Parcelas</Label>
                <Input type="number" value={count} onChange={e => setCount(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Dia Venc.</Label>
                    <Input type="number" value={day} onChange={e => setDay(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                    <Label>Mês Início</Label>
                    <Input type="number" value={month} onChange={e => setMonth(e.target.value)} required />
                </div>
            </div>
            <div className="pt-4 border-t border-dashed mt-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/50 mb-3 text-[11px] text-amber-800 dark:text-amber-300">
                    <p className="font-bold flex items-center gap-1 mb-1">
                        ⚠️ ATENÇÃO: Ressalva de Geração
                    </p>
                    <p>Ao salvar, <strong>TODAS as prestações atuais (incluindo pagas)</strong> serão <strong>APAGADAS</strong> e regeneradas com estes novos valores.</p>
                </div>
                <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                    Salvar e Regenerar Prestações
                </Button>
            </div>
        </form>
    );
}

export function ClassForm({ onSubmit, isLoading }: { onSubmit: (name: string) => void; isLoading: boolean }) {
    const [name, setName] = useState("");
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(name);
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
                <Label>Nome da Turma</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: 3º Ano A" required />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin" /> : "Criar Turma"}</Button>
        </form>
    );
}
