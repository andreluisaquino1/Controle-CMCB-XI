
import { supabase } from "@/integrations/supabase/client";
import { GraduationStudent } from "@/services/graduations/types";
import { formatDateString } from "@/lib/date-utils";

export const studentService = {
    async listStudents(classId: string): Promise<GraduationStudent[]> {
        const { data, error } = await supabase
            .from('graduation_class_students' as any)
            .select('id, class_id, full_name:name, guardian_name, active')
            .eq('class_id', classId)
            .eq('active', true)
            .order('name');

        if (error) throw error;
        return (data as any[]).map(d => ({
            id: d.id,
            class_id: d.class_id,
            full_name: d.full_name,
            guardian_name: d.guardian_name || undefined,
            active: d.active
        }));
    },

    async getStudentsProgress(classId: string): Promise<Record<string, { paid: number; total: number; hasOverdue: boolean }>> {
        const { data, error } = await supabase
            .from('graduation_student_obligations' as any)
            .select('student_id, status, due_date, kind')
            .eq('class_id', classId);

        if (error) throw error;

        const progress: Record<string, { paid: number; total: number; hasOverdue: boolean }> = {};
        const today = formatDateString(new Date());

        (data || []).forEach((obs: any) => {
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
        const insertData: any = { class_id: classId, name: fullName, active: true };
        if (guardianName) insertData.guardian_name = guardianName;

        const { data, error } = await supabase
            .from('graduation_class_students' as any)
            .insert(insertData)
            .select()
            .single();

        if (error) throw error;
        return {
            id: (data as any).id,
            class_id: (data as any).class_id,
            full_name: (data as any).name,
            guardian_name: (data as any).guardian_name || undefined,
            active: (data as any).active
        };
    },

    async inactivateStudent(studentId: string): Promise<void> {
        const { error } = await supabase
            .from('graduation_class_students' as any)
            .update({ active: false })
            .eq('id', studentId);
        if (error) throw error;
    }
};
