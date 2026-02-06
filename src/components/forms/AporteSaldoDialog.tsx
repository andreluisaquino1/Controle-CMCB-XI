import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { cleanAccountDisplayName } from "@/lib/account-display";
import { sortByAccountOrder } from "@/lib/constants";
import { Account, Merchant, Entity } from "@/types";

interface AporteSaldoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        origem: string;
        conta: string;
        merchant: string;
        valor: number;
        descricao: string;
        obs: string;
        capitalCusteio: string;
    };
    setters: {
        setDate: (v: string) => void;
        setOrigem: (v: string) => void;
        setAccount: (v: string) => void;
        setMerchant: (v: string) => void;
        setValor: (v: number) => void;
        setDescricao: (v: string) => void;
        setObs: (v: string) => void;
        setCapitalCusteio: (v: string) => void;
    };
    entities: Entity[];
    accounts: Account[];
    merchants: Merchant[];
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

export function AporteSaldoDialog({
    open,
    onOpenChange,
    state,
    setters,
    entities,
    accounts,
    merchants,
    onSubmit,
    isLoading,
}: AporteSaldoDialogProps) {
    const filteredAccounts = accounts.filter(acc => {
        if (!state.origem) return false;
        const entity = entities.find(e => e.id === acc.entity_id);
        if (state.origem === "ASSOC") return entity?.type === "associacao";
        if (state.origem === "UE") return entity?.type === "ue";
        if (state.origem === "CX") return entity?.type === "cx";
        return false;
    });

    const sortedMerchants = [...(merchants || [])].sort((a, b) => a.name.localeCompare(b.name));
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Aportar Saldo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label>Origem do Recurso *</Label>
                        <Select value={state.origem} onValueChange={setters.setOrigem}>
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
                        <Select value={state.conta} onValueChange={setters.setAccount} disabled={!state.origem}>
                            <SelectTrigger>
                                <SelectValue placeholder={state.origem ? "Selecione a conta" : "Selecione origem primeiro"} />
                            </SelectTrigger>
                            <SelectContent>
                                {sortByAccountOrder(filteredAccounts).map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {cleanAccountDisplayName(acc.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Estabelecimento *</Label>
                        <Select value={state.merchant} onValueChange={setters.setMerchant}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {sortedMerchants?.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <CurrencyInput value={state.valor} onChange={setters.setValor} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição *</Label>
                        <Input value={state.descricao} onChange={(e) => setters.setDescricao(e.target.value)} placeholder="Descreva o aporte" />
                    </div>
                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input value={state.obs} onChange={(e) => setters.setObs(e.target.value)} placeholder="Opcional" />
                    </div>
                    <div className="space-y-2">
                        <Label>Capital/Custeio (opcional)</Label>
                        <Select value={state.capitalCusteio} onValueChange={setters.setCapitalCusteio}>
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
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading || !state.origem || !state.conta || !state.merchant || !state.descricao || state.descricao.length < 5}
                    >
                        {isLoading ? "Registrando..." : "Registrar Aporte"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
