import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useTransactionItems } from "@/hooks/use-pix-batch";
import { formatCurrencyBRL } from "@/lib/currency";
import { formatDateBR } from "@/lib/date-utils";
import { Loader2 } from "lucide-react";

interface TransactionItemsDialogProps {
    transactionId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionItemsDialog({ transactionId, open, onOpenChange }: TransactionItemsDialogProps) {
    const { data: items, isLoading } = useTransactionItems(transactionId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Itens do Lote</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : !items || items.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        Nenhum item encontrado.
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {item.occurred_at ? formatDateBR(item.occurred_at) : "-"}
                                        </TableCell>
                                        <TableCell>{item.description || "-"}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrencyBRL(Number(item.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
