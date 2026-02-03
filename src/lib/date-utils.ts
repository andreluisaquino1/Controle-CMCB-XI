/**
 * Format a Date object to YYYY-MM-DD string without timezone conversion
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a local Date object
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the start date for the current financial week
 * The week starts on the last Friday (closing day)
 * Includes Saturday/Sunday from the previous week
 */
export function getWeekStartDate(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
  
  let daysToLastFriday: number;
  
  if (dayOfWeek === 5) {
    // Today is Friday - start from today
    daysToLastFriday = 0;
  } else if (dayOfWeek === 6) {
    // Today is Saturday - start from yesterday (Friday)
    daysToLastFriday = 1;
  } else if (dayOfWeek === 0) {
    // Today is Sunday - start from 2 days ago (Friday)
    daysToLastFriday = 2;
  } else {
    // Monday (1) to Thursday (4)
    // Go back to last Friday
    daysToLastFriday = dayOfWeek + 2;
  }
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToLastFriday);
  weekStart.setHours(0, 0, 0, 0);
  
  return weekStart;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return formatDateString(new Date());
}

/**
 * Format date for display in Brazilian format (DD/MM/YYYY)
 */
export function formatDateBR(date: string | Date): string {
  const d = typeof date === "string" ? parseDateString(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
