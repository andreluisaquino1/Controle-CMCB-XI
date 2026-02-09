import { supabase } from "@/integrations/supabase/client";

export interface Profile {
    id: string;
    user_id: string;
    name: string;
    email: string;
    active: boolean;
    created_at: string;
    role?: "admin" | "user" | "demo" | "secretaria";
}

export const profileService = {
    /**
     * Busca todos os perfis com suas respectivas funções
     */
    async getAllProfiles(): Promise<Profile[]> {
        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        const { data: rolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("user_id, role");

        if (rolesError) throw rolesError;

        return (profilesData || []).map((p) => ({
            ...p,
            role: (rolesData.find((r) => r.user_id === p.user_id)?.role as any) || "user",
        })) as Profile[];
    },

    /**
     * Atualiza o status ativo/inativo de um perfil
     */
    async toggleActivation(id: string, active: boolean): Promise<void> {
        const { error } = await supabase
            .from("profiles")
            .update({ active })
            .eq("id", id);

        if (error) throw error;
    },

    /**
     * Atualiza ou insere a função de um usuário
     */
    async updateRole(userId: string, role: string): Promise<void> {
        const { data: existingRole } = await supabase
            .from("user_roles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (existingRole) {
            const { error } = await supabase
                .from("user_roles")
                .update({ role: role as any })
                .eq("user_id", userId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from("user_roles")
                .insert({ user_id: userId, role: role as any });
            if (error) throw error;
        }
    },

    /**
     * Remove um usuário (perfil e funções)
     */
    async deleteUser(userId: string): Promise<void> {
        const { error: profileError } = await supabase
            .from("profiles")
            .delete()
            .eq("user_id", userId);

        if (profileError) throw profileError;

        const { error: roleError } = await supabase
            .from("user_roles")
            .delete()
            .eq("user_id", userId);

        if (roleError) throw roleError;
    },

    /**
     * Atualiza o nome de um perfil
     */
    async updateProfileName(userId: string, name: string): Promise<void> {
        const { error } = await supabase
            .from("profiles")
            .update({ name })
            .eq("user_id", userId);

        if (error) throw error;
    },

    /**
     * Busca um perfil específico com sua função
     */
    async getProfile(userId: string): Promise<Profile | null> {
        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (profileError) {
            console.error("Error fetching profile:", profileError);
            throw profileError;
        }

        if (!profileData) return null;

        const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .maybeSingle();

        if (roleError) {
            console.error("Error fetching role:", roleError);
            throw roleError;
        }

        return {
            ...profileData,
            role: roleData?.role || "user"
        } as Profile;
    }
};
