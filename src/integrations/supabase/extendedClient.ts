import { supabase } from "@/integrations/supabase/client";
import type { ExtendedDatabase } from "@/integrations/supabase/database.extension";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Um único ponto para acessar o client tipado com a extensão do schema.
 * Evita espalhar casts `as any` pelo projeto.
 */
export const extendedSupabase = supabase as unknown as SupabaseClient<ExtendedDatabase>;
