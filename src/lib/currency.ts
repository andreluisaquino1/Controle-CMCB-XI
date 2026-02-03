/**
 * Parse a Brazilian currency string to number
 * Handles both comma and period as decimal separators
 * Removes currency symbols and thousand separators
 */
export function parseCurrencyBRL(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;

  if (typeof input === "number") {
    return isNaN(input) ? 0 : Math.round(input * 100) / 100;
  }

  // Remove currency symbol, spaces, and other non-numeric chars except comma/period
  const cleanedInput = input
    .replace(/R\$\s?/g, "")
    .replace(/\s/g, "")
    .trim();

  // If contains both comma and period, determine which is decimal
  if (cleanedInput.includes(",") && cleanedInput.includes(".")) {
    // Brazilian format: period for thousands, comma for decimals
    // e.g., "1.234,56" -> 1234.56
    const normalized = cleanedInput.replace(/\./g, "").replace(",", ".");
    const numericValue = parseFloat(normalized);
    return isNaN(numericValue) ? 0 : Math.round(numericValue * 100) / 100;
  }

  // Only comma - assume it's the decimal separator
  if (cleanedInput.includes(",")) {
    const normalized = cleanedInput.replace(",", ".");
    const numericValue = parseFloat(normalized);
    return isNaN(numericValue) ? 0 : Math.round(numericValue * 100) / 100;
  }

  // Only period or no separator - parse as is
  const numericValue = parseFloat(cleanedInput);
  return isNaN(numericValue) ? 0 : Math.round(numericValue * 100) / 100;
}

/**
 * Format a number as Brazilian Real currency
 * Returns formatted string like "R$ 1.234,56"
 */
export function formatCurrencyBRL(value: number | string | null | undefined): string {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (numericValue === null || numericValue === undefined || isNaN(numericValue)) {
    return (0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return numericValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Format currency input as user types
 * Returns a display string for the input field
 */
export function formatCurrencyInput(value: string): string {
  // Remove non-numeric characters except comma and period
  const cleaned = value.replace(/[^\d,.-]/g, "");
  return cleaned;
}
