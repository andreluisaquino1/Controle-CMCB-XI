import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrencyBRL } from "@/shared/lib/currency";
import { GraduationInstallment, GraduationStudent, Graduation } from "@/features/graduations/services/graduationService";

export const graduationPdfUtils = {
    generateStudentCarnet: (
        graduation: Graduation,
        student: GraduationStudent,
        installments: GraduationInstallment[]
    ) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFontSize(16);
        doc.text(`CARNÊ DE PAGAMENTO - ${graduation.name.toUpperCase()}`, pageWidth / 2, 20, { align: "center" });

        doc.setFontSize(12);
        doc.text(`Aluno: ${student.name}`, 20, 35);
        doc.text(`Ano: ${graduation.year}`, pageWidth - 20, 35, { align: "right" });

        // Table of Installments
        const tableData = installments.map((ins) => [
            ins.installment_number.toString(),
            format(new Date(ins.due_date), "dd/MM/yyyy"),
            formatCurrencyBRL(ins.value),
            ins.status === "PAGO" ? "PAGO" : "EM ABERTO",
            ins.paid_at ? format(new Date(ins.paid_at), "dd/MM/yyyy") : "-",
        ]);

        autoTable(doc, {
            startY: 45,
            head: [["Parcela", "Vencimento", "Valor", "Status", "Data Pagamento"]],
            body: tableData,
            theme: "grid",
            headStyles: { fillGray: 200, textColor: 0, fontStyle: "bold" },
        });

        // Manual Fields for Signature
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.line(20, finalY, 80, finalY);
        doc.text("Assinatura / Recebido por", 20, finalY + 5);

        doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);
        doc.text("Data do Recebimento", pageWidth - 80, finalY + 5);

        doc.save(`carne_${student.name.replace(/\s+/g, "_").toLowerCase()}.pdf`);
    },

    generateTreasurerControl: (
        graduation: Graduation,
        className: string,
        students: GraduationStudent[],
        grid: Record<string, GraduationInstallment[]>
    ) => {
        const doc = new jsPDF({ orientation: "landscape" });
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFontSize(16);
        doc.text(`CONTROLE DO TESOUREIRO - ${graduation.name.toUpperCase()}`, pageWidth / 2, 15, { align: "center" });
        doc.setFontSize(12);
        doc.text(`Turma: ${className}`, 15, 25);

        // Determine max installments
        let maxInstallments = 0;
        Object.values(grid).forEach(list => {
            if (list.length > maxInstallments) maxInstallments = list.length;
        });

        // Headers: Name + P1, P2, P3...
        const headers = ["Aluno"];
        for (let i = 1; i <= maxInstallments; i++) {
            headers.push(`P${i}`);
        }

        const tableData = students.map(student => {
            const studentInstallments = grid[student.id] || [];
            const row = [student.name];
            for (let i = 1; i <= maxInstallments; i++) {
                const ins = studentInstallments.find(inc => inc.installment_number === i);
                if (!ins) row.push("-");
                else if (ins.status === "PAGO") row.push("X");
                else if (ins.status === "ISENTO") row.push("I");
                else row.push("");
            }
            return row;
        });

        autoTable(doc, {
            startY: 30,
            head: [headers],
            body: tableData,
            theme: "grid",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [63, 81, 181], textColor: 255 },
            columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } },
        });

        doc.setFontSize(8);
        doc.text("Legenda: X = Pago, I = Isento, Vazio = Em Aberto", 15, doc.internal.pageSize.getHeight() - 10);

        doc.save(`controle_tesoureiro_${className.replace(/\s+/g, "_").toLowerCase()}.pdf`);
    }
};
