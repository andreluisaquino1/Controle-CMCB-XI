import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";
import { formatDateBR } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { MODULE_LABELS } from "@/lib/constants";
import { TransactionWithCreator } from "@/types";

interface TransactionTableProps {
    transactions: TransactionWithCreator[] | undefined;
    isLoading: boolean;
    onVoid?: (id: string) => void;
    showMerchant?: boolean;
    showOrigin?: boolean;
    showAccount?: boolean;
}

export function TransactionTable({
    transactions,
    isLoading,
    onVoid,
    showMerchant = false,
    showOrigin = false,
    showAccount = false,
}: TransactionTableProps) {
    if (isLoading) {
        return (
            <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
        );
    }

    if (!transactions || transactions.length === 0) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                Nenhuma transação encontrada
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        {showOrigin && <TableHead>Origem</TableHead>}
                        {(showAccount || (!showOrigin && !showMerchant)) && <TableHead>Conta</TableHead>}
                        {showMerchant && <TableHead>Estabelecimento</TableHead>}
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Registrado por</TableHead>
                        <TableHead>Observação</TableHead>
                        {onVoid && <TableHead className="w-[80px]">Ações</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((t) => (
                        <TableRow key={t.id} className={t.status === 'voided' ? 'opacity-50 grayscale' : ''}>
                            <TableCell className="whitespace-nowrap">
                                {formatDateBR(t.transaction_date)}
                            </TableCell>
                            <TableCell>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${t.direction === "in" || t.module === "aporte_saldo"
                                    ? "bg-success/10 text-success"
                                    : "bg-destructive/10 text-destructive"
                                    }`}>
                                    {MODULE_LABELS[t.module] || t.module}
                                </span>
                            </TableCell>
                            {showOrigin && (
                                <TableCell>
                                    <span className="font-semibold">
                                        {t.origin_fund || t.entity_type?.toUpperCase()}
                                    </span>
                                </TableCell>
                            )}
                            {(showAccount || (!showOrigin && !showMerchant)) && (
                                <TableCell className="text-sm">
                                    {t.source_account_name || t.destination_account_name || "-"}
                                </TableCell>
                            )}
                            {showMerchant && <TableCell className="text-sm">{t.merchant_name || "-"}</TableCell>}
                            <TableCell className={`text-right font-bold whitespace-nowrap ${t.direction === "in" || t.module === "aporte_saldo" ? "text-success" : "text-destructive"
                                }`}>
                                {t.direction === "in" || t.module === "aporte_saldo" ? "+" : "-"}
                                {formatCurrencyBRL(Number(t.amount))}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm">
                                {t.description || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {t.creator_name || "-"}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-muted-foreground text-xs italic">
                                {t.notes || "-"}
                            </TableCell>
                            {onVoid && (
                                <TableCell>
                                    {t.status === 'posted' && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => onVoid(t.id)}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
