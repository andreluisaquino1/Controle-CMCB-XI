
/**
 * Refatoração para usar imports dinâmicos de jsPDF e jspdf-autotable.
 * Isso evita problemas de bundle no Vite e reduz o tamanho inicial do JS.
 */
const getPdfLib = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);
    return { jsPDF, autoTable };
};

export interface GenerateCarnetParams {
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

export const generateCarnetsByInstallmentPDF = async (params: GenerateCarnetParams) => {
    const { jsPDF } = await getPdfLib();
    const doc = new jsPDF();
    const { graduation, class: classData, config, students } = params;

    const carnetsPerPage = 3;
    const carnetHeight = 90;
    const margin = 10;

    const formatBRL = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    let studentIndex = 0;

    for (const student of students) {
        for (let i = 0; i < config.installments_count; i++) {
            const installmentNum = i + 1;
            const currentPositionInPage = (studentIndex % carnetsPerPage);

            if (studentIndex > 0 && currentPositionInPage === 0) {
                doc.addPage();
            }

            const startY = margin + (currentPositionInPage * carnetHeight);

            // Desenhar bordas e linhas do carnê
            doc.setDrawColor(200);
            doc.rect(margin, startY, 190, carnetHeight - 5);
            doc.line(margin + 55, startY, margin + 55, startY + carnetHeight - 5);

            // --- LADO ESQUERDO (Recibo do Pagador) ---
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("RECIBO DO PAGADOR", margin + 5, startY + 8);

            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("Parcela:", margin + 5, startY + 15);
            doc.text(`${installmentNum}/${config.installments_count}`, margin + 25, startY + 15);

            doc.text("Vencimento:", margin + 5, startY + 20);
            const dueMonth = (config.start_month + i - 1) % 12;
            const dueYear = graduation.year + Math.floor((config.start_month + i - 1) / 12);
            const dueDate = new Date(dueYear, dueMonth, config.due_day);
            doc.text(dueDate.toLocaleDateString('pt-BR'), margin + 25, startY + 20);

            doc.text("Valor:", margin + 5, startY + 25);
            doc.text(formatBRL(config.installment_value), margin + 25, startY + 25);

            doc.text("Pagador:", margin + 5, startY + 35);
            const studentName = student.full_name || "ESTUDANTE NÃO INFORMADO";
            const splitStudentName = doc.splitTextToSize(studentName.toUpperCase(), 45);
            doc.text(splitStudentName, margin + 5, startY + 40);

            // --- LADO DIREITO (Ficha Principal) ---
            const rightX = margin + 60;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("COMISSÃO DE FORMATURA CMCB-XI", rightX, startY + 8);
            doc.setFontSize(8);
            doc.text(`${graduation.name.toUpperCase()} - ${graduation.year}`, rightX, startY + 13);

            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("LOCAL DE PAGAMENTO: DIRETAMENTE COM A COMISSÃO", rightX, startY + 22);

            // Tabela simples simulada
            doc.rect(rightX, startY + 25, 125, 45);
            doc.line(rightX, startY + 32, rightX + 125, startY + 32);
            doc.line(rightX + 90, startY + 25, rightX + 90, startY + 70);

            doc.text("DATA DE VENCIMENTO", rightX + 2, startY + 29);
            doc.setFont("helvetica", "bold");
            doc.text(dueDate.toLocaleDateString('pt-BR'), rightX + 92, startY + 29);

            doc.setFont("helvetica", "normal");
            doc.text("ALUNO(A)", rightX + 2, startY + 36);
            doc.setFont("helvetica", "bold");
            doc.text(studentName.toUpperCase(), rightX + 2, startY + 42);

            doc.setFont("helvetica", "normal");
            doc.text("TURMA", rightX + 2, startY + 48);
            doc.text(classData.name.toUpperCase(), rightX + 2, startY + 53);

            doc.text("VALOR DO DOCUMENTO", rightX + 92, startY + 36);
            doc.setFont("helvetica", "bold");
            doc.text(formatBRL(config.installment_value), rightX + 92, startY + 42);

            doc.setFontSize(6);
            doc.setFont("helvetica", "italic");
            doc.text("Obs: Mantenha seus pagamentos em dia para garantir a realização dos eventos.", rightX, startY + 75);

            studentIndex++;
        }
    }

    doc.save(`Carnes_${classData.name.replace(/\s/g, '_')}.pdf`);
};

export interface TreasurerControlParams {
    graduation: { name: string; year: number };
    class: { name: string };
    students: { id: string; full_name: string; guardian_name?: string }[];
}

export const generateTreasurerControlPDF = async (params: TreasurerControlParams) => {
    const { jsPDF, autoTable } = await getPdfLib();
    const doc = new jsPDF();
    const { graduation, class: classData, students } = params;

    doc.setFontSize(14);
    doc.text("Controle do Tesoureiro - Comissão de Formatura", 14, 15);
    doc.setFontSize(11);
    doc.text(`${graduation.name} - ${classData.name} (${graduation.year})`, 14, 22);

    const head = [["ALUNO(A)", "RESPONSÁVEL", "ASSINATURA", "DATA", "VALOR"]];
    const body = students.map(s => [
        s.full_name?.toUpperCase() || "",
        s.guardian_name?.toUpperCase() || "",
        "________________________",
        "___/___/___",
        "R$ ________"
    ]);

    autoTable(doc, {
        head,
        body,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 45 },
            2: { cellWidth: 45 },
            3: { cellWidth: 25 },
            4: { cellWidth: 25 },
        }
    });

    doc.save(`Controle_Tesoureiro_${classData.name.replace(/\s/g, '_')}.pdf`);
};
