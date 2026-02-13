
import { supabase } from "@/integrations/supabase/client";
import { GraduationStudent } from "@/features/graduations/services/types";
import { formatDateString } from "@/shared/lib/date-utils";

// Helper para tabelas fora do schema gerado pelo Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => supabase.from(table as any);

// Interfaces auxiliares para rows intermediários
interface StudentDbRow {
    id: string;
    class_id: string;
    full_name: string;
    guardian_name?: string;
    active: boolean;
}

interface ObligationRow {
    student_id: string;
    status: string;
    due_date: string;
    kind: string;
}

interface RawStudentRow {
    id: string;
    class_id: string;
    name: string;
    guardian_name?: string;
    active: boolean;
}

export const studentService = {
    async listStudents(classId: string): Promise<GraduationStudent[]> {
        const { data, error } = await fromTable('graduation_class_students')
            .select('id, class_id, full_name:name, guardian_name, active')
            .eq('class_id', classId)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return ((data as unknown as StudentDbRow[]) || []).map(d => ({
            id: d.id,
            class_id: d.class_id,
            full_name: d.full_name,
            guardian_name: d.guardian_name || undefined,
            active: d.active
        }));
    },

    async getStudentsProgress(classId: string): Promise<Record<string, { paid: number; total: number; hasOverdue: boolean }>> {
        const { data, error } = await fromTable('graduation_student_obligations')
            .select('student_id, status, due_date, kind')
            .eq('class_id', classId);

        if (error) throw error;

        const progress: Record<string, { paid: number; total: number; hasOverdue: boolean }> = {};
        const today = formatDateString(new Date());

        ((data || []) as unknown as ObligationRow[]).forEach((obs) => {
            if (!progress[obs.student_id]) {
                progress[obs.student_id] = { paid: 0, total: 0, hasOverdue: false };
            }

            if (obs.kind === 'MENSALIDADE') {
                progress[obs.student_id].total++;
                if (obs.status === 'PAGO') {
                    progress[obs.student_id].paid++;
                }
            }

            // Check for overdue (any kind)
            if (obs.status === 'PENDENTE' && obs.due_date && obs.due_date < today) {
                progress[obs.student_id].hasOverdue = true;
            }
        });
        return progress;
    },

    async createStudent(classId: string, fullName: string, guardianName?: string): Promise<GraduationStudent> {
        const insertData: Record<string, unknown> = { class_id: classId, name: fullName, active: true };
        if (guardianName) insertData.guardian_name = guardianName;

        const { data, error } = await fromTable('graduation_class_students')
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        const row = data as unknown as RawStudentRow;
        return {
            id: row.id,
            class_id: row.class_id,
            full_name: row.name,
            guardian_name: row.guardian_name || undefined,
            active: row.active
        };
    },

    async inactivateStudent(studentId: string): Promise<void> {
        const { error } = await fromTable('graduation_class_students')
            .update({ active: false })
            .eq('id', studentId);
        if (error) throw error;
    },

    async updateStudent(studentId: string, updates: Partial<{ name: string; guardian_name: string; active: boolean }>): Promise<void> {
        const { error } = await fromTable('graduation_class_students')
            .update(updates)
            .eq('id', studentId);
        if (error) throw error;
    },

    async deleteAllStudentsFromClass(classId: string): Promise<void> {
        // 1. Buscar todos os IDs de alunos da turma
        const { data: students, error: listError } = await fromTable('graduation_class_students')
            .select('id')
            .eq('class_id', classId);

        if (listError) throw listError;
        const studentIds = (students as unknown as { id: string }[]).map(s => s.id);

        if (studentIds.length === 0) return;

        // 2. Apagar parcelas (graduation_installments)
        const { error: errorInst } = await fromTable('graduation_installments')
            .delete()
            .in('student_id', studentIds);
        if (errorInst) throw errorInst;

        // 3. Apagar obrigações (graduation_student_obligations - se existir via listEvents)
        const { error: errorObl } = await fromTable('graduation_student_obligations')
            .delete()
            .in('student_id', studentIds);
        if (errorObl) throw errorObl;

        // 4. Finalmente apagar os alunos
        const { error: errorStudents } = await fromTable('graduation_class_students')
            .delete()
            .eq('class_id', classId);
        if (errorStudents) throw errorStudents;
    }
};
