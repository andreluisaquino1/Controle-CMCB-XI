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

interface MensalidadeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        turno: string;
        cash: number;
        pix: number;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setTurno: (v: string) => void;
        setCash: (v: number) => void;
        setPix: (v: number) => void;
        setObs: (v: string) => void;
    };
    onSubmit: () => Promise<boolean>;
    isLoading: boolean;
}

export function MensalidadeDialog({
    open,
    onOpenChange,
    state,
    setters,
    onSubmit,
    isLoading,
}: MensalidadeDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Mensalidade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {/* ... (existing fields) ... */}
                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label>Turno *</Label>
                        <Select value={state.turno} onValueChange={setters.setTurno}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o turno" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="matutino">Matutino</SelectItem>
                                <SelectItem value="vespertino">Vespertino</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Espécie (R$)</Label>
                        <CurrencyInput value={state.cash} onChange={setters.setCash} />
                    </div>
                    <div className="space-y-2">
                        <Label>PIX (R$)</Label>
                        <CurrencyInput value={state.pix} onChange={setters.setPix} />
                    </div>
                    <div className="space-y-2">
                        <Label>Observação</Label>
                        <Input
                            value={state.obs}
                            onChange={(e) => setters.setObs(e.target.value)}
                            placeholder="Opcional"
                        />
                    </div>
                    <Button
                        className="w-full"
                        onClick={async () => {
                            const success = await onSubmit();
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Registrando..." : "Registrar Mensalidade"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
