
import { supabase } from "@/integrations/supabase/client";
import ExcelJS from "exceljs";
import { GraduationClass, ObligationKind } from "@/features/graduations/services/types";
import { graduationService } from "@/features/graduations/services/graduationService";
import { formatDateString } from "@/shared/lib/date-utils";
import { studentService } from "@/features/graduations/services/studentService";

export const classService = {
    async listClasses(graduationId: string): Promise<GraduationClass[]> {
        const { data, error } = await supabase
            .from('graduation_classes' as any)
            .select('*')
            .eq('graduation_id', graduationId)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return data as unknown as GraduationClass[];
    },

    async createClass(graduationId: string, name: string): Promise<GraduationClass> {
        const slug = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '');

        const { data, error } = await supabase
            .from('graduation_classes' as any)
            .upsert({ graduation_id: graduationId, name, active: true, slug }, { onConflict: 'graduation_id, slug' })
            .select()
            .single();

        if (error) throw error;
        return data as unknown as GraduationClass;
    },

    async updateClass(id: string, name: string): Promise<void> {
        const slug = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`.replace(/^-+|-+$/g, '');

        const { error } = await supabase
            .from('graduation_classes' as any)
            .update({ name, slug })
            .eq('id', id);
        if (error) throw error;
    },

    async softDeleteClass(id: string): Promise<void> {
        const { error } = await supabase
            .from('graduation_classes' as any)
            .update({ active: false })
            .eq('id', id);
        if (error) throw error;
    },

    async getClassBySlug(graduationId: string, slug: string): Promise<GraduationClass> {
        const { data, error } = await supabase
            .from('graduation_classes' as any)
            .select('*')
            .eq('graduation_id', graduationId)
            .eq('slug', slug)
            .maybeSingle();

        if (error) throw error;
        if (data) return data as unknown as GraduationClass;

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
            const { data: dataId, error: errorId } = await supabase
                .from('graduation_classes' as any)
                .select('*')
                .eq('graduation_id', graduationId)
                .eq('id', slug)
                .maybeSingle();

            if (errorId) throw errorId;
            if (dataId) return dataId as unknown as GraduationClass;
        }

        throw new Error("Turma não encontrada");
    },

    async generateInstallmentsForStudent(studentId: string): Promise<void> {
        const { data: student, error: stError } = await supabase
            .from('graduation_class_students' as any)
            .select('class_id')
            .eq('id', studentId)
            .single();

        if (stError) throw stError;
        const classId = (student as any).class_id;

        const resultCls = await supabase.from('graduation_classes' as any).select('graduation_id').eq('id', classId).single();
        const cls = resultCls.data as any;

        if (!cls) throw new Error("Turma não encontrada");

        const config = await graduationService.getCurrentConfig(cls.graduation_id);
        if (!config) throw new Error("Nenhuma configuração vigente encontrada");

        const resultGrad = await supabase.from('graduations' as any).select('year').eq('id', cls.graduation_id).single();
        const baseYear = (resultGrad.data as any)?.year || 2026;

        const obligationsToInsert: any[] = [];
        for (let i = 1; i <= config.installments_count; i++) {
            const monthIndex = (config.start_month - 1) + (i - 1);
            const dueDate = new Date(baseYear, monthIndex, config.due_day);

            obligationsToInsert.push({
                graduation_id: cls.graduation_id,
                class_id: classId,
                student_id: studentId,
                kind: 'MENSALIDADE',
                reference_label: `Parcela ${i.toString().padStart(2, '0')}/${config.installments_count}`,
                installment_number: i,
                amount: config.installment_value,
                due_date: formatDateString(dueDate),
                status: 'EM_ABERTO'
            });
        }

        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .upsert(obligationsToInsert, {
                onConflict: 'student_id, kind, installment_number',
                ignoreDuplicates: true
            });

        if (error) throw error;
    },

    async importStudentsFromExcel(classId: string, file: File): Promise<{ count: number, installmentsCount: number, errors: string[] }> {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet(1);
        const rows: { name: string; guardian?: string }[] = [];

        if (worksheet) {
            worksheet.eachRow((row, rowNumber) => {
                const col1 = row.getCell(1).value;
                const col2 = row.getCell(2).value;
                const name = typeof col1 === 'string' ? col1.trim() : '';
                const guardian = typeof col2 === 'string' ? col2.trim() : undefined;

                if (name && rowNumber > 1) {
                    rows.push({ name, guardian });
                } else if (name && rowNumber === 1 && !name.toLowerCase().includes('nome')) {
                    rows.push({ name, guardian });
                }
            });
        }

        if (rows.length === 0) throw new Error("Nenhum nome encontrado na primeira coluna.");

        let count = 0;
        let installmentsCount = 0;
        const errors: string[] = [];

        for (const { name, guardian } of rows) {
            try {
                const student = await studentService.createStudent(classId, name, guardian);
                count++;
                try {
                    await this.generateInstallmentsForStudent(student.id);
                    installmentsCount++;
                } catch (installErr: any) {
                    console.warn(`Erro ao gerar carnê para ${name}:`, installErr);
                }
            } catch (err: any) {
                console.error(`Erro ao importar ${name}:`, err);
                errors.push(`Falha ao importar ${name}: ${err.message}`);
            }
        }

        return { count, installmentsCount, errors };
    },

    async generateInstallmentsBatch(classId: string): Promise<void> {
        const resultCls = await supabase.from('graduation_classes' as any).select('graduation_id').eq('id', classId).single();
        const cls = resultCls.data as any;

        if (!cls) throw new Error("Turma não encontrada");

        const config = await graduationService.getCurrentConfig(cls.graduation_id);
        if (!config) throw new Error("Nenhuma configuração vigente encontrada para esta formatura");

        const students = await studentService.listStudents(classId);
        const resultGrad = await supabase.from('graduations' as any).select('year').eq('id', cls.graduation_id).single();
        const baseYear = (resultGrad.data as any)?.year || 2026;

        const obligationsToInsert: any[] = [];

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
                    due_date: formatDateString(dueDate),
                    status: 'EM_ABERTO'
                });
            }
        }

        if (obligationsToInsert.length === 0) return;

        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .upsert(obligationsToInsert, {
                onConflict: 'student_id,kind,installment_number',
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
            .upsert(payload, {
                onConflict: 'student_id,kind,reference_label',
                ignoreDuplicates: true
            });

        if (error) throw error;
    },

    async generateInstallmentsForGraduation(graduationId: string): Promise<void> {
        // 1. Get current config
        const config = await graduationService.getCurrentConfig(graduationId);
        if (!config) throw new Error("Nenhuma configuração vigente encontrada para esta formatura");

        // 2. Get all classes for this graduation
        const { data: classes, error: clsError } = await supabase
            .from('graduation_classes' as any)
            .select('id')
            .eq('graduation_id', graduationId)
            .eq('active', true);

        if (clsError) throw clsError;
        const classIds = (classes as any[] || []).map(c => c.id);
        if (classIds.length === 0) return;

        // 3. Get all active students in these classes
        const { data: students, error: stError } = await supabase
            .from('graduation_class_students' as any)
            .select('id, class_id')
            .eq('active', true)
            .in('class_id', classIds);

        if (stError) throw stError;
        if (!students || (students as any[]).length === 0) return;

        // 4. WIPE existing installments of type MENSALIDADE
        const { error: delError } = await supabase
            .from('graduation_student_obligations' as any)
            .delete()
            .eq('graduation_id', graduationId)
            .eq('kind', 'MENSALIDADE' as any);

        if (delError) throw delError;

        // 5. Generate new instalments
        const resultGrad = await supabase.from('graduations' as any).select('year').eq('id', graduationId).single();
        const baseYear = (resultGrad.data as any)?.year || 2026;

        const obligationsToInsert: any[] = [];

        for (const student of (students as any[])) {
            for (let i = 1; i <= config.installments_count; i++) {
                const monthIndex = (config.start_month - 1) + (i - 1);
                const dueDate = new Date(baseYear, monthIndex, config.due_day);

                obligationsToInsert.push({
                    graduation_id: graduationId,
                    class_id: (student as any).class_id,
                    student_id: (student as any).id,
                    kind: 'MENSALIDADE',
                    reference_label: `Parcela ${i.toString().padStart(2, '0')}/${config.installments_count}`,
                    installment_number: i,
                    amount: config.installment_value,
                    due_date: formatDateString(dueDate),
                    status: 'EM_ABERTO'
                });
            }
        }

        if (obligationsToInsert.length === 0) return;

        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .insert(obligationsToInsert);

        if (error) throw error;
    },

    async createGlobalChargeBatch(data: {
        graduation_id: string;
        kind: ObligationKind;
        reference_label: string;
        amount: number;
        due_date?: string;
    }): Promise<number> {
        // 1. Get all students from all classes of this graduation
        const { data: students, error: studentsError } = await supabase
            .from('graduation_class_students' as any)
            .select('id, class_id')
            .eq('graduation_id', data.graduation_id)
            .eq('status', 'ATIVO');

        if (studentsError) throw studentsError;
        if (!students || students.length === 0) return 0;

        // 2. Map to obligations
        const payload = (students as any[]).map(s => ({
            graduation_id: data.graduation_id,
            class_id: s.class_id,
            student_id: s.id,
            kind: data.kind,
            reference_label: data.reference_label,
            amount: data.amount,
            due_date: data.due_date,
            status: 'EM_ABERTO'
        }));

        // 3. Insert and return count
        const { error } = await supabase
            .from('graduation_student_obligations' as any)
            .upsert(payload, {
                onConflict: 'student_id,kind,reference_label',
                ignoreDuplicates: true
            });

        if (error) throw error;
        return payload.length;
    }
};
