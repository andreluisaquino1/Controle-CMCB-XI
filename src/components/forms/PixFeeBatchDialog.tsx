import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/forms/CurrencyInput";
import { DateInput } from "@/components/forms/DateInput";
import { useCreatePixFeeBatch, PixFeeItem } from "@/hooks/use-pix-batch";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PixFeeBatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface BatchItemState extends PixFeeItem {
    id: string; // Temp ID for UI key
}

export function PixFeeBatchDialog({ open, onOpenChange }: PixFeeBatchDialogProps) {
    const { user } = useAuth();
    const createBatch = useCreatePixFeeBatch();

    // Form State
    const [reference, setReference] = useState("");
    const [batchDate, setBatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [items, setItems] = useState<BatchItemState[]>([
        { id: crypto.randomUUID(), amount: 0, description: "Taxa PIX", occurred_at: "" }
    ]);

    const handleAddItem = () => {
        setItems([
            ...items,
            { id: crypto.randomUUID(), amount: 0, description: "Taxa PIX", occurred_at: "" }
        ]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length === 1) {
            toast.error("O lote deve ter pelo menos um item.");
            return;
        }
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof BatchItemState, value: string | number) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const calculateTotal = () => items.reduce((acc, item) => acc + item.amount, 0);

    const handleSubmit = async () => {
        if (!user?.user_metadata?.entity_id) {
            toast.error("Entidade não selecionada.");
            return;
        }

        const validItems = items.filter(i => i.amount > 0);
        if (validItems.length === 0) {
            toast.error("Adicione pelo menos um item com valor maior que zero.");
            return;
        }

        if (!reference) {
            toast.error("Informe uma referência para o lote.");
            return;
        }

        createBatch.mutate({
            entityId: user.user_metadata.entity_id,
            payload: {
                reference,
                occurred_at: batchDate,
                items: validItems.map(({ amount, description, occurred_at }) => ({
                    amount,
                    description,
                    occurred_at: occurred_at || undefined
                }))
            }
        }, {
            onSuccess: () => {
                onOpenChange(false);
                setItems([{ id: crypto.randomUUID(), amount: 0, description: "Taxa PIX", occurred_at: "" }]);
                setReference("");
            }
        });
    };

    const total = calculateTotal();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Lançamento de Taxas PIX</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Header Fields */}
                    <div className="space-y-2">
                        <Label>Referência do Lote *</Label>
                        <Input
                            placeholder="Ex: Semana 1 - Março"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                        />
                    </div>

                    {/* Items List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-medium">Itens ({items.length})</Label>
                            <Button variant="outline" size="sm" onClick={handleAddItem}>
                                <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-slate-50">
                                    <div className="col-span-1 flex items-center justify-center h-10 font-bold text-slate-400">
                                        #{index + 1}
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-xs">Valor</Label>
                                        <CurrencyInput
                                            value={item.amount}
                                            onChange={(v) => updateItem(item.id, 'amount', v)}
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                        <Label className="text-xs">Descrição</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            placeholder="Taxa PIX"
                                        />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <Label className="text-xs">Data (Opcional)</Label>
                                        <DateInput
                                            value={item.occurred_at || ""}
                                            onChange={(v) => updateItem(item.id, 'occurred_at', v)}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleRemoveItem(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Summary */}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-lg font-bold">
                            Total: <span className="text-red-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={createBatch.isPending || total <= 0}
                            className="w-1/3"
                        >
                            {createBatch.isPending ? "Processando..." : "Lançar Lote"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
