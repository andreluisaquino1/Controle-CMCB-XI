import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PDFData {
    graduation: { name: string; year: number };
    class: { name: string };
    config: {
        installment_value: number;
        installments_count: number;
        due_day: number;
        start_month: number;
    };
    students: { id: string; full_name: string; guardian_name?: string }[];
}

export const generateCarnetsByInstallmentPDF = ({ graduation, class: classData, config, students }: PDFData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 8;

    const totalWidth = pageWidth - 2 * margin;
    const receiptWidth = totalWidth * 0.30;
    const mainWidth = totalWidth * 0.70;
    const carnetHeight = 44;
    const spacing = 2;
    const headerBandH = 8;

    const drawDashedLine = (x1: number, y1: number, x2: number, y2: number) => {
        const dashLen = 2;
        const gapLen = 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lineLen = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(lineLen / (dashLen + gapLen));
        const ux = dx / lineLen;
        const uy = dy / lineLen;
        for (let s = 0; s < steps; s++) {
            const sx = x1 + (dashLen + gapLen) * s * ux;
            const sy = y1 + (dashLen + gapLen) * s * uy;
            doc.line(sx, sy, sx + dashLen * ux, sy + dashLen * uy);
        }
    };

    for (let i = 1; i <= config.installments_count; i++) {
        const installmentLabel = `${i.toString().padStart(2, '0')}/${config.installments_count.toString().padStart(2, '0')}`;
        // Calculate the actual due date for this installment
        const monthIndex = (config.start_month - 1) + (i - 1); // 0-based
        const dueDate = new Date(graduation.year, monthIndex, config.due_day);
        const dueDateStr = `${dueDate.getDate().toString().padStart(2, '0')}/${(dueDate.getMonth() + 1).toString().padStart(2, '0')}/${dueDate.getFullYear()}`;

        if (i > 1) doc.addPage();

        // Page title
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(`Parcela ${i.toString().padStart(2, '0')} ÔÇö ${graduation.name}`, margin, 8);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120);
        doc.text(`Turma: ${classData.name}  |  Ano: ${graduation.year}`, margin, 12);
        doc.setTextColor(0);

        let currentY = 15;

        for (const student of students) {
            if (currentY + carnetHeight > pageHeight - 6) {
                doc.addPage();
                currentY = 8;
            }

            const leftX = margin;
            const rightX = margin + receiptWidth + 1;

            // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
            // CANHOTO (Recibo do Pagador)
            // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
            doc.setDrawColor(80);
            doc.setLineWidth(0.4);
            doc.rect(leftX, currentY, receiptWidth, carnetHeight);

            // Header band
            doc.setFillColor(230, 230, 230);
            doc.rect(leftX, currentY, receiptWidth, headerBandH, 'F');
            doc.setDrawColor(80);
            doc.rect(leftX, currentY, receiptWidth, headerBandH);

            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50);
            doc.text("RECIBO DO PAGADOR", leftX + receiptWidth / 2, currentY + 5, { align: "center" });

            // Content
            const cY = currentY + headerBandH + 3;
            doc.setFontSize(7);
            doc.setTextColor(80);

            doc.setFont("helvetica", "bold");
            doc.text("Parcela:", leftX + 2, cY);
            doc.setFont("helvetica", "normal");
            doc.text(installmentLabel, leftX + 16, cY);

            doc.setFont("helvetica", "bold");
            doc.text("Valor:", leftX + 2, cY + 6);
            doc.setFont("helvetica", "normal");
            doc.text(`R$ ${Number(config.installment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, leftX + 14, cY + 6);

            doc.setFont("helvetica", "bold");
            doc.text("Venc.:", leftX + 2, cY + 12);
            doc.setFont("helvetica", "normal");
            doc.text(dueDateStr, leftX + 14, cY + 12);

            doc.setFont("helvetica", "bold");
            doc.text("Pago em:", leftX + 2, cY + 18);
            doc.setFont("helvetica", "normal");
            doc.text("____/____/________", leftX + 16, cY + 18);

            doc.setFont("helvetica", "bold");
            doc.text("Ass.:", leftX + 2, cY + 24);
            doc.line(leftX + 10, cY + 24, leftX + receiptWidth - 3, cY + 24);

            // Dashed cut line
            doc.setDrawColor(160);
            doc.setLineWidth(0.2);
            drawDashedLine(margin + receiptWidth + 0.5, currentY, margin + receiptWidth + 0.5, currentY + carnetHeight);

            // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
            // FICHA PRINCIPAL (Via da Comiss├úo)
            // ÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉ
            doc.setDrawColor(80);
            doc.setLineWidth(0.4);
            doc.rect(rightX, currentY, mainWidth, carnetHeight);

            // Header band
            doc.setFillColor(45, 80, 140);
            doc.rect(rightX, currentY, mainWidth, headerBandH, 'F');
            doc.setDrawColor(80);
            doc.rect(rightX, currentY, mainWidth, headerBandH);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255);
            doc.text(`${graduation.name.toUpperCase()} ÔÇö PARCELA ${installmentLabel}`, rightX + 4, currentY + 5.5);

            doc.setFontSize(7);
            doc.text(`R$ ${Number(config.installment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, rightX + mainWidth - 4, currentY + 5.5, { align: "right" });

            // Content
            const mY = currentY + headerBandH + 4;
            doc.setTextColor(60);

            // Row 1: Aluno + Turma
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.text("ALUNO(A):", rightX + 4, mY);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(student.full_name.toUpperCase(), rightX + 22, mY);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.text("TURMA:", rightX + mainWidth - 35, mY);
            doc.setFont("helvetica", "normal");
            doc.text(classData.name, rightX + mainWidth - 21, mY);

            // Separator
            doc.setDrawColor(200);
            doc.setLineWidth(0.15);
            doc.line(rightX + 4, mY + 2.5, rightX + mainWidth - 4, mY + 2.5);

            // Row 2: Respons├ível Financeiro
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(60);
            doc.text("RESPONS├üVEL FINANCEIRO:", rightX + 4, mY + 7);
            if (student.guardian_name) {
                doc.setFont("helvetica", "normal");
                doc.text(student.guardian_name.toUpperCase(), rightX + 45, mY + 7);
            } else {
                doc.setDrawColor(180);
                doc.line(rightX + 45, mY + 7, rightX + mainWidth - 4, mY + 7);
            }

            // Row 3: Pago em + Recebido por
            doc.setFont("helvetica", "bold");
            doc.text("PAGO EM:", rightX + 4, mY + 14);
            doc.setFont("helvetica", "normal");
            doc.text("____/____/________", rightX + 20, mY + 14);

            doc.setFont("helvetica", "bold");
            doc.text("RECEBIDO POR:", rightX + 60, mY + 14);
            doc.line(rightX + 85, mY + 14, rightX + mainWidth - 4, mY + 14);

            // Row 4: Assinatura
            doc.setFont("helvetica", "bold");
            doc.text("ASSINATURA:", rightX + 4, mY + 21);
            doc.line(rightX + 25, mY + 21, rightX + mainWidth / 2 - 5, mY + 21);

            doc.setFont("helvetica", "bold");
            doc.text("ASSINATURA:", rightX + mainWidth / 2 + 5, mY + 21);
            doc.line(rightX + mainWidth / 2 + 26, mY + 21, rightX + mainWidth - 4, mY + 21);

            // Footer text
            doc.setFontSize(5);
            doc.setTextColor(170);
            doc.text("Pagador", rightX + 15, mY + 24);
            doc.text("Recebedor", rightX + mainWidth / 2 + 18, mY + 24);

            doc.setTextColor(0);

            currentY += carnetHeight + spacing;
        }

        // Page footer
        doc.setFontSize(6);
        doc.setTextColor(160);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")} ÔÇö Sistema Controle CMCB`, pageWidth - margin, pageHeight - 5, { align: "right" });
        doc.setTextColor(0);
    }

    const fileName = `carnes_${classData.name.replace(/\s+/g, '_')}_${graduation.year}_parcelas.pdf`;
    doc.save(fileName);
};

export const generateTreasurerControlPDF = ({ graduation, class: classData, config, students }: PDFData) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Controle do Tesoureiro - Formatura", 14, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Formatura: ${graduation.name}`, 14, 22);
    doc.text(`Ano: ${graduation.year}`, 14, 27);
    doc.text(`Turma: ${classData.name}`, 14, 32);
    doc.text(`Valor Parcela: R$ ${Number(config.installment_value).toFixed(2)}`, 14, 37);
    doc.text(`Total Parcelas: ${config.installments_count}`, 14, 42);

    const headers = [
        "ALUNO(A)",
        ...Array.from({ length: config.installments_count }, (_, i) => `P. ${(i + 1).toString().padStart(2, '0')}`),
        "ASSINATURA / OBS"
    ];

    const body = students.map(s => [
        s.full_name,
        ...Array.from({ length: config.installments_count }, () => ""),
        ""
    ]);

    autoTable(doc, {
        head: [headers],
        body: body,
        startY: 50,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 50 },
    });

    const fileName = `controle_tesoureiro_${classData.name.replace(/\s+/g, '_')}_${graduation.year}.pdf`;
    doc.save(fileName);
};
