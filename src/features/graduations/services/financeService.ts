
import { supabase } from "@/integrations/supabase/client";
import {
    GraduationEntryType,
    GraduationPayMethod,
    GraduationFinancialCard,
    FinancialTransaction,
    StudentObligation
} from "@/features/graduations/services/types";

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
        const { error } = await supabase
            .from('graduation_fin_entries' as any)
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
        const { error } = await supabase
            .from('graduation_fin_expenses' as any)
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
        const { error } = await supabase
            .from('graduation_fin_transfers' as any)
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
        const { error } = await supabase
            .from('graduation_fin_adjustments' as any)
            .insert(data);
        if (error) throw error;
    },

    async getFinancialSummary(graduationId: string): Promise<GraduationFinancialCard> {
        const [entries, expenses, transfers, adjustments] = await Promise.all([
            supabase.from('graduation_fin_entries' as any).select('*').eq('graduation_id', graduationId),
            supabase.from('graduation_fin_expenses' as any).select('*').eq('graduation_id', graduationId),
            supabase.from('graduation_fin_transfers' as any).select('*').eq('graduation_id', graduationId),
            supabase.from('graduation_fin_adjustments' as any).select('*').eq('graduation_id', graduationId)
        ]);

        if (entries.error) throw entries.error;
        if (expenses.error) throw expenses.error;
        if (transfers.error) throw transfers.error;
        if (adjustments.error) throw adjustments.error;

        let pix = 0;
        let cash = 0;
        let totalExp = 0;
        let totalInc = 0;

        (entries.data || []).forEach((e: any) => {
            const p = Number(e.pix_amount || 0);
            const c = Number(e.cash_amount || 0);
            pix += p;
            cash += c;
            totalInc += (p + c);
        });

        (expenses.data || []).forEach((e: any) => {
            const val = Number(e.amount);
            totalExp += val;
            if (e.method === 'PIX') pix -= val;
            else cash -= val;
        });

        (transfers.data || []).forEach((t: any) => {
            const val = Number(t.amount);
            if (t.from_account === 'PIX') pix -= val;
            else cash -= val;

            if (t.to_account === 'PIX') pix += val;
            else cash += val;
        });

        (adjustments.data || []).forEach((a: any) => {
            const val = Number(a.amount);
            const isPos = a.direction === 'POS';
            if (a.account === 'PIX') {
                pix = isPos ? pix + val : pix - val;
            } else {
                cash = isPos ? cash + val : cash - val;
            }
        });

        const { data: paidObs } = await supabase
            .from('graduation_student_obligations' as any)
            .select('amount')
            .eq('graduation_id', graduationId)
            .eq('kind', 'MENSALIDADE')
            .eq('status', 'PAGO');

        const totalPaidObligations = (paidObs || []).reduce((acc: any, curr: any) => acc + Number(curr.amount), 0);

        const totalEntriesTuition = (entries.data || [])
            .filter((e: any) => e.entry_type === 'MENSALIDADE')
            .reduce((acc: number, curr: any) => acc + Number(curr.pix_amount) + Number(curr.cash_amount), 0);

        const totalWithTreasurer = totalPaidObligations - totalEntriesTuition;

        const { data: openObs } = await supabase
            .from('graduation_student_obligations' as any)
            .select('amount')
            .eq('graduation_id', graduationId)
            .eq('status', 'EM_ABERTO');

        const pendingIncome = (openObs || []).reduce((acc: any, curr: any) => acc + Number(curr.amount), 0);

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
            supabase.from('graduation_fin_entries' as any).select('*').eq('graduation_id', graduationId),
            supabase.from('graduation_fin_expenses' as any).select('*').eq('graduation_id', graduationId),
            supabase.from('graduation_fin_transfers' as any).select('*').eq('graduation_id', graduationId),
            supabase.from('graduation_fin_adjustments' as any).select('*').eq('graduation_id', graduationId)
        ]);

        const history: FinancialTransaction[] = [];

        (entries.data || []).forEach((e: any) => history.push({
            id: e.id,
            date: e.date,
            type: 'ENTRADA',
            category: e.entry_type,
            description: e.notes || `Entrada ${e.entry_type}`,
            amount: Number(e.pix_amount) + Number(e.cash_amount),
            method: e.pix_amount > 0 && e.cash_amount > 0 ? 'MISTO' : e.pix_amount > 0 ? 'PIX' : 'ESPECIE'
        }));

        (expenses.data || []).forEach((e: any) => history.push({
            id: e.id,
            date: e.date,
            type: 'DESPESA',
            description: e.description,
            amount: Number(e.amount),
            method: e.method
        }));

        (transfers.data || []).forEach((e: any) => history.push({
            id: e.id,
            date: e.date,
            type: 'TRANSFERENCIA',
            description: `De ${e.from_account} para ${e.to_account}`,
            amount: Number(e.amount)
        }));

        (adjustments.data || []).forEach((e: any) => history.push({
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
        const { data, error } = await supabase
            .from('graduation_student_obligations' as any)
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
        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .update({
                status: 'PAGO',
                ...details
            })
            .eq('id', id);
        if (error) throw error;
    },

    async revertObligationToOpen(id: string): Promise<void> {
        const { error } = await supabase
            .from('graduation_student_obligations' as any)
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

        const { data: updated, error } = await supabase
            .from('graduation_student_obligations' as any)
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
        return updated?.length || 0;
    },

    async getOpenObligationLabels(classId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('graduation_student_obligations' as any)
            .select('reference_label')
            .eq('class_id', classId)
            .eq('status', 'EM_ABERTO');

        if (error) throw error;

        // Extract unique labels and filter nulls/empty
        const labels = Array.from(new Set((data || []).map((d: any) => d.reference_label)))
            .filter(Boolean) as string[];

        return labels.sort();
    }
};
