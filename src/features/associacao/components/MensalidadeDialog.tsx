import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { CurrencyInput } from "@/shared/components/forms/CurrencyInput";
import { DateInput } from "@/shared/components/forms/DateInput";

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
            <DialogContent
                className="max-h-[90vh] overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Registrar Mensalidade</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {/* ... (existing fields) ... */}
                    <div className="space-y-2">
                        <Label htmlFor="mensalidade-date">Data *</Label>
                        <DateInput id="mensalidade-date" value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mensalidade-turno">Turno *</Label>
                        <Select value={state.turno} onValueChange={setters.setTurno}>
                            <SelectTrigger id="mensalidade-turno">
                                <SelectValue placeholder="Selecione o turno" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="matutino">Matutino</SelectItem>
                                <SelectItem value="vespertino">Vespertino</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mensalidade-cash">Espécie (R$)</Label>
                        <CurrencyInput id="mensalidade-cash" value={state.cash} onChange={setters.setCash} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mensalidade-pix">PIX (R$)</Label>
                        <CurrencyInput id="mensalidade-pix" value={state.pix} onChange={setters.setPix} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mensalidade-obs">Observação</Label>
                        <Input
                            id="mensalidade-obs"
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
