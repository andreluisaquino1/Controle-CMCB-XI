import { useCallback, useMemo } from 'react';
import { toast } from "sonner";
import { formatCurrencyBRL } from '@/lib/currency';
import { formatDateBR } from '@/lib/date-utils';
import { DashboardData, ReportData, TransactionWithCreator } from '@/types';

// Mapeamento humanizado de módulos para relatórios
const REPORT_TYPE_LABELS: Record<string, string> = {
    mensalidade: "Mensalidade",
    gasto_associacao: "Gasto Associação",
    aporte_saldo: "Aporte de Saldo",
    consumo_saldo: "Gasto em Estabelecimento",
    pix_direto_uecx: "Gasto de Recurso",
    entrada_recurso: "Entrada de Recurso",
    movimentacao_saldo: "Movimentação",
    ajuste_saldo: "Ajuste",
    especie_transfer: "Movimentação",
    especie_deposito_pix: "Depósito PIX",
    especie_ajuste: "Ajuste de Saldo",
    pix_ajuste: "Ajuste de Saldo (PIX)",
    cofre_ajuste: "Ajuste de Cofre",
    conta_digital_ajuste: "Ajuste Conta Digital",
    conta_digital_taxa: "Taxa Escolaweb",
};

export function useReports(
    startDate: string,
    endDate: string,
    dashboardData: DashboardData | undefined,
    reportData: ReportData | undefined,
    transactions: TransactionWithCreator[] | undefined,
    showResources: boolean
) {
    // Calcular resumo localmente para incluir transações legadas e garantir consistência
    const summary = useMemo(() => {
        if (!transactions) return null;

        return transactions.reduce((acc, t) => {
            const amount = Number(t.amount);

            // Entradas
            if (t.module === 'mensalidade' && t.payment_method === 'cash') acc.weeklyEntriesCash += amount;
            else if ((t.module === 'mensalidade' && t.payment_method === 'pix') || t.module === 'mensalidade_pix') acc.weeklyEntriesPix += amount;
            else if (t.module === 'pix_nao_identificado') acc.weeklyEntriesPixNaoIdentificado += amount;

            // Saídas
            else if (t.module === 'gasto_associacao' && t.payment_method === 'cash') acc.weeklyExpensesCash += amount;
            else if (t.module === 'gasto_associacao' && t.payment_method === 'pix') acc.weeklyExpensesPix += amount;
            else if (t.module === 'conta_digital_taxa') acc.weeklyExpensesDigital += amount;
            // Para transferências/saídas da conta digital, verificamos a conta de origem
            else if (t.source_account_name?.includes('Escolaweb') || t.source_account_name?.includes('Conta Digital')) {
                if (['gasto_associacao', 'transferencia', 'saque'].includes(t.module)) {
                    acc.weeklyExpensesDigital += amount;
                }
            }

            return acc;
        }, {
            weeklyEntriesCash: 0,
            weeklyEntriesPix: 0,
            weeklyEntriesPixNaoIdentificado: 0,
            weeklyExpensesCash: 0,
            weeklyExpensesPix: 0,
            weeklyExpensesDigital: 0
        });
    }, [transactions]);

    const getWhatsAppReportText = useCallback(() => {
        if (!dashboardData || !summary) {
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
            `PIX (Conta BB): ${formatCurrencyBRL(dashboardData.pixBalance)}`,
            `Conta Digital (Escolaweb): ${formatCurrencyBRL(dashboardData.contaDigitalBalance)}`
        ];

        if (dashboardData.cofreBalance > 0) {
            saldosAtuaisLines.push(`Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}`);
        }

        const totalSaldos = dashboardData.especieBalance + dashboardData.pixBalance + dashboardData.contaDigitalBalance + dashboardData.cofreBalance;
        saldosAtuaisLines.push(`Total Geral: ${formatCurrencyBRL(totalSaldos)}`);

        const resumoLines = [
            `Entradas (Espécie): ${formatCurrencyBRL(summary.weeklyEntriesCash)}`,
            `Entradas (PIX): ${formatCurrencyBRL(summary.weeklyEntriesPix)}`,
            `Saídas (Espécie): ${formatCurrencyBRL(summary.weeklyExpensesCash)}`,
            `Saídas (PIX): ${formatCurrencyBRL(summary.weeklyExpensesPix)}`
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
    }, [dashboardData, summary, startDate, endDate, showResources]);

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
        if (!dashboardData || !summary || !transactions) {
            toast.error("Aguarde o carregamento dos dados.");
            return;
        }

        // Carregamento dinâmico para reduzir bundle inicial
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable'),
        ]);

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // ========================================
        // CARREGAR LOGO CMCB
        // ========================================
        let logoDataUrl: string | null = null;
        try {
            const response = await fetch('/logo-cmcb.png');
            const blob = await response.blob();
            logoDataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn('Não foi possível carregar o logo:', e);
        }

        // ========================================
        // PÁGINA 1: RESUMO EXECUTIVO
        // ========================================

        // Header with red background
        const headerHeight = 35;
        const headerY = 15;
        doc.setFillColor(204, 0, 0);
        doc.rect(0, headerY, pageWidth, headerHeight, 'F');

        // Logo on the left and right sides of the header
        const logoSize = 25;
        const logoY = headerY + 5;
        if (logoDataUrl) {
            doc.addImage(logoDataUrl, 'PNG', 10, logoY, logoSize, logoSize);
            doc.addImage(logoDataUrl, 'PNG', pageWidth - 10 - logoSize, logoY, logoSize, logoSize);
        }

        // Text on the red banner (centered)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text("PRESTAÇÃO DE CONTAS – CMCB-XI", pageWidth / 2, headerY + 15, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Período: ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`, pageWidth / 2, headerY + 26, { align: 'center' });

        yPos = headerY + headerHeight + 5;

        // Divider line
        doc.setDrawColor(204, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(14, yPos, pageWidth - 14, yPos);

        yPos += 10;
        doc.setTextColor(0, 0, 0);

        // ========================================
        // SEÇÃO 1: ASSOCIAÇÃO
        // ========================================
        doc.setFillColor(250, 230, 230);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(204, 0, 0);
        doc.text("ASSOCIAÇÃO", 16, yPos);
        yPos += 12;

        doc.setTextColor(0, 0, 0);

        // Bloco A: Saldos Atuais
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Saldos Atuais (independente do período):", 16, yPos);
        yPos += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(`Espécie: ${formatCurrencyBRL(dashboardData.especieBalance)}`, 22, yPos);
        yPos += 5;
        doc.text(`PIX (Conta BB): ${formatCurrencyBRL(dashboardData.pixBalance)}`, 22, yPos);
        yPos += 5;
        doc.text(`Conta Digital (Escolaweb): ${formatCurrencyBRL(dashboardData.contaDigitalBalance)}`, 22, yPos);
        yPos += 5;
        doc.text(`Cofre: ${formatCurrencyBRL(dashboardData.cofreBalance)}`, 22, yPos);
        yPos += 6;

        // Total Geral da Associação
        const associationTotal = dashboardData.especieBalance + dashboardData.pixBalance + dashboardData.contaDigitalBalance + dashboardData.cofreBalance;
        doc.setFont(undefined, 'bold');
        doc.text(`Total Geral da Associação: ${formatCurrencyBRL(associationTotal)}`, 22, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 10;

        // Bloco B: Resumo do Período
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text("Resumo do Período:", 16, yPos);
        yPos += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 128, 0); // Green for entries
        doc.text(`Entradas (Espécie): ${formatCurrencyBRL(summary.weeklyEntriesCash)}`, 22, yPos);
        yPos += 5;
        doc.text(`Entradas (PIX): ${formatCurrencyBRL(summary.weeklyEntriesPix)}`, 22, yPos);
        yPos += 5;

        doc.setTextColor(204, 0, 0); // Red for expenses
        doc.text(`Saídas (Espécie): ${formatCurrencyBRL(summary.weeklyExpensesCash)}`, 22, yPos);
        yPos += 5;
        doc.text(`Saídas (PIX): ${formatCurrencyBRL(summary.weeklyExpensesPix)}`, 22, yPos);
        yPos += 15;

        doc.setTextColor(0, 0, 0); // Reset to black

        // ========================================
        // SEÇÃO 2: SALDOS DOS ESTABELECIMENTOS
        // ========================================
        doc.setFillColor(250, 230, 230);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(204, 0, 0);
        doc.text("SALDOS DOS ESTABELECIMENTOS", 16, yPos);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const activeMerchants = dashboardData.merchantBalances.filter(m => m.balance !== 0);
        if (activeMerchants.length > 0) {
            activeMerchants.forEach(m => {
                const merchantText = `${m.name}: ${formatCurrencyBRL(m.balance)}`;
                // Highlight negative balances in red
                if (m.balance < 0) {
                    doc.setTextColor(204, 0, 0);
                    doc.text(merchantText, 22, yPos);
                    doc.setTextColor(0, 0, 0);
                } else {
                    doc.text(merchantText, 22, yPos);
                }
                yPos += 5;
            });
        } else {
            doc.text("Todos os saldos zerados", 22, yPos);
            yPos += 5;
        }
        yPos += 10;

        // ========================================
        // SEÇÃO 3: RECURSOS (UE/CX)
        // ========================================
        doc.setFillColor(250, 230, 230);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(204, 0, 0);
        doc.text("RECURSOS (UE / CX)", 16, yPos);
        yPos += 10;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        // UE (Unidade Executora)
        doc.setFont(undefined, 'bold');
        doc.text("Unidade Executora:", 22, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');

        if (dashboardData.resourceBalances.UE.length > 0) {
            dashboardData.resourceBalances.UE.forEach(account => {
                const accountText = account.account_number
                    ? `${account.name} (Conta: ${account.account_number}): ${formatCurrencyBRL(account.balance)}`
                    : `${account.name}: ${formatCurrencyBRL(account.balance)}`;

                if (account.balance < 0) {
                    doc.setTextColor(204, 0, 0);
                } else {
                    doc.setTextColor(0, 0, 0);
                }
                doc.text(accountText, 28, yPos);
                doc.setTextColor(0, 0, 0);
                yPos += 5;
            });
        } else {
            doc.text("Sem contas cadastradas", 28, yPos);
            yPos += 5;
        }
        yPos += 3;

        // CX (Caixa Escolar)
        doc.setFont(undefined, 'bold');
        doc.text("Caixa Escolar:", 22, yPos);
        yPos += 5;
        doc.setFont(undefined, 'normal');

        if (dashboardData.resourceBalances.CX.length > 0) {
            dashboardData.resourceBalances.CX.forEach(account => {
                const accountText = account.account_number
                    ? `${account.name} (Conta: ${account.account_number}): ${formatCurrencyBRL(account.balance)}`
                    : `${account.name}: ${formatCurrencyBRL(account.balance)}`;

                if (account.balance < 0) {
                    doc.setTextColor(204, 0, 0);
                } else {
                    doc.setTextColor(0, 0, 0);
                }
                doc.text(accountText, 28, yPos);
                doc.setTextColor(0, 0, 0);
                yPos += 5;
            });
        } else {
            doc.text("Sem contas cadastradas", 28, yPos);
            yPos += 5;
        }



        // ========================================
        // QUEBRA DE PÁGINA EXPLÍCITA
        // ========================================
        doc.addPage();

        // ========================================
        // PÁGINA 2+: TRANSAÇÕES DO PERÍODO
        // ========================================
        yPos = 20;

        doc.setTextColor(0, 0, 0);
        doc.setFillColor(250, 230, 230);
        doc.rect(14, yPos - 5, pageWidth - 28, 8, 'F');
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(204, 0, 0);
        doc.text("TRANSAÇÕES DO PERÍODO", 16, yPos);
        yPos += 8;

        doc.setTextColor(0, 0, 0);

        // Ordenar e filtrar transações (remover anuladas)
        const sortedTransactions = [...transactions]
            .filter(t => t.status !== 'voided')
            .sort((a, b) =>
                new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
            );

        // Prepare transaction data with humanized labels
        const tableData = sortedTransactions.map(t => {
            // Usar mapeamento correto de tipo
            const tipo = REPORT_TYPE_LABELS[t.module] || t.module;

            // Determinar Estabelecimento corretamente (usar merchant_name)
            const estabelecimento = t.merchant_name || "-";

            // Determinar Origem/Conta corretamente (evitar duplicar nome do estabelecimento)
            let origemConta = t.source_account_name || t.destination_account_name || "-";
            if (estabelecimento !== "-" && origemConta === estabelecimento) {
                origemConta = "-";
            }

            return [
                formatDateBR(t.transaction_date),
                tipo,
                origemConta,
                estabelecimento,
                formatCurrencyBRL(t.amount),
                (t.description || '-').substring(0, 40),
                (t.notes || '-').substring(0, 30),
                (t.creator_name || '-').substring(0, 20)
            ];
        });

        autoTable(doc, {
            startY: yPos,
            head: [['Data', 'Tipo', 'Origem / Conta', 'Estabelecimento', 'Valor', 'Descrição', 'Obs.', 'Registrado por']],
            body: tableData,
            styles: {
                fontSize: 7,
                cellPadding: 2,
                overflow: 'linebreak',
                cellWidth: 'wrap'
            },
            headStyles: {
                fillColor: [204, 0, 0],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 7
            },
            alternateRowStyles: {
                fillColor: [250, 245, 245]
            },
            columnStyles: {
                0: { cellWidth: 18 },  // Data
                1: { cellWidth: 28 },  // Tipo
                2: { cellWidth: 26 },  // Origem/Conta
                3: { cellWidth: 24 },  // Estabelecimento
                4: { cellWidth: 22, halign: 'right', overflow: 'visible' }, // Valor - maior e sem quebra
                5: { cellWidth: 32 },  // Descrição
                6: { cellWidth: 22 },  // Observação
                7: { cellWidth: 22 }   // Registrado por
            },
            margin: { left: 8, right: 8 },
            tableWidth: 'auto',
            theme: 'grid',
            showHead: 'everyPage', // Repetir cabeçalho em cada página
        });

        // Update page count in footer for all pages uniformly
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);

            const subtitle = i === 1 ? "Resumo Executivo" : "Transações do período";
            const footerText = `Página ${i} de ${pageCount} – ${subtitle}`;

            // Clear any potential existing footer area (clean overwrite)
            doc.setFillColor(255, 255, 255);
            doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

            doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }

        doc.save(`prestacao_contas_${endDate}.pdf`);
        toast.success("PDF gerado com sucesso!");
    }, [dashboardData, summary, transactions, startDate, endDate]);

    return {
        getWhatsAppReportText,
        copyReport,
        openWhatsApp,
        exportPDF
    };
}
