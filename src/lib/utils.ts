import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function getWeekStartDate(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Calculate last Friday
  const daysToFriday = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
  const lastFriday = new Date(today);
  lastFriday.setDate(today.getDate() - daysToFriday - 7);
  return lastFriday;
}
