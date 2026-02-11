import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { format, addMonths, setDate } from "date-fns";

export type GraduationInstallmentStatus = 'EM_ABERTO' | 'PAGO' | 'ISENTO' | 'CANCELADO';
export type GraduationExtraType = 'RIFA' | 'BINGO' | 'ALIMENTOS' | 'EVENTO' | 'DOACAO' | 'OUTROS';
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];

export interface Graduation {
    id: string;
    name: string;
    year: number;
    active: boolean;
    created_at: string;
}

export interface GraduationClass {
    id: string;
    graduation_id: string;
    name: string;
    active: boolean;
    created_at: string;
}

export interface GraduationStudent {
    id: string;
    class_id: string;
    name: string;
    active: boolean;
    created_at: string;
}

export interface GraduationCarnetConfig {
    id: string;
    graduation_id: string;
    installment_value: number;
    installments_count: number;
    due_day: number;
    version: number;
    created_by?: string;
    created_at: string;
}

export interface GraduationInstallment {
    id: string;
    student_id: string;
    carnet_config_id: string;
    installment_number: number;
    value: number;
    due_date: string;
    status: GraduationInstallmentStatus;
    paid_at?: string;
    pay_method?: PaymentMethod;
    notes?: string;
    created_at: string;
}

export interface GraduationFinancialSummary {
    totalPaid: number;
    totalExtras: number;
    totalExpenses: number;
    totalTransfers: number;
    balanceInHand: number;
}

