import { supabase } from "@/integrations/supabase/client";

// --- Types ---

export type GraduationEntryType = 'MENSALIDADE' | 'RIFA' | 'BINGO' | 'VENDA' | 'DOACAO' | 'OUTROS';
export type GraduationPayMethod = 'PIX' | 'ESPECIE';
export type ObligationKind = 'MENSALIDADE' | 'RIFA' | 'BINGO' | 'VENDA' | 'DOACAO' | 'OUTROS';
export type ObligationStatus = 'EM_ABERTO' | 'PAGO';

export interface GraduationConfig {
    id: string;
    graduation_id: string;
    version: number;
    installment_value: number;
    installments_count: number;
    due_day: number;
    start_month: number;
    is_current: boolean;
}

export interface Graduation {
    id: string;
    name: string;
    reference_year: number;
    active: boolean;
    slug?: string;
}

export interface GraduationClass {
    id: string;
    graduation_id: string;
    name: string;
    active: boolean;
}

export interface GraduationStudent {
    id: string;
    class_id: string;
    full_name: string;
    active: boolean;
}

export interface GraduationFinancialCard {
    totalIncome: number;
    totalExpenses: number;
    balanceTotal: number;
    balancePix: number;
    balanceCash: number;
    pendingIncome: number;
    totalWithTreasurer: number;
}

export interface FinancialTransaction {
    id: string;
    date: string;
    type: 'ENTRADA' | 'DESPESA' | 'TRANSFERENCIA' | 'AJUSTE';
    category?: string; // For Entry/Expense
    description: string;
    amount: number;
    method?: string; // PIX/CASH
    account?: string; // For adjustment/transfer
}

export interface StudentObligation {
    id: string;
    student_id: string;
    kind: ObligationKind;
    reference_label: string;
    installment_number?: number;
    amount: number;
    due_date?: string;
    status: ObligationStatus;
    paid_at?: string;
    received_by?: string;
    financial_responsible?: string;
    signature?: string;
}

// --- Service ---

