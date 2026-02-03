/**
 * Exports an array of objects to a CSV file.
 * Handles basic escaping and adds BOM for Excel compatibility in UTF-8.
 */
export function exportToCSV(data: any[], filename: string) {
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
