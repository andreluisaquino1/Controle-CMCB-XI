import { z } from "zod";

const EnvSchema = z.object({
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1), // Relaxed for development
    VITE_PUBLIC_SITE_URL: z.string().url().optional(),
});

// Valida as variáveis de ambiente no boot da aplicação
const getEnv = () => {
    try {
        return EnvSchema.parse({
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
            VITE_PUBLIC_SITE_URL: import.meta.env.VITE_PUBLIC_SITE_URL || undefined,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Erro de configuração nas variáveis de ambiente:", error.flatten().fieldErrors);
        } else {
            console.error("❌ Erro inesperado ao validar variáveis de ambiente:", error);
        }
        // Retorna valores parciais ou vazios para evitar crash imediato se possível, 
        // mas o app provavelmente falhará em chamadas subsequentes.
        return {
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
            VITE_PUBLIC_SITE_URL: import.meta.env.VITE_PUBLIC_SITE_URL,
        } as any;
    }
};

export const env = getEnv();