export const graduationService = {
    // Graduation & Classes
    async getGraduations(): Promise<Graduation[]> {
        const { data, error } = await supabase
            .from("graduations" as any)
            .select("*")
            .order("name");
        if (error) throw error;
        return data as unknown as Graduation[];
    },

    async getClasses(graduationId: string): Promise<GraduationClass[]> {
        const { data, error } = await supabase
            .from("graduation_classes" as any)
            .select("*")
            .eq("graduation_id", graduationId)
            .order("name");
        if (error) throw error;
        return data as unknown as GraduationClass[];
    },

    // Students
    async getStudentsByClass(classId: string): Promise<GraduationStudent[]> {
        const { data, error } = await supabase
            .from("graduation_class_students" as any)
            .select("*")
            .eq("class_id", classId)
            .order("name");
        if (error) throw error;
        return data as unknown as GraduationStudent[];
    },

    async createStudent(student: { class_id: string; name: string }): Promise<GraduationStudent> {
        const { data, error } = await supabase
            .from("graduation_class_students" as any)
            .insert(student)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as GraduationStudent;
    },

    async toggleStudentActivation(studentId: string, active: boolean): Promise<void> {
        const { error } = await supabase
            .from("graduation_class_students" as any)
            .update({ active })
            .eq("id", studentId);
        if (error) throw error;
    },

    // Carnet Config
    async getCurrentCarnetConfig(graduationId: string): Promise<GraduationCarnetConfig | null> {
        const { data, error } = await supabase
            .from("graduation_carnet_configs" as any)
            .select("*")
            .eq("graduation_id", graduationId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data as unknown as GraduationCarnetConfig;
    },

    async createCarnetConfig(config: Omit<GraduationCarnetConfig, 'id' | 'version' | 'created_at'>): Promise<GraduationCarnetConfig> {
        const current = await this.getCurrentCarnetConfig(config.graduation_id);
        const version = current ? current.version + 1 : 1;

        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from("graduation_carnet_configs" as any)
            .insert({ ...config, version, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;
        return data as unknown as GraduationCarnetConfig;
    },

    // Installments
    async getInstallments(studentId: string): Promise<GraduationInstallment[]> {
        const { data, error } = await supabase
            .from("graduation_installments" as any)
            .select("*")
            .eq("student_id", studentId)
            .order("installment_number");
        if (error) throw error;
        return data as unknown as GraduationInstallment[];
    },

    async generateCarnetForStudent(studentId: string): Promise<void> {
        // Find student and graduation
        const { data: student, error: studentError } = await supabase
            .from("graduation_class_students" as any)
            .select("*, graduation_classes(graduation_id)")
            .eq("id", studentId)
            .single();
        if (studentError) throw studentError;

        const graduationId = (student as any).graduation_classes.graduation_id;
        const config = await this.getCurrentCarnetConfig(graduationId);
        if (!config) throw new Error("Configuração de carnê não encontrada para esta formatura.");

        // Check if carnet already exists
        const { count, error: countError } = await supabase
            .from("graduation_installments" as any)
            .select("*", { count: "exact", head: true })
            .eq("student_id", studentId);
        if (countError) throw countError;
        if (count && count > 0) return; // Already generated

        // Generate installments
        const installments = [];
        const baseDate = new Date(2026, 0, 1); // Start of 2026

        for (let i = 1; i <= config.installments_count; i++) {
            const dueDate = setDate(addMonths(baseDate, i - 1), config.due_day);
            installments.push({
                student_id: studentId,
                carnet_config_id: config.id,
                installment_number: i,
                value: config.installment_value,
                due_date: format(dueDate, 'yyyy-MM-dd'),
                status: 'EM_ABERTO'
            });
        }

        const { error: insertError } = await supabase
            .from("graduation_installments" as any)
            .insert(installments);
        if (insertError) throw insertError;
    },

    async updateInstallmentStatus(
        installmentId: string,
        status: GraduationInstallmentStatus,
        params?: { paid_at?: string; pay_method?: PaymentMethod; notes?: string }
    ): Promise<void> {
        const updateData: any = { status };
        if (status === 'PAGO') {
            updateData.paid_at = params?.paid_at || new Date().toISOString();
            updateData.pay_method = params?.pay_method || 'cash';
        } else {
            updateData.paid_at = null;
            updateData.pay_method = null;
        }
        if (params?.notes !== undefined) updateData.notes = params.notes;

        const { error } = await supabase
            .from("graduation_installments" as any)
            .update(updateData)
            .eq("id", installmentId);
        if (error) throw error;
    },

    // Extras & Expenses & Transfers
    async registerTransfer(transfer: { graduation_id: string; value: number; pay_method: PaymentMethod; notes?: string }): Promise<void> {
        const summary = await this.getFinancialSummary(transfer.graduation_id);
        if (transfer.value > summary.balanceInHand) {
            throw new Error(`Saldo insuficiente: R$ ${summary.balanceInHand.toFixed(2)} disponível.`);
        }

        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from("graduation_transfers" as any)
            .insert({ ...transfer, created_by: user?.id });
        if (error) throw error;
    },

    async registerExtraIncome(income: { graduation_id: string; class_id?: string; type: GraduationExtraType; gross_value: number; costs: number; notes?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from("graduation_extra_incomes" as any)
            .insert({ ...income, created_by: user?.id });
        if (error) throw error;
    },

    async registerExpense(expense: { graduation_id: string; class_id?: string; description: string; value: number; pay_method: PaymentMethod; is_paid: boolean; notes?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from("graduation_expenses" as any)
            .insert({ ...expense, created_by: user?.id });
        if (error) throw error;
    },

    // Consolidated
    async getFinancialSummary(graduationId: string): Promise<GraduationFinancialSummary> {
        // Total Paid Installments
        const { data: installments, error: installmentsError } = await supabase
            .from("graduation_installments" as any)
            .select("value, graduation_class_students!inner(graduation_classes!inner(graduation_id))")
            .eq("status", "PAGO")
            .eq("graduation_class_students.graduation_classes.graduation_id", graduationId);

        if (installmentsError) throw installmentsError;
        const totalPaid = (installments as any[] || []).reduce((acc, curr) => acc + Number(curr.value), 0);

        // Total Extras
        const { data: extras, error: extrasError } = await supabase
            .from("graduation_extra_incomes" as any)
            .select("gross_value, costs")
            .eq("graduation_id", graduationId);

        if (extrasError) throw extrasError;
        const totalExtras = (extras as any[] || []).reduce((acc, curr) => acc + (Number(curr.gross_value) - Number(curr.costs)), 0);

        // Total Expenses Paid
        const { data: expenses, error: expensesError } = await supabase
            .from("graduation_expenses" as any)
            .select("value")
            .eq("graduation_id", graduationId)
            .eq("is_paid", true);

        if (expensesError) throw expensesError;
        const totalExpenses = (expenses as any[] || []).reduce((acc, curr) => acc + Number(curr.value), 0);

        // Total Transfers
        const { data: transfers, error: transfersError } = await supabase
            .from("graduation_transfers" as any)
            .select("value")
            .eq("graduation_id", graduationId);

        if (transfersError) throw transfersError;
        const totalTransfers = (transfers as any[] || []).reduce((acc, curr) => acc + Number(curr.value), 0);

        const balanceInHand = (totalPaid + totalExtras) - totalExpenses - totalTransfers;

        return {
            totalPaid,
            totalExtras,
            totalExpenses,
            totalTransfers,
            balanceInHand
        };
    }
};
