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
import { Entity } from "@/types";
import { useState, useEffect } from "react";

interface AccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initialData?: {
        name: string;
        account_number: string;
        entity_id: string;
    };
    entities: Entity[];
    onSubmit: (data: { name: string; account_number: string; entity_id: string }) => Promise<boolean>;
    isLoading: boolean;
}

export function AccountDialog({
    open,
    onOpenChange,
    title,
    initialData,
    entities,
    onSubmit,
    isLoading,
}: AccountDialogProps) {
    const [name, setName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [entityId, setEntityId] = useState("");

    useEffect(() => {
        if (open && initialData) {
            setName(initialData.name);
            setAccountNumber(initialData.account_number || "");
            setEntityId(initialData.entity_id);
        } else if (open) {
            setName("");
            setAccountNumber("");
            setEntityId("");
        }
    }, [open, initialData]);

    const handleSubmit = async () => {
        if (!name.trim() || !entityId) return;
        const success = await onSubmit({ name, account_number: accountNumber, entity_id: entityId });
        if (success) {
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Nome da Conta *</Label>
                        <Input
                            placeholder="Ex: Conta BB PDDE"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Número da Conta</Label>
                        <Input
                            placeholder="Opcional"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Entidade *</Label>
                        <Select value={entityId} onValueChange={setEntityId} disabled={!!initialData}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {entities.filter(e => e.type !== "associacao").map(e => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.type === "ue" ? "Unidade Executora" : "Caixa Escolar"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={isLoading || !name.trim() || !entityId}
                    >
                        {isLoading ? "Salvando..." : "Confirmar"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