export const graduationModuleService = {

    // --- Graduations ---

    async listGraduations(): Promise<Graduation[]> {
        const { data, error } = await supabase
            .from('graduations')
            .select('*')
            .eq('active', true)
            .order('reference_year', { ascending: false });

        if (error) throw error;
        return data as unknown as Graduation[];
    },

    async getGraduationBySlug(slug: string): Promise<Graduation> {
        const { data, error } = await supabase
            .from('graduations')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) throw error;
        return data as unknown as Graduation;
    },

    async createGraduation(name: string, reference_year: number): Promise<Graduation> {
        // Simple slug generation: name-year (e.g. "formatura-3-ano-2026")
        const slug = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}-${reference_year}`.replace(/^-+|-+$/g, '');

        const { data, error } = await supabase
            .from('graduations')
            .insert({ name, reference_year, active: true, slug })
            .select()
            .single();

        if (error) throw error;
        return data as unknown as Graduation;
    },

    async updateGraduation(id: string, updates: Partial<Graduation>): Promise<void> {
        const { error } = await supabase
            .from('graduations')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async softDeleteGraduation(id: string): Promise<void> {
        const { error } = await supabase
            .from('graduations')
            .update({ active: false })
            .eq('id', id);
        if (error) throw error;
    },

    // --- Classes ---

    async listClasses(graduationId: string): Promise<GraduationClass[]> {
        const { data, error } = await supabase
            .from('graduation_classes')
            .select('*')
            .eq('graduation_id', graduationId)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data as unknown as GraduationClass[];
    },

    async createClass(graduationId: string, name: string): Promise<GraduationClass> {
        const { data, error } = await supabase
            .from('graduation_classes')
            .insert({ graduation_id: graduationId, name, active: true })
            .select()
            .single();

        if (error) throw error;
        return data as unknown as GraduationClass;
    },

    // --- Students ---

    async listStudents(classId: string): Promise<GraduationStudent[]> {
        const { data, error } = await supabase
            .from('graduation_class_students' as any)
            .select('id, class_id, full_name:name, active')
            .eq('class_id', classId)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return (data as any[]).map(d => ({
            id: d.id,
            class_id: d.class_id,
            full_name: d.full_name,
            active: d.active
        }));
    },

    async getStudentsProgress(classId: string): Promise<Record<string, { paid: number; total: number }>> {
        const { data, error } = await supabase
            .from('graduation_student_obligations' as any)
            .select('student_id, status')
            .eq('class_id', classId)
            .eq('kind', 'MENSALIDADE');

        if (error) throw error;

        const progress: Record<string, { paid: number; total: number }> = {};
        (data || []).forEach((obs: any) => {
            if (!progress[obs.student_id]) {
                progress[obs.student_id] = { paid: 0, total: 0 };
            }
            progress[obs.student_id].total++;
            if (obs.status === 'PAGO') {
                progress[obs.student_id].paid++;
            }
        });
        return progress;
    },


    async createStudent(classId: string, fullName: string): Promise<GraduationStudent> {
        const { data, error } = await supabase
            .from('graduation_class_students' as any)
            .insert({ class_id: classId, name: fullName, active: true })
            .select()
            .single();

        if (error) throw error;
        return {
            id: (data as any).id,
            class_id: (data as any).class_id,
            full_name: (data as any).name,
            active: (data as any).active
        };
    },

    // --- Configs ---

    async getCurrentConfig(graduationId: string): Promise<GraduationConfig | null> {
        const { data, error } = await supabase
            .from('graduation_configs' as any)
            .select('*')
            .eq('graduation_id', graduationId)
            .eq('is_current', true)
            .maybeSingle();

        if (error) throw error;
        return data as unknown as GraduationConfig;
    },

    async createNewConfigVersion(graduationId: string, config: Omit<GraduationConfig, 'id' | 'graduation_id' | 'version' | 'is_current'>): Promise<void> {
        const { data: maxVer } = await supabase
            .from('graduation_configs' as any)
            .select('version')
            .eq('graduation_id', graduationId)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();

        const newVersion = (maxVer?.version || 0) + 1;

        await supabase
            .from('graduation_configs' as any)
            .update({ is_current: false })
            .eq('graduation_id', graduationId);

        const { error } = await supabase
            .from('graduation_configs' as any)
            .insert({
                graduation_id: graduationId,
                version: newVersion,
                is_current: true,
                ...config
            });

        if (error) throw error;
    },

    // --- Finance Logic ---

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

    // --- Obligations & Carnets ---

    async getStudentObligations(studentId: string): Promise<StudentObligation[]> {
        const { data, error } = await supabase
            .from('graduation_student_obligations' as any)
            .select('*')
            .eq('student_id', studentId)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data as unknown as StudentObligation[];
    },

    async generateInstallmentsBatch(classId: string): Promise<void> {
        const resultCls = await supabase.from('graduation_classes' as any).select('graduation_id').eq('id', classId).single();
        const cls = resultCls.data as any;

        if (!cls) throw new Error("Turma não encontrada");

        const config = await this.getCurrentConfig(cls.graduation_id);
        if (!config) throw new Error("Nenhuma configuração vigente encontrada para esta formatura");

        const students = await this.listStudents(classId);

        const obligationsToInsert: any[] = [];
        const resultGrad = await supabase.from('graduations' as any).select('reference_year').eq('id', cls.graduation_id).single();
        const baseYear = (resultGrad.data as any)?.reference_year || 2026;

        for (const student of students) {
            for (let i = 1; i <= config.installments_count; i++) {
                const monthIndex = (config.start_month - 1) + (i - 1);
                const dueDate = new Date(baseYear, monthIndex, config.due_day);

                obligationsToInsert.push({
                    graduation_id: cls.graduation_id,
                    class_id: classId,
                    student_id: student.id,
                    kind: 'MENSALIDADE',
                    reference_label: `Parcela ${i.toString().padStart(2, '0')}/${config.installments_count}`,
                    installment_number: i,
                    amount: config.installment_value,
                    due_date: dueDate.toISOString().split('T')[0],
                    status: 'EM_ABERTO'
                });
            }
        }

        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .upsert(obligationsToInsert, {
                onConflict: 'student_id, kind, installment_number',
                ignoreDuplicates: true
            });

        if (error) throw error;
    },

    async createChargeBatch(data: {
        graduation_id: string;
        class_id: string;
        student_ids: string[];
        kind: ObligationKind;
        reference_label: string;
        amount: number;
        due_date?: string;
    }): Promise<void> {
        const payload = data.student_ids.map(sid => ({
            graduation_id: data.graduation_id,
            class_id: data.class_id,
            student_id: sid,
            kind: data.kind,
            reference_label: data.reference_label,
            amount: data.amount,
            due_date: data.due_date,
            status: 'EM_ABERTO'
        }));

        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .insert(payload);

        if (error) throw error;
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
    }
};
