import { useCallback } from 'react';
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyBRL } from '@/lib/currency';
import { formatDateBR } from '@/lib/date-utils';
import { DashboardData, ReportData, TransactionWithCreator } from '@/types';

export function useReports(
    startDate: string,
    endDate: string,
    dashboardData: DashboardData | undefined,
    reportData: ReportData | undefined,
    transactions: TransactionWithCreator[] | undefined
) {
    const getWhatsAppReportText = useCallback(() => {
        if (!dashboardData || !reportData) {
            return "Carregando dados...";
        }

        return `
📊 *RELATÓRIO FINANCEIRO CMCB-XI* 📊
📅 Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}

💰 *SALDOS ATUAIS*
💵 Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}
🏦 Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}
📱 PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}
_________________________

📈 *RESUMO DO PERÍODO*
📥 Entradas (Espécie): ${formatCurrencyBRL(reportData.weeklyEntriesCash)}
📥 Entradas (PIX): ${formatCurrencyBRL(reportData.weeklyEntriesPix)}
📤 Saídas (Espécie): ${formatCurrencyBRL(reportData.weeklyExpensesCash)}
📤 Saídas (PIX): ${formatCurrencyBRL(reportData.weeklyExpensesPix)}
_________________________

🏪 *SALDOS NOS ESTABELECIMENTOS*
${dashboardData.merchantBalances.map(m => `• ${m.name}: ${formatCurrencyBRL(m.balance)}`).join('\n')}
_________________________

🏫 *RECURSOS POR ENTIDADE*
*UE:* ${dashboardData.resourceBalances.UE.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`).join(', ')}
*CX:* ${dashboardData.resourceBalances.CX.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`).join(', ')}

✅ Gerado automaticamente pelo Sistema de Gestão CMCB-XI
        `.trim();
    }, [dashboardData, reportData, startDate, endDate]);

    const copyReport = useCallback(() => {
        const text = getWhatsAppReportText();
        if (text === "Carregando dados...") {
            toast.error("Aguarde o carregamento dos dados.");
            return;
        }
        navigator.clipboard.writeText(text);
        toast.success("Relatório copiado para a área de transferência!");
    }, [getWhatsAppReportText]);

    const openWhatsApp = useCallback(() => {
        const text = getWhatsAppReportText();
        if (text === "Carregando dados...") {
            toast.error("Aguarde o carregamento dos dados.");
            return;
        }
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }, [getWhatsAppReportText]);

    const exportExcel = useCallback(() => {
        if (!transactions || transactions.length === 0) {
            toast.error("Nenhuma transação para exportar.");
            return;
        }

        const data = transactions.map(t => ({
            Data: formatDateBR(t.transaction_date),
            Descrição: t.description,
            Valor: t.amount,
            Tipo: t.direction === 'in' ? 'Entrada' : t.direction === 'out' ? 'Saída' : 'Transferência',
            Método: t.payment_method || '-',
            Entidade: t.entity_name || '-',
            Conta: t.source_account_name || t.destination_account_name || '-',
            Criado_Por: t.creator_name || 'Sistema'
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");

        XLSX.writeFile(workbook, `transacoes_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Arquivo Excel gerado com sucesso!");
    }, [transactions]);

    const exportPDF = useCallback(() => {
        if (!transactions || transactions.length === 0) {
            toast.error("Nenhuma transação para exportar.");
            return;
        }

        const doc = new jsPDF();
        doc.text("Relatório de Transações CMCB-XI", 14, 15);

        const tableData = transactions.map(t => [
            formatDateBR(t.transaction_date),
            t.description || '',
            formatCurrencyBRL(t.amount),
            t.direction === 'in' ? 'Entrada' : t.direction === 'out' ? 'Saída' : 'Transferência',
            t.entity_name || '-'
        ]);

        autoTable(doc, {
            head: [['Data', 'Descrição', 'Valor', 'Tipo', 'Entidade']],
            body: tableData,
            startY: 20
        });

        doc.save(`transacoes_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success("Arquivo PDF gerado com sucesso!");
    }, [transactions]);

    return {
        getWhatsAppReportText,
        copyReport,
        openWhatsApp,
        exportExcel,
        exportPDF
    };
}

