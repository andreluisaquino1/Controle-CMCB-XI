
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { TransactionWithCreator } from "@/types";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/export-utils";
import { formatDateBR } from "@/lib/date-utils";
import { formatCurrencyBRL } from "@/lib/currency";
import { MODULE_LABELS } from "@/lib/constants";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TransactionExportActionsProps {
    transactions: TransactionWithCreator[] | undefined;
    filename?: string;
}

export function TransactionExportActions({
    transactions,
    filename = "transacoes",
}: TransactionExportActionsProps) {
    if (!transactions || transactions.length === 0) return null;

    const prepareData = () => {
        return transactions.map((t) => ({
            Data: formatDateBR(t.transaction_date),
            Tipo: MODULE_LABELS[t.module] || t.module,
            Valor: formatCurrencyBRL(Number(t.amount)),
            Descrição: t.description || "",
            Conta_Origem: t.source_account_name || "",
            Conta_Destino: t.destination_account_name || "",
            Responsável: t.creator_name || "",
            Observações: t.notes || "",
        }));
    };

    const handleExportCSV = () => {
        const data = prepareData();
        exportToCSV(data, filename);
    };

    const handleExportExcel = () => {
        const data = prepareData();
        exportToExcel(data, filename);
    };

    const handleExportPDF = () => {
        const data = prepareData();
        const headers = Object.keys(data[0]);
        const rows = data.map((row) => Object.values(row));

        exportToPDF(
            `Relatório de Transações - ${filename}`,
            [{ headers, rows }],
            filename
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4" />
                    CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
