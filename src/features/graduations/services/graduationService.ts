import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { format, addMonths, setDate } from "date-fns";
import ExcelJS from "exceljs";

export type GraduationInstallmentStatus = 'EM_ABERTO' | 'PAGO' | 'ISENTO' | 'CANCELADO';
export type GraduationExtraType = 'RIFA' | 'BINGO' | 'ALIMENTOS' | 'EVENTO' | 'DOACAO' | 'OUTROS';
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type GraduationTreasuryType = 'RECEBIMENTO_TURMA' | 'DESPESA' | 'REPASSE_ASSOCIACAO' | 'MOVIMENTACAO_INTERNA' | 'AJUSTE';
export type GraduationMoneyLocation = 'CONTA' | 'ESPECIE';

export interface GraduationTreasuryEntry {
    id: string;
    graduation_id: string;
    class_id?: string;
    type: GraduationTreasuryType;
    location: GraduationMoneyLocation;
    date: string;
    value: number;
    notes?: string;
    created_by?: string;
    created_at: string;
}

export interface Graduation {
    id: string;
    name: string;
    year: number;
    active: boolean;
    slug: string;
    created_at: string;
}

export interface GraduationClass {
    id: string;
    graduation_id: string;
    name: string;
    active: boolean;
    slug: string;
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
    start_month: number;
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
    totalPaid: number;      // Total arrecadado pelos alunos (com tesoureiros de turma)
    totalExtras: number;    // Arrecadações extras
    totalExpenses: number;  // Despesas pagas
    balanceInHand: number;  // Saldo Total Estimado

    // Visão do Custodiante (Tesouraria Central)
    treasuryBalance: number;    // Total em posse do custodiante
    treasuryBank: number;       // Saldo em Conta/Pix
    treasuryCash: number;       // Saldo em Dinheiro físico
    pendingFromClasses: number; // Saldo que ainda está com os tesoureiros de turma
}

// Helper para tabelas fora do schema gerado pelo Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => supabase.from(table as any);

// Interfaces auxiliares para rows intermediários
interface IdRow { id: string }
interface ClassIdRow { class_id: string }
interface ValueRow { value: number }
interface GrossValueCostsRow { gross_value: number; costs: number }
interface TreasuryRow { type: GraduationTreasuryType; location: GraduationMoneyLocation; value: number }

interface InstallmentUpdateData {
    status: GraduationInstallmentStatus;
    paid_at?: string | null;
    pay_method?: PaymentMethod | null;
    notes?: string;
}

