/**
 * Exports an array of objects to a CSV file.
 * Handles basic escaping and adds BOM for Excel compatibility in UTF-8.
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) return;

    // Extract keys from first object as headers
    const headers = Object.keys(data[0]).join(",");

    // Format rows
    const rows = data.map((row) =>
        Object.values(row)
            .map((value) => {
                const val = value === null ? "" : String(value);
                // Escape double quotes and wrap in quotes
                return `"${val.replace(/"/g, '""')}"`;
            })
            .join(",")
    );

    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Lazy-loaded Excel export - only loads xlsx library when called
 * This reduces the main bundle size significantly
 */
export async function exportToExcel(data: Record<string, unknown>[], filename: string) {
    if (!data || data.length === 0) return;

    // Dynamically import xlsx only when needed
    const XLSX = await import('xlsx');

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Lazy-loaded PDF export - only loads jspdf and autotable when called
 * This reduces the main bundle size significantly
 */
export async function exportToPDF(
    title: string,
    content: { headers: string[]; rows: unknown[][] }[],
    filename: string
) {
    // Dynamically import jspdf and autotable only when needed
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);

    let yPosition = 25;

    // Add each table
    content.forEach((table, index) => {
        if (index > 0) {
            yPosition += 10;
        }

        autoTable(doc, {
            head: [table.headers],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body: table.rows as any[][], // Still need any here because autoTable types are strict but rows can be anything
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [66, 66, 66] },
        });

        // @ts-expect-error - autoTable adds lastAutoTable to doc
        yPosition = doc.lastAutoTable.finalY + 10;
    });

    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Lazy-loaded HTML to image capture - only loads html2canvas when called
 */
export async function captureElementAsImage(element: HTMLElement): Promise<string> {
    // Dynamically import html2canvas only when needed
    const html2canvas = await import('html2canvas');

    const canvas = await html2canvas.default(element, {
        scale: 2,
        backgroundColor: '#ffffff',
    });

    return canvas.toDataURL('image/png');
}
