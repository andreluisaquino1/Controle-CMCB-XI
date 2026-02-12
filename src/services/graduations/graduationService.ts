
import { supabase } from "@/integrations/supabase/client";
import { Graduation, GraduationConfig } from "@/services/graduations/types";

export const graduationService = {
    async listGraduations(): Promise<Graduation[]> {
        const { data, error } = await supabase
            .from('graduations' as any)
            .select('*')
            .eq('active', true)
            .order('year', { ascending: false });

        if (error) throw error;
        return data as unknown as Graduation[];
    },

    async getGraduationBySlug(slug: string): Promise<Graduation> {
        const { data, error } = await supabase
            .from('graduations' as any)
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) throw error;
        return data as unknown as Graduation;
    },

    async createGraduation(name: string, year: number): Promise<Graduation> {
        const slug = `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}-${year}`.replace(/^-+|-+$/g, '');

        const { data, error } = await supabase
            .from('graduations' as any)
            .upsert({ name, year, active: true, slug }, { onConflict: 'slug' })
            .select()
            .single();

        if (error) throw error;
        return data as unknown as Graduation;
    },

    async updateGraduation(id: string, updates: Partial<Graduation>): Promise<void> {
        const { error } = await supabase
            .from('graduations' as any)
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async softDeleteGraduation(id: string): Promise<void> {
        const { error } = await supabase
            .from('graduations' as any)
            .update({ active: false })
            .eq('id', id);
        if (error) throw error;
    },

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

        const newVersion = ((maxVer as any)?.version || 0) + 1;

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
    }
};
