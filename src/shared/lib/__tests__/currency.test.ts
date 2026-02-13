import { describe, it, expect } from 'vitest';
import { toCents, fromCents } from '@/shared/lib/currency';

describe('toCents / fromCents', () => {
  it('converts reais to cents', () => {
    expect(toCents(10.50)).toBe(1050);
    expect(toCents(0)).toBe(0);
    expect(toCents(0.01)).toBe(1);
    expect(toCents(10.505)).toBe(1051); // rounding check
  });
  it('converts cents to reais', () => {
    expect(fromCents(1050)).toBe(10.50);
    expect(fromCents(0)).toBe(0);
    expect(fromCents(1)).toBe(0.01);
  });
});
