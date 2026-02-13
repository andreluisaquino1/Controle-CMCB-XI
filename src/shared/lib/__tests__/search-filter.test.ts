import { describe, it, expect } from 'vitest';
import { matchesSearchTerm } from '@/shared/lib/search-filter';
import { TransactionWithCreator } from '@/types';

describe('matchesSearchTerm', () => {
    const mockTx = {
        description: 'Mensalidade Aluno A',
        merchant_name: 'Atacadão',
        source_account_name: 'Cofre',
        destination_account_name: 'PIX',
        notes: 'Observação teste'
    } as TransactionWithCreator;

    it('matches description', () => {
        expect(matchesSearchTerm(mockTx, 'mensalidade')).toBe(true);
    });

    it('matches merchant', () => {
        expect(matchesSearchTerm(mockTx, 'atacadão')).toBe(true);
    });

    it('matches account', () => {
        expect(matchesSearchTerm(mockTx, 'cofre')).toBe(true);
    });

    it('matches notes', () => {
        expect(matchesSearchTerm(mockTx, 'obs')).toBe(true);
    });

    it('returns true for empty search', () => {
        expect(matchesSearchTerm(mockTx, '')).toBe(true);
    });

    it('returns false for non-matching term', () => {
        expect(matchesSearchTerm(mockTx, 'xyzabc')).toBe(false);
    });
});
