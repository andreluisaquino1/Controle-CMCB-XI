import { describe, it, expect } from "vitest";
import { parseCurrencyBRL, formatCurrencyBRL } from "@/lib/currency";

describe("parseCurrencyBRL", () => {
  it("should parse Brazilian format with comma as decimal separator", () => {
    expect(parseCurrencyBRL("1234,56")).toBe(1234.56);
  });

  it("should parse full Brazilian format with period as thousand separator", () => {
    expect(parseCurrencyBRL("1.234,56")).toBe(1234.56);
  });

  it("should parse value with currency symbol", () => {
    expect(parseCurrencyBRL("R$ 1.234,56")).toBe(1234.56);
  });

  it("should parse value with only period as decimal separator", () => {
    expect(parseCurrencyBRL("1234.56")).toBe(1234.56);
  });

  it("should return 0 for empty string", () => {
    expect(parseCurrencyBRL("")).toBe(0);
  });

  it("should return 0 for null", () => {
    expect(parseCurrencyBRL(null)).toBe(0);
  });

  it("should return 0 for undefined", () => {
    expect(parseCurrencyBRL(undefined)).toBe(0);
  });

  it("should handle number input", () => {
    expect(parseCurrencyBRL(1234.56)).toBe(1234.56);
  });

  it("should round to 2 decimal places", () => {
    expect(parseCurrencyBRL("1234.567")).toBe(1234.57);
  });

  it("should handle NaN input", () => {
    expect(parseCurrencyBRL(NaN)).toBe(0);
  });

  it("should handle invalid string", () => {
    expect(parseCurrencyBRL("abc")).toBe(0);
  });
});

describe("formatCurrencyBRL", () => {
  it("should format number to Brazilian Real", () => {
    expect(formatCurrencyBRL(1234.56)).toBe("R$\u00A01.234,56");
  });

  it("should format zero", () => {
    expect(formatCurrencyBRL(0)).toBe("R$\u00A00,00");
  });

  it("should format negative number", () => {
    expect(formatCurrencyBRL(-1234.56)).toBe("-R$\u00A01.234,56");
  });

  it("should handle null", () => {
    expect(formatCurrencyBRL(null)).toBe("R$\u00A00,00");
  });

  it("should handle undefined", () => {
    expect(formatCurrencyBRL(undefined)).toBe("R$\u00A00,00");
  });

  it("should handle NaN", () => {
    expect(formatCurrencyBRL(NaN)).toBe("R$\u00A00,00");
  });

  it("should format large numbers", () => {
    expect(formatCurrencyBRL(1234567.89)).toBe("R$\u00A01.234.567,89");
  });

  it("should format small decimal numbers", () => {
    expect(formatCurrencyBRL(0.01)).toBe("R$\u00A00,01");
  });
});
