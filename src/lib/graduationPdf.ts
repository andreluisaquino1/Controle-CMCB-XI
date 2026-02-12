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
    };
    students: { id: string; full_name: string }[];
}

export const generateCarnetsByInstallmentPDF = ({ graduation, class: classData, config, students }: PDFData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Configurações do layout (Parecido com a imagem)
    const carnetWidth = (pageWidth - 2 * margin);
    const receiptWidth = carnetWidth * 0.35; // Parte esquerda (Canhoto)
    const bankCopyWidth = carnetWidth * 0.65; // Parte direita (Ficha)
    const carnetHeight = 50; // Altura de cada bloco de carnê
    const spacing = 5;

    let currentY = 25;

    // Iterar por cada parcela (conforme pedido: Seção Parcela 01, depois 02...)
    for (let i = 1; i <= config.installments_count; i++) {
        const installmentLabel = `${i.toString().padStart(2, '0')}/${config.installments_count.toString().padStart(2, '0')}`;

        // Adicionar cabeçalho da seção de parcela
        if (i > 1) doc.addPage();
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Parcela ${i.toString().padStart(2, '0')} — Turma ${classData.name}`, margin, 15);
        currentY = 25;

        for (const student of students) {
            // Verificar se cabe na página
            if (currentY + carnetHeight > pageHeight - 15) {
                doc.addPage();
                currentY = 20;
            }

            // --- BLOCO ESQUERDO (CANHOTO) ---
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.rect(margin, currentY, receiptWidth, carnetHeight);

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("VALOR:", margin + 2, currentY + 7);
            doc.text("MÊS:", margin + 2, currentY + 15);
            doc.text("PARCELA:", margin + 2, currentY + 23);
            doc.text("PAGO EM:", margin + 2, currentY + 31);
            doc.text("RECEBIDO POR:", margin + 2, currentY + 39);

            doc.setFont("helvetica", "normal");
            doc.text(`R$ ${Number(config.installment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + 15, currentY + 7);
            doc.text(`________________`, margin + 11, currentY + 15); // Campo Mês
            doc.text(installmentLabel, margin + 18, currentY + 23);
            doc.text(`___/___/___`, margin + 18, currentY + 31); // Campo Pago em
            doc.text(`________________`, margin + 25, currentY + 39); // Campo Recebido por

            // --- BLOCO DIREITO (FICHA PRINCIPAL) ---
            doc.rect(margin + receiptWidth, currentY, bankCopyWidth, carnetHeight);

            doc.setFont("helvetica", "bold");
            doc.text("PARCELA:", margin + receiptWidth + 5, currentY + 7);
            doc.text("VALOR:", margin + receiptWidth + 5, currentY + 15);
            doc.text("ALUNO(A):", margin + receiptWidth + 5, currentY + 23);
            doc.text("RESPONSÁVEL FINANCEIRO:", margin + receiptWidth + 5, currentY + 31);
            doc.text("RECEBIDO EM:", margin + receiptWidth + 5, currentY + 39);

            doc.setFont("helvetica", "normal");
            doc.text(installmentLabel, margin + receiptWidth + 22, currentY + 7);
            doc.text(`R$ ${Number(config.installment_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, margin + receiptWidth + 20, currentY + 15);
            doc.text(student.full_name.toUpperCase(), margin + receiptWidth + 25, currentY + 23);
            doc.text(`____________________________________`, margin + receiptWidth + 48, currentY + 31);
            doc.text(`___/___/___`, margin + receiptWidth + 28, currentY + 39);

            // Informação da Turma discreta no rodapé do bloco
            doc.setFontSize(6);
            doc.text(`TURMA: ${classData.name}`, margin + receiptWidth + 5, currentY + 47);

            currentY += carnetHeight + spacing;
        }

        // Nota de rodapé na página
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")} - Sistema Controle CMCB`, pageWidth - margin - 60, pageHeight - 5);
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
