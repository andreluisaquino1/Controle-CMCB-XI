import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { Loader2, XCircle, FileText, CheckCircle2 } from "lucide-react";
import { formatDateBR } from "@/shared/lib/date-utils";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { MODULE_LABELS } from "@/shared/lib/constants";
import { TransactionWithCreator } from "@/types";
import { useState } from "react";
import { TransactionItemsDialog } from "./TransactionItemsDialog";

interface TransactionTableProps {
    transactions: TransactionWithCreator[] | undefined;
    isLoading: boolean;
    onVoid?: (id: string) => void;
    onValidate?: (id: string) => void;
    isValidating?: boolean;
    showMerchant?: boolean;
    showOrigin?: boolean;
    showAccount?: boolean;
    showShift?: boolean;
    showMethod?: boolean;
}

export function TransactionTable({
    transactions,
    isLoading,
    onVoid,
    onValidate,
    isValidating = false,
    showMerchant = false,
    showOrigin = false,
    showAccount = false,
    showShift = false,
    showMethod = false,
}: TransactionTableProps) {
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

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
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto border rounded-md shadow-inner relative bg-card custom-scrollbar">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        {showOrigin && <TableHead>Origem</TableHead>}
                        {showMethod && <TableHead>Meio</TableHead>}
                        {showShift && <TableHead>Turno</TableHead>}
                        {(showAccount || (!showOrigin && !showMerchant)) && <TableHead>Conta</TableHead>}
                        {showMerchant && <TableHead>Estabelecimento</TableHead>}
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Registrado por</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead>Status</TableHead>
                        {(onVoid || transactions.some(t => t.module === 'taxa_pix_bb')) && <TableHead className="w-[100px] text-right">Ações</TableHead>}
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
                                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                        : t.direction === "transfer"
                                            ? "bg-blue-100 text-blue-700 border border-blue-200"
                                            : "bg-rose-100 text-rose-700 border border-rose-200"
                                    }`}>
                                    {MODULE_LABELS[t.module] || t.module}
                                </span>
                            </TableCell>
                            {showOrigin && (
                                <TableCell>
                                    <span className="font-semibold text-xs">
                                        {t.origin_fund || t.entity_type?.toUpperCase()}
                                    </span>
                                </TableCell>
                            )}
                            {showMethod && <TableCell className="text-xs">{t.payment_method || "-"}</TableCell>}
                            {showShift && <TableCell className="text-xs">{t.shift || "-"}</TableCell>}
                            {(showAccount || (!showOrigin && !showMerchant)) && (
                                <TableCell className="text-sm">
                                    {t.source_account_name || t.destination_account_name || "-"}
                                </TableCell>
                            )}
                            {showMerchant && <TableCell className="text-sm">{t.merchant_name || "-"}</TableCell>}
                            <TableCell className={`text-right font-bold whitespace-nowrap ${t.direction === "in" || t.module === "aporte_saldo" ? "text-emerald-600" :
                                    t.direction === "transfer" ? "text-blue-600" : "text-rose-600"
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
                            <TableCell className="max-w-xs truncate text-muted-foreground text-[10px] italic" title={t.notes || ""}>
                                {t.notes || "-"}
                            </TableCell>
                            <TableCell>
                                {t.ledger_status === 'pending' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                        Pendente
                                    </span>
                                ) : t.ledger_status === 'validated' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Validado
                                    </span>
                                ) : t.status === 'voided' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                        Anulado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                        Efetivado
                                    </span>
                                )}
                            </TableCell>
                            {(onVoid || t.module === 'taxa_pix_bb') && (
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {t.module === 'taxa_pix_bb' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                onClick={() => setSelectedBatchId(t.id)}
                                                title="Ver Itens do Lote"
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {onValidate && t.ledger_status === 'pending' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                                                onClick={() => onValidate(t.id)}
                                                disabled={isValidating}
                                                title="Validar Lançamento"
                                            >
                                                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                            </Button>
                                        )}
                                        {onVoid && (t.status === 'posted' || t.ledger_status === 'validated') && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => onVoid(t.id)}
                                                title="Anular Transação"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <TransactionItemsDialog
                transactionId={selectedBatchId}
                open={!!selectedBatchId}
                onOpenChange={(open) => !open && setSelectedBatchId(null)}
            />
        </div>
    );
}
