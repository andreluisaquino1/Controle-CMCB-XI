import { useCallback } from 'react';
import { toast } from "sonner";
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
    transactions: TransactionWithCreator[] | undefined,
    showResources: boolean
) {
    const getWhatsAppReportText = useCallback(() => {
        if (!dashboardData || !reportData) {
            return "Carregando dados...";
        }

        // 2.1 Associação
        const associacaoSection = `
*2.1 Associação*

💰 *Saldos Atuais*
💵 Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}
💠 PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}
🏦 Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}

📈 *Resumo do Período*
📥 Entradas (Espécie): ${formatCurrencyBRL(reportData.weeklyEntriesCash)}
📥 Entradas (PIX): ${formatCurrencyBRL(reportData.weeklyEntriesPix)}
📤 Saídas (Espécie): ${formatCurrencyBRL(reportData.weeklyExpensesCash)}
📤 Saídas (PIX): ${formatCurrencyBRL(reportData.weeklyExpensesPix)}
`.trim();

        // 2.2 Saldos dos Estabelecimentos
        const activeMerchants = dashboardData.merchantBalances.filter(m => m.balance !== 0);
        let estabelecimentosSection = "*2.2 Saldos dos Estabelecimentos*\n";

        if (activeMerchants.length > 0) {
            estabelecimentosSection += activeMerchants.map(m => `🏪 ${m.name}: ${formatCurrencyBRL(m.balance)}`).join('\n');
        } else {
            estabelecimentosSection += "✅ Todos os saldos zerados";
        }

        // 2.3 Recursos (Opcional)
        let recursosSection = "";
        if (showResources) {
            const listUe = dashboardData.resourceBalances.UE.map(a => `• ${a.name}: ${formatCurrencyBRL(a.balance)}`).join('\n');
            const listCx = dashboardData.resourceBalances.CX.map(a => `• ${a.name}: ${formatCurrencyBRL(a.balance)}`).join('\n');

            recursosSection = `
*2.3 Recursos (UE/CX)*

🏛️ *UE (Unidade Executora)*
${listUe}

🏫 *CX (Caixa Escolar)*
${listCx}
`.trim();
        }

        const parts = [
            `📊 *PRESTAÇÃO DE CONTAS CMCB-XI*`,
            `📅 *Período:* ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`,
            associacaoSection,
            estabelecimentosSection,
            recursosSection
        ].filter(Boolean);

        return parts.join('\n\n');
    }, [dashboardData, reportData, startDate, endDate, showResources]);

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

    const exportPDF = useCallback(() => {
        if (!dashboardData || !reportData || !transactions) {
            toast.error("Aguarde o carregamento dos dados.");
            return;
        }

        const doc = new jsPDF();
        let yPos = 20;

        // Cabeçalho
        doc.setFontSize(16);
        doc.text("Prestação de Contas CMCB-XI", 14, yPos);
        yPos += 10;
        doc.setFontSize(12);
        doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, 14, yPos);
        yPos += 15;

        // 2.1 Associação
        doc.setFontSize(14);
        doc.text("Associação", 14, yPos);
        yPos += 8;
        doc.setFontSize(12);
        doc.text("Saldos atuais:", 14, yPos);
        yPos += 6;
        doc.text(`Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}`, 20, yPos);
        yPos += 6;
        doc.text(`PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}`, 20, yPos);
        yPos += 6;
        doc.text(`Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}`, 20, yPos);
        yPos += 10;

        doc.text("Resumo do período:", 14, yPos);
        yPos += 6;
        doc.text(`Entradas espécie: ${formatCurrencyBRL(reportData.weeklyEntriesCash)}`, 20, yPos);
        yPos += 6;
        doc.text(`Entradas PIX: ${formatCurrencyBRL(reportData.weeklyEntriesPix)}`, 20, yPos);
        yPos += 6;
        doc.text(`Saídas espécie: ${formatCurrencyBRL(reportData.weeklyExpensesCash)}`, 20, yPos);
        yPos += 6;
        doc.text(`Saídas PIX: ${formatCurrencyBRL(reportData.weeklyExpensesPix)}`, 20, yPos);
        yPos += 15;

        // 2.2 Saldos dos Estabelecimentos
        doc.setFontSize(14);
        doc.text("Saldos dos Estabelecimentos", 14, yPos);
        yPos += 8;
        doc.setFontSize(12);

        const activeMerchants = dashboardData.merchantBalances.filter(m => m.balance !== 0);
        if (activeMerchants.length > 0) {
            activeMerchants.forEach(m => {
                doc.text(`${m.name}: ${formatCurrencyBRL(m.balance)}`, 20, yPos);
                yPos += 6;
            });
        } else {
            doc.text("Todos os saldos zerados", 20, yPos);
            yPos += 6;
        }
        yPos += 10;

        // 2.3 Recursos (Always included in PDF)
        doc.setFontSize(14);
        doc.text("Recursos (UE/CX)", 14, yPos);
        yPos += 8;
        doc.setFontSize(12);

        const ueText = `UE: ${dashboardData.resourceBalances.UE.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`).join(', ')}`;
        const cxText = `CX: ${dashboardData.resourceBalances.CX.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`).join(', ')}`;

        const splitUe = doc.splitTextToSize(ueText, 180);
        doc.text(splitUe, 20, yPos);
        yPos += (splitUe.length * 6);

        const splitCx = doc.splitTextToSize(cxText, 180);
        doc.text(splitCx, 20, yPos);
        yPos += (splitCx.length * 6) + 10;

        // Transações
        doc.setFontSize(14);
        doc.text("Transações do Período", 14, yPos);
        yPos += 6;

        const tableData = transactions.map(t => [
            formatDateBR(t.transaction_date),
            t.module,
            t.source_account_name || t.destination_account_name || '-',
            t.entity_name || '-',
            formatCurrencyBRL(t.amount),
            t.description || '',
            t.notes || '',
            t.creator_name || '-'
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Data', 'Módulo', 'Conta', 'Estab.', 'Valor', 'Descrição', 'Obs.', 'Reg. Por']],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] },
        });

        doc.save(`prestacao_contas_${endDate}.pdf`);
        toast.success("PDF gerado com sucesso!");
    }, [dashboardData, reportData, transactions, startDate, endDate]);

    return {
        getWhatsAppReportText,
        copyReport,
        openWhatsApp,
        exportPDF
    };
}

