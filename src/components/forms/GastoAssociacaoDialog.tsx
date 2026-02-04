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
import { PlusCircle, X } from "lucide-react";
import { useState } from "react";

interface GastoAssociacaoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    state: {
        date: string;
        meio: string;
        valor: number;
        descricao: string;
        obs: string;
    };
    setters: {
        setDate: (v: string) => void;
        setMeio: (v: string) => void;
        setValor: (v: number) => void;
        setDescricao: (v: string) => void;
        setObs: (v: string) => void;
    };
    shortcuts: string[];
    addShortcut: (s: string) => void;
    removeShortcut: (s: string) => void;
    onSubmit: (strictBalance?: boolean) => Promise<boolean>;
    isLoading: boolean;
    strictBalance?: boolean;
}

export function GastoAssociacaoDialog({
    open,
    onOpenChange,
    state,
    setters,
    shortcuts,
    addShortcut,
    removeShortcut,
    onSubmit,
    isLoading,
    strictBalance = false,
}: GastoAssociacaoDialogProps) {
    const [newShortcut, setNewShortcut] = useState("");
    const [showShortcutInput, setShowShortcutInput] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Gasto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Data *</Label>
                        <DateInput value={state.date} onChange={setters.setDate} />
                    </div>
                    <div className="space-y-2">
                        <Label>Meio de Pagamento *</Label>
                        <Select value={state.meio} onValueChange={setters.setMeio}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Espécie</SelectItem>
                                <SelectItem value="pix">PIX</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <CurrencyInput value={state.valor} onChange={setters.setValor} />
                    </div>
                    <div className="space-y-2">
                        <Label>Descrição *</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {shortcuts.map((s) => (
                                <div key={s} className="group relative">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] px-2 bg-muted/30 border-muted-foreground/20 hover:bg-muted pr-6"
                                        onClick={() => setters.setDescricao(s)}
                                    >
                                        {s}
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); removeShortcut(s); }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {!showShortcutInput && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowShortcutInput(true)}
                                >
                                    <PlusCircle className="h-3 w-3 mr-1" />
                                    Adicionar
                                </Button>
                            )}
                        </div>
                        {showShortcutInput && (
                            <div className="flex gap-2 items-center mb-4">
                                <Input
                                    value={newShortcut}
                                    onChange={(e) => setNewShortcut(e.target.value)}
                                    placeholder="Novo atalho (ex: Gelo)"
                                    className="h-8 text-xs"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newShortcut.trim()) {
                                                addShortcut(newShortcut.trim());
                                                setNewShortcut("");
                                                setShowShortcutInput(false);
                                            }
                                        }
                                        if (e.key === 'Escape') {
                                            setNewShortcut("");
                                            setShowShortcutInput(false);
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                        if (newShortcut.trim()) {
                                            addShortcut(newShortcut.trim());
                                            setNewShortcut("");
                                            setShowShortcutInput(false);
                                        }
                                    }}
                                >
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Input
                            value={state.descricao}
                            onChange={(e) => setters.setDescricao(e.target.value)}
                            placeholder="Descreva o gasto"
                        />
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
                            const success = await onSubmit(strictBalance);
                            if (success) onOpenChange(false);
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Registrando..." : "Registrar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
