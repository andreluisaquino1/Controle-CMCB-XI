
import { supabase } from "@/integrations/supabase/client";
import {
    GraduationEntryType,
    GraduationPayMethod,
    GraduationFinancialCard,
    FinancialTransaction,
    StudentObligation
} from "@/features/graduations/services/types";

// Helper para tabelas fora do schema gerado pelo Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => supabase.from(table as any);

// Interfaces auxiliares para rows intermediários
interface EntryRow {
    id: string;
    date: string;
    entry_type: GraduationEntryType;
    pix_amount: number;
    cash_amount: number;
    notes?: string;
}

interface ExpenseRow {
    id: string;
    date: string;
    description: string;
    amount: number;
    method: GraduationPayMethod;
}

interface TransferRow {
    id: string;
    date: string;
    from_account: GraduationPayMethod;
    to_account: GraduationPayMethod;
    amount: number;
}

interface AdjustmentRow {
    id: string;
    date: string;
    account: GraduationPayMethod;
    direction: 'POS' | 'NEG';
    amount: number;
}

interface AmountRow {
    amount: number;
}

interface RefLabelRow {
    reference_label: string;
}

export const financeService = {
    async createEntry(data: {
        graduation_id: string;
        class_id?: string;
        date: string;
        entry_type: GraduationEntryType;
        cash_amount: number;
        pix_amount: number;
        notes?: string;
    }): Promise<void> {
        const { error } = await fromTable('graduation_fin_entries')
            .insert(data);
        if (error) throw error;
    },

    async createExpense(data: {
        graduation_id: string;
        class_id?: string;
        date: string;
        method: GraduationPayMethod;
        amount: number;
        description: string;
    }): Promise<void> {
        const { error } = await fromTable('graduation_fin_expenses')
            .insert(data);
        if (error) throw error;
    },

    async createTransfer(data: {
        graduation_id: string;
        date: string;
        from_account: GraduationPayMethod;
        to_account: GraduationPayMethod;
        amount: number;
        notes?: string;
    }): Promise<void> {
        const { error } = await fromTable('graduation_fin_transfers')
            .insert(data);
        if (error) throw error;
    },

    async createAdjustment(data: {
        graduation_id: string;
        date: string;
        account: GraduationPayMethod;
        direction: 'POS' | 'NEG';
        amount: number;
        notes?: string;
    }): Promise<void> {
        const { error } = await fromTable('graduation_fin_adjustments')
            .insert(data);
        if (error) throw error;
    },

    async getFinancialSummary(graduationId: string): Promise<GraduationFinancialCard> {
        const [entries, expenses, transfers, adjustments] = await Promise.all([
            fromTable('graduation_fin_entries').select('*').eq('graduation_id', graduationId),
            fromTable('graduation_fin_expenses').select('*').eq('graduation_id', graduationId),
            fromTable('graduation_fin_transfers').select('*').eq('graduation_id', graduationId),
            fromTable('graduation_fin_adjustments').select('*').eq('graduation_id', graduationId)
        ]);

        if (entries.error) throw entries.error;
        if (expenses.error) throw expenses.error;
        if (transfers.error) throw transfers.error;
        if (adjustments.error) throw adjustments.error;

        let pix = 0;
        let cash = 0;
        let totalExp = 0;
        let totalInc = 0;

        ((entries.data || []) as unknown as EntryRow[]).forEach((e) => {
            const p = Number(e.pix_amount || 0);
            const c = Number(e.cash_amount || 0);
            pix += p;
            cash += c;
            totalInc += (p + c);
        });

        ((expenses.data || []) as unknown as ExpenseRow[]).forEach((e) => {
            const val = Number(e.amount);
            totalExp += val;
            if (e.method === 'PIX') pix -= val;
            else cash -= val;
        });

        ((transfers.data || []) as unknown as TransferRow[]).forEach((t) => {
            const val = Number(t.amount);
            if (t.from_account === 'PIX') pix -= val;
            else cash -= val;

            if (t.to_account === 'PIX') pix += val;
            else cash += val;
        });

        ((adjustments.data || []) as unknown as AdjustmentRow[]).forEach((a) => {
            const val = Number(a.amount);
            const isPos = a.direction === 'POS';
            if (a.account === 'PIX') {
                pix = isPos ? pix + val : pix - val;
            } else {
                cash = isPos ? cash + val : cash - val;
            }
        });

        const { data: paidObs } = await fromTable('graduation_student_obligations')
            .select('amount')
            .eq('graduation_id', graduationId)
            .eq('kind', 'MENSALIDADE')
            .eq('status', 'PAGO');

        const totalPaidObligations = ((paidObs || []) as unknown as AmountRow[]).reduce((acc, curr) => acc + Number(curr.amount), 0);

        const totalEntriesTuition = ((entries.data || []) as unknown as EntryRow[])
            .filter((e) => e.entry_type === 'MENSALIDADE')
            .reduce((acc: number, curr) => acc + Number(curr.pix_amount) + Number(curr.cash_amount), 0);

        const totalWithTreasurer = totalPaidObligations - totalEntriesTuition;

        const { data: openObs } = await fromTable('graduation_student_obligations')
            .select('amount')
            .eq('graduation_id', graduationId)
            .eq('status', 'EM_ABERTO');

        const pendingIncome = ((openObs || []) as unknown as AmountRow[]).reduce((acc, curr) => acc + Number(curr.amount), 0);

        return {
            totalIncome: totalInc,
            totalExpenses: totalExp,
            balanceTotal: pix + cash,
            balancePix: pix,
            balanceCash: cash,
            pendingIncome: pendingIncome,
            totalWithTreasurer: Math.max(0, totalWithTreasurer)
        };
    },

    async getHistory(graduationId: string): Promise<FinancialTransaction[]> {
        const [entries, expenses, transfers, adjustments] = await Promise.all([
            fromTable('graduation_fin_entries').select('*').eq('graduation_id', graduationId),
            fromTable('graduation_fin_expenses').select('*').eq('graduation_id', graduationId),
            fromTable('graduation_fin_transfers').select('*').eq('graduation_id', graduationId),
            fromTable('graduation_fin_adjustments').select('*').eq('graduation_id', graduationId)
        ]);

        const history: FinancialTransaction[] = [];

        ((entries.data || []) as unknown as EntryRow[]).forEach((e) => history.push({
            id: e.id,
            date: e.date,
            type: 'ENTRADA',
            category: e.entry_type,
            description: e.notes || `Entrada ${e.entry_type}`,
            amount: Number(e.pix_amount) + Number(e.cash_amount),
            method: e.pix_amount > 0 && e.cash_amount > 0 ? 'MISTO' : e.pix_amount > 0 ? 'PIX' : 'ESPECIE'
        }));

        ((expenses.data || []) as unknown as ExpenseRow[]).forEach((e) => history.push({
            id: e.id,
            date: e.date,
            type: 'DESPESA',
            description: e.description,
            amount: Number(e.amount),
            method: e.method
        }));

        ((transfers.data || []) as unknown as TransferRow[]).forEach((e) => history.push({
            id: e.id,
            date: e.date,
            type: 'TRANSFERENCIA',
            description: `De ${e.from_account} para ${e.to_account}`,
            amount: Number(e.amount)
        }));

        ((adjustments.data || []) as unknown as AdjustmentRow[]).forEach((e) => history.push({
            id: e.id,
            date: e.date,
            type: 'AJUSTE',
            description: `Ajuste ${e.direction} em ${e.account}`,
            amount: Number(e.amount),
            account: e.account
        }));

        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    async getStudentObligations(studentId: string): Promise<StudentObligation[]> {
        const { data, error } = await fromTable('graduation_student_obligations')
            .select('*')
            .eq('student_id', studentId)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data as unknown as StudentObligation[];
    },

    async markObligationPaid(id: string, details: {
        paid_at: string;
        received_by: string;
        financial_responsible?: string;
        signature?: string;
    }): Promise<void> {
        const { error } = await fromTable('graduation_student_obligations')
            .update({
                status: 'PAGO',
                ...details
            })
            .eq('id', id);
        if (error) throw error;
    },

    async revertObligationToOpen(id: string): Promise<void> {
        const { error } = await fromTable('graduation_student_obligations')
            .update({
                status: 'EM_ABERTO',
                paid_at: null,
                received_by: null,
                financial_responsible: null,
                signature: null
            })
            .eq('id', id);
        if (error) throw error;
    },

    async batchMarkObligationsPaid(data: {
        student_ids: string[];
        class_id: string;
        reference_label: string;
        paid_at: string;
        received_by: string;
    }): Promise<number> {
        const { student_ids, class_id, reference_label, paid_at, received_by } = data;

        const { data: updated, error } = await fromTable('graduation_student_obligations')
            .update({
                status: 'PAGO',
                paid_at,
                received_by
            })
            .in('student_id', student_ids)
            .eq('class_id', class_id)
            .eq('reference_label', reference_label)
            .eq('status', 'EM_ABERTO')
            .select('id');

        if (error) throw error;
        return (updated as unknown as { id: string }[])?.length || 0;
    },

    async getOpenObligationLabels(classId: string): Promise<string[]> {
        const { data, error } = await fromTable('graduation_student_obligations')
            .select('reference_label')
            .eq('class_id', classId)
            .eq('status', 'EM_ABERTO');

        if (error) throw error;

        // Extract unique labels and filter nulls/empty
        const labels = Array.from(new Set(((data || []) as unknown as RefLabelRow[]).map((d) => d.reference_label)))
            .filter(Boolean) as string[];

        return labels.sort();
    }
};
