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

        const formatTreeList = (items: string[]) => {
            if (items.length === 0) return "";
            const lastIndex = items.length - 1;
            return items.map((item, index) => {
                const prefix = index === lastIndex ? "└ " : "├ ";
                return `${prefix}${item}`;
            }).join("\n");
        };

        // 2.1 Associação
        const saldosAtuaisLines = [
            `Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}`,
            `PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}`,
            `Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}`
        ];

        const resumoLines = [
            `Entradas (Espécie): ${formatCurrencyBRL(reportData.weeklyEntriesCash)}`,
            `Entradas (PIX): ${formatCurrencyBRL(reportData.weeklyEntriesPix)}`,
            `Saídas (Espécie): ${formatCurrencyBRL(reportData.weeklyExpensesCash)}`,
            `Saídas (PIX): ${formatCurrencyBRL(reportData.weeklyExpensesPix)}`
        ];

        const associacaoSection = `
- Associação
Saldos Atuais
${formatTreeList(saldosAtuaisLines)}

 Resumo do Período
${formatTreeList(resumoLines)}
`.trim();

        // 2.2 Saldos dos Estabelecimentos
        const activeMerchants = dashboardData.merchantBalances.filter(m => m.balance !== 0);
        let estabelecimentosSection = "- Saldos dos Estabelecimentos\n";

        if (activeMerchants.length > 0) {
            const merchantLines = activeMerchants.map(m => `${m.name}: ${formatCurrencyBRL(m.balance)}`);
            estabelecimentosSection += formatTreeList(merchantLines);
        } else {
            estabelecimentosSection += "└ Todos os saldos zerados";
        }

        // 2.3 Recursos (Opcional)
        let recursosSection = "";
        if (showResources) {
            const listUe = dashboardData.resourceBalances.UE.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`);
            const listCx = dashboardData.resourceBalances.CX.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`);

            const ueBlock = listUe.length > 0 ? `UE\n${formatTreeList(listUe)}` : "UE\n└ Sem contas";
            const cxBlock = listCx.length > 0 ? `CX\n${formatTreeList(listCx)}` : "CX\n└ Sem contas";

            recursosSection = `
- Recursos (UE/CX)
${ueBlock}

${cxBlock}
`.trim();
        }

        const parts = [
            `📊 PRESTAÇÃO DE CONTAS CMCB-XI`,
            `📅 Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`,
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

    const exportPDF = useCallback(async () => {
        if (!dashboardData || !reportData || !transactions) {
            toast.error("Aguarde o carregamento dos dados.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPos = 20;

        // Add logo
        try {
            const logoPath = '/logo-cmcb.jpg';
            const img = new Image();
            img.src = logoPath;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Continue even if logo fails
            });
            if (img.complete && img.naturalWidth > 0) {
                doc.addImage(img, 'JPEG', 14, yPos, 25, 25);
            }
        } catch (error) {
            console.warn('Logo não carregado:', error);
        }

        // Header with colored background
        doc.setFillColor(41, 128, 185); // Blue header
        doc.rect(0, 15, pageWidth, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text("PRESTAÇÃO DE CONTAS", pageWidth / 2, 28, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text("CMCB-XI", pageWidth / 2, 36, { align: 'center' });

        doc.setFontSize(11);
        doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, pageWidth / 2, 43, { align: 'center' });

        yPos = 60;
        doc.setTextColor(0, 0, 0);

        // Associação Section
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text("1. ASSOCIAÇÃO", 16, yPos);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Saldos Atuais:", 16, yPos);
        yPos += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`• Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}`, 22, yPos);
        yPos += 5;
        doc.text(`• PIX: ${formatCurrencyBRL(dashboardData.pixBalance)}`, 22, yPos);
        yPos += 5;
        doc.text(`• Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}`, 22, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Resumo do Período:", 16, yPos);
        yPos += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`• Entradas (Espécie): ${formatCurrencyBRL(reportData.weeklyEntriesCash)}`, 22, yPos);
        yPos += 5;
        doc.text(`• Entradas (PIX): ${formatCurrencyBRL(reportData.weeklyEntriesPix)}`, 22, yPos);
        yPos += 5;
        doc.text(`• Saídas (Espécie): ${formatCurrencyBRL(reportData.weeklyExpensesCash)}`, 22, yPos);
        yPos += 5;
        doc.text(`• Saídas (PIX): ${formatCurrencyBRL(reportData.weeklyExpensesPix)}`, 22, yPos);
        yPos += 15;

        // Estabelecimentos Section
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text("2. SALDOS DOS ESTABELECIMENTOS", 16, yPos);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const activeMerchants = dashboardData.merchantBalances.filter(m => m.balance !== 0);
        if (activeMerchants.length > 0) {
            activeMerchants.forEach(m => {
                doc.text(`• ${m.name}: ${formatCurrencyBRL(m.balance)}`, 22, yPos);
                yPos += 5;
            });
        } else {
            doc.text("• Todos os saldos zerados", 22, yPos);
            yPos += 5;
        }
        yPos += 10;

        // Recursos Section
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text("3. RECURSOS (UE/CX)", 16, yPos);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const ueItems = dashboardData.resourceBalances.UE.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`);
        const cxItems = dashboardData.resourceBalances.CX.map(a => `${a.name}: ${formatCurrencyBRL(a.balance)}`);

        doc.setFont(undefined, 'bold');
        doc.text("UE (Unidade Executora):", 22, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
        ueItems.forEach(item => {
            doc.text(`• ${item}`, 28, yPos);
            yPos += 5;
        });
        yPos += 3;

        doc.setFont(undefined, 'bold');
        doc.text("CX (Caixa Escolar):", 22, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');
        cxItems.forEach(item => {
            doc.text(`• ${item}`, 28, yPos);
            yPos += 5;
        });
        yPos += 10;

        // Transactions Section
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text("4. TRANSAÇÕES DO PERÍODO", 16, yPos);
        yPos += 8;

        const tableData = transactions.map(t => [
            formatDateBR(t.transaction_date),
            t.module,
            t.payment_method || '-',
            t.shift || '-',
            t.source_account_name || t.destination_account_name || '-',
            t.entity_name || '-',
            formatCurrencyBRL(t.amount),
            t.description || '',
            t.notes || '',
            t.creator_name || '-'
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Data', 'Módulo', 'Meio', 'Turno', 'Conta', 'Estab.', 'Valor', 'Descrição', 'Obs.', 'Reg. Por']],
            body: tableData,
            styles: {
                fontSize: 7,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            columnStyles: {
                0: { cellWidth: 18 }, // Data
                1: { cellWidth: 18 }, // Módulo
                2: { cellWidth: 15 }, // Meio
                3: { cellWidth: 15 }, // Turno
                4: { cellWidth: 25 }, // Conta
                5: { cellWidth: 25 }, // Estab.
                6: { cellWidth: 20, halign: 'right' }, // Valor
                7: { cellWidth: 30 }, // Descrição
                8: { cellWidth: 20 }, // Obs
                9: { cellWidth: 20 }  // Reg. Por
            },
            margin: { left: 14, right: 14 },
        });

        // Footer with page number
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Página ${i} de ${pageCount} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

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