export const graduationService = {
    // Graduation & Classes
    async getGraduations(): Promise<Graduation[]> {
        const { data, error } = await fromTable("graduations")
            .select("*")
            .eq('active', true)
            .order("name");
        if (error) throw error;
        return data as unknown as Graduation[];
    },

    async listGraduations(): Promise<Graduation[]> {
        return this.getGraduations();
    },

    async createGraduation(name: string, year: number): Promise<Graduation> {
        const slug = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '');
        const { data, error } = await fromTable('graduations')
            .insert({ name, year, active: true, slug })
            .select()
            .single();

        if (error) throw error;
        return data as unknown as Graduation;
    },

    async updateGraduation(id: string, updates: Partial<Graduation>): Promise<void> {
        if (updates.name) {
            updates.slug = `${updates.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '');
        }

        const { error } = await fromTable('graduations')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async softDeleteGraduation(id: string): Promise<void> {
        const { error } = await fromTable('graduations')
            .update({ active: false })
            .eq('id', id);
        if (error) throw error;
    },

    async getGraduationBySlug(slug: string): Promise<Graduation> {
        const { data, error } = await fromTable("graduations")
            .select("*")
            .eq("slug", slug)
            .single();
        if (error) throw error;
        return data as unknown as Graduation;
    },

    async getClasses(graduationId: string): Promise<GraduationClass[]> {
        const { data, error } = await fromTable("graduation_classes")
            .select("*")
            .eq("graduation_id", graduationId)
            .order("name");
        if (error) throw error;
        return data as unknown as GraduationClass[];
    },

    async getClassBySlug(graduationId: string, slug: string): Promise<GraduationClass> {
        const { data, error } = await fromTable("graduation_classes")
            .select("*")
            .eq("graduation_id", graduationId)
            .eq("slug", slug)
            .single();
        if (error) throw error;
        return data as unknown as GraduationClass;
    },

    // Students
    async getStudentsByClass(classId: string): Promise<GraduationStudent[]> {
        const { data, error } = await fromTable("graduation_class_students")
            .select("*")
            .eq("class_id", classId)
            .order("name");
        if (error) throw error;
        return data as unknown as GraduationStudent[];
    },

    async createStudent(student: { class_id: string; name: string }): Promise<GraduationStudent> {
        const { data, error } = await fromTable("graduation_class_students")
            .insert(student)
            .select()
            .single();
        if (error) throw error;
        return data as unknown as GraduationStudent;
    },

    async toggleStudentActivation(studentId: string, active: boolean): Promise<void> {
        const { error } = await fromTable("graduation_class_students")
            .update({ active })
            .eq("id", studentId);
        if (error) throw error;
    },

    // Carnet Config
    async getCurrentCarnetConfig(graduationId: string): Promise<GraduationCarnetConfig | null> {
        const { data, error } = await fromTable("graduation_carnet_configs")
            .select("*")
            .eq("graduation_id", graduationId)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data as unknown as GraduationCarnetConfig;
    },

    async getCurrentConfig(graduationId: string): Promise<GraduationCarnetConfig | null> {
        return this.getCurrentCarnetConfig(graduationId);
    },

    async createCarnetConfig(config: Omit<GraduationCarnetConfig, 'id' | 'version' | 'created_at'>): Promise<GraduationCarnetConfig> {
        const current = await this.getCurrentCarnetConfig(config.graduation_id);
        const version = current ? current.version + 1 : 1;

        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await fromTable("graduation_carnet_configs")
            .insert({ ...config, version, created_by: user?.id })
            .select()
            .single();

        if (error) throw error;
        return data as unknown as GraduationCarnetConfig;
    },

    async createNewConfigVersion(graduationId: string, config: Omit<GraduationCarnetConfig, 'id' | 'version' | 'created_at' | 'graduation_id'>): Promise<GraduationCarnetConfig> {
        return this.createCarnetConfig({ ...config, graduation_id: graduationId });
    },

    // Installments
    async getInstallments(studentId: string): Promise<GraduationInstallment[]> {
        const { data, error } = await fromTable("graduation_installments")
            .select("*")
            .eq("student_id", studentId)
            .order("installment_number");
        if (error) throw error;
        return data as unknown as GraduationInstallment[];
    },

    async generateCarnetForStudent(studentId: string): Promise<void> {
        // 1. Find student
        const { data: student, error: studentError } = await fromTable("graduation_class_students")
            .select("class_id")
            .eq("id", studentId)
            .single();
        if (studentError) throw studentError;

        // 2. Find graduation from class
        const studentRow = student as unknown as ClassIdRow;
        const { data: classData, error: classError } = await fromTable("graduation_classes")
            .select("graduation_id")
            .eq("id", studentRow.class_id)
            .single();
        if (classError) throw classError;

        const graduationId = (classData as unknown as { graduation_id: string }).graduation_id;
        const config = await this.getCurrentCarnetConfig(graduationId);
        if (!config) throw new Error("Configuração de carnê não encontrada para esta formatura.");

        // Check if carnet already exists
        const { count, error: countError } = await fromTable("graduation_installments")
            .select("*", { count: "exact", head: true })
            .eq("student_id", studentId);
        if (countError) throw countError;
        if (count && count > 0) return; // Already generated

        // Generate installments
        const { data: gradData } = await fromTable("graduations").select("year").eq("id", graduationId).single();
        const baseYear = (gradData as any)?.year || 2026;
        const installments = [];

        for (let i = 1; i <= config.installments_count; i++) {
            const monthIndex = (config.start_month - 1) + (i - 1);
            const dueDate = new Date(baseYear, monthIndex, config.due_day);

            installments.push({
                student_id: studentId,
                carnet_config_id: config.id,
                installment_number: i,
                value: config.installment_value,
                due_date: format(dueDate, 'yyyy-MM-dd'),
                status: 'EM_ABERTO'
            });
        }

        const { error: insertError } = await fromTable("graduation_installments")
            .insert(installments);
        if (insertError) throw insertError;
    },

    async updateInstallmentStatus(
        installmentId: string,
        status: GraduationInstallmentStatus,
        params?: { paid_at?: string; pay_method?: PaymentMethod; notes?: string }
    ): Promise<void> {
        const updateData: InstallmentUpdateData = { status };
        if (status === 'PAGO') {
            updateData.paid_at = params?.paid_at || new Date().toISOString();
            updateData.pay_method = params?.pay_method || 'cash';
        } else {
            updateData.paid_at = null;
            updateData.pay_method = null;
        }
        if (params?.notes !== undefined) updateData.notes = params.notes;

        const { error } = await fromTable("graduation_installments")
            .update(updateData)
            .eq("id", installmentId);
        if (error) throw error;
    },

    async bulkUpdateInstallmentStatus(
        classId: string,
        installmentNumber: number,
        status: GraduationInstallmentStatus
    ): Promise<void> {
        // 1. Get all student IDs for the class
        const students = await this.getStudentsByClass(classId);
        const studentIds = students.map(s => s.id);

        if (studentIds.length === 0) return;

        const updateData: InstallmentUpdateData = { status };
        if (status === 'PAGO') {
            updateData.paid_at = new Date().toISOString();
            updateData.pay_method = 'cash';
        } else {
            updateData.paid_at = null;
            updateData.pay_method = null;
        }

        const { error } = await fromTable("graduation_installments")
            .update(updateData)
            .in("student_id", studentIds)
            .eq("installment_number", installmentNumber);

        if (error) throw error;
    },

    // Extras & Expenses & Transfers


    async registerExtraIncome(income: { graduation_id: string; class_id?: string; type: GraduationExtraType; gross_value: number; costs: number; notes?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await fromTable("graduation_extra_incomes")
            .insert({ ...income, created_by: user?.id });
        if (error) throw error;
    },

    async registerExpense(expense: { graduation_id: string; class_id?: string; description: string; value: number; pay_method: PaymentMethod; is_paid: boolean; notes?: string }): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await fromTable("graduation_expenses")
            .insert({ ...expense, created_by: user?.id });
        if (error) throw error;
    },

    // Consolidated
    async getFinancialSummary(graduationId: string): Promise<GraduationFinancialSummary> {
        // 1. Get all class IDs for this graduation
        const { data: classes, error: classesError } = await fromTable("graduation_classes")
            .select("id")
            .eq("graduation_id", graduationId);

        if (classesError) throw classesError;
        const classIds = ((classes as unknown as IdRow[]) || []).map(c => c.id);

        if (classIds.length === 0) {
            return {
                totalPaid: 0, totalExtras: 0, totalExpenses: 0, balanceInHand: 0,
                treasuryBalance: 0, treasuryBank: 0, treasuryCash: 0, pendingFromClasses: 0
            };
        }

        // 2. Get all student IDs for these classes
        const { data: students, error: studentsError } = await fromTable("graduation_class_students")
            .select("id")
            .in("class_id", classIds);

        if (studentsError) throw studentsError;
        const studentIds = ((students as unknown as IdRow[]) || []).map(s => s.id);

        if (studentIds.length === 0) {
            return {
                totalPaid: 0, totalExtras: 0, totalExpenses: 0, balanceInHand: 0,
                treasuryBalance: 0, treasuryBank: 0, treasuryCash: 0, pendingFromClasses: 0
            };
        }

        // 3. Get total paid installments for these students
        const { data: installments, error: installmentsError } = await fromTable("graduation_installments")
            .select("value")
            .eq("status", "PAGO")
            .in("student_id", studentIds);

        if (installmentsError) throw installmentsError;
        const totalPaid = ((installments as unknown as ValueRow[]) || []).reduce((acc, curr) => acc + Number(curr.value), 0);

        // Total Extras
        const { data: extras, error: extrasError } = await fromTable("graduation_extra_incomes")
            .select("gross_value, costs")
            .eq("graduation_id", graduationId);

        if (extrasError) throw extrasError;
        const totalExtras = ((extras as unknown as GrossValueCostsRow[]) || []).reduce((acc, curr) => acc + (Number(curr.gross_value) - Number(curr.costs)), 0);

        // Total Expenses Paid
        const { data: expenses, error: expensesError } = await fromTable("graduation_expenses")
            .select("value")
            .eq("graduation_id", graduationId)
            .eq("is_paid", true);

        if (expensesError) throw expensesError;
        const totalExpenses = ((expenses as unknown as ValueRow[]) || []).reduce((acc, curr) => acc + Number(curr.value), 0);



        // Treasury Summary (Custodian)
        const { data: treasuryEntries, error: treasuryError } = await fromTable("graduation_treasury_entries")
            .select("type, location, value")
            .eq("graduation_id", graduationId);

        if (treasuryError) throw treasuryError;

        let treasuryBank = 0;
        let treasuryCash = 0;
        let totalReceivedByCustodian = 0;

        ((treasuryEntries as unknown as TreasuryRow[]) || []).forEach(entry => {
            const val = Number(entry.value);
            if (entry.location === 'CONTA') treasuryBank += val;
            if (entry.location === 'ESPECIE') treasuryCash += val;
            if (entry.type === 'RECEBIMENTO_TURMA') totalReceivedByCustodian += val;
        });

        const treasuryBalance = treasuryBank + treasuryCash;
        const pendingFromClasses = totalPaid - totalReceivedByCustodian;
        const balanceInHand = (totalPaid + totalExtras) - totalExpenses;

        return {
            totalPaid,
            totalExtras,
            totalExpenses,
            balanceInHand,
            treasuryBalance,
            treasuryBank,
            treasuryCash,
            pendingFromClasses
        };
    },

    async registerTreasuryEntry(entry: Omit<GraduationTreasuryEntry, 'id' | 'created_at'>): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await fromTable("graduation_treasury_entries")
            .insert({ ...entry, created_by: user?.id });
        if (error) throw error;
    },

    async getTreasuryEntries(graduationId: string): Promise<GraduationTreasuryEntry[]> {
        const { data, error } = await fromTable("graduation_treasury_entries")
            .select("*")
            .eq("graduation_id", graduationId)
            .order("date", { ascending: false });
        if (error) throw error;
        return data as unknown as GraduationTreasuryEntry[];
    },

    async importStudentsFromExcel(classId: string, file: File): Promise<{ count: number }> {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet(1);
        const names: string[] = [];

        if (worksheet) {
            worksheet.eachRow((row, rowNumber) => {
                // Skip header if it looks like one (optional, but let's assume names are in column 1)
                const value = row.getCell(1).value;
                if (value && typeof value === 'string' && rowNumber > 1) {
                    names.push(value.trim());
                } else if (value && typeof value === 'string' && rowNumber === 1 && !value.toLowerCase().includes('nome')) {
                    // If row 1 is not a header "Nome", include it
                    names.push(value.trim());
                }
            });
        }

        if (names.length === 0) throw new Error("Nenhum nome de aluno encontrado na primeira coluna do Excel.");

        let count = 0;
        for (const name of names) {
            try {
                const student = await this.createStudent({ class_id: classId, name });
                await this.generateCarnetForStudent(student.id);
                count++;
            } catch (err) {
                console.error(`Erro ao importar ${name}:`, err);
            }
        }

        return { count };
    }
};
