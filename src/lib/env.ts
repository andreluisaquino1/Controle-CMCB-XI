import { z } from "zod";

const EnvSchema = z.object({
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1), // Relaxed for development
    VITE_PUBLIC_SITE_URL: z.string().url().optional(),
});

// Valida as variáveis de ambiente no boot da aplicação
export const env = EnvSchema.parse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_PUBLIC_SITE_URL: import.meta.env.VITE_PUBLIC_SITE_URL,
});
