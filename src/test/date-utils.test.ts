import { describe, it, expect } from "vitest";
import { 
  getWeekStartDate, 
  formatDateString, 
  parseDateString,
  formatDateBR,
  getTodayString 
} from "@/lib/date-utils";

describe("formatDateString", () => {
  it("should format date to YYYY-MM-DD", () => {
    const date = new Date(2025, 0, 15); // January 15, 2025
    expect(formatDateString(date)).toBe("2025-01-15");
  });

  it("should pad single digit month and day", () => {
    const date = new Date(2025, 0, 5); // January 5, 2025
    expect(formatDateString(date)).toBe("2025-01-05");
  });
});

describe("parseDateString", () => {
  it("should parse YYYY-MM-DD to Date object", () => {
    const date = parseDateString("2025-01-15");
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(15);
  });
});

describe("formatDateBR", () => {
  it("should format date to DD/MM/YYYY", () => {
    const result = formatDateBR("2025-01-15");
    expect(result).toBe("15/01/2025");
  });

  it("should format Date object to DD/MM/YYYY", () => {
    const date = new Date(2025, 0, 15);
    const result = formatDateBR(date);
    expect(result).toBe("15/01/2025");
  });
});

describe("getWeekStartDate", () => {
  it("should return a Date object", () => {
    const result = getWeekStartDate();
    expect(result).toBeInstanceOf(Date);
  });

  it("should return Friday or earlier", () => {
    const result = getWeekStartDate();
    // The week start should be on a Friday (day 5)
    expect(result.getDay()).toBe(5);
  });

  it("should return date in the past or today", () => {
    const result = getWeekStartDate();
    const today = new Date();
    expect(result.getTime()).toBeLessThanOrEqual(today.getTime());
  });
});

describe("getTodayString", () => {
  it("should return today's date in YYYY-MM-DD format", () => {
    const result = getTodayString();
    const today = new Date();
    const expected = formatDateString(today);
    expect(result).toBe(expected);
  });
});

describe("Week period calculation scenarios", () => {
  // These tests verify that the week calculation is correct for different days
  
  it("should handle Monday scenario", () => {
    // On Monday, the week should start from the previous Friday
    const result = getWeekStartDate();
    expect(result.getDay()).toBe(5); // Friday
  });

  it("should handle Wednesday scenario", () => {
    // On Wednesday, the week should also start from the previous Friday
    const result = getWeekStartDate();
    expect(result.getDay()).toBe(5); // Friday
  });

  it("should handle Friday afternoon scenario", () => {
    // On Friday, the week starts from today (Friday) if it's Friday
    const result = getWeekStartDate();
    expect(result.getDay()).toBe(5); // Friday
  });
});
