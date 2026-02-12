import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";

export function useTransactionMetadata() {
    const { isDemo } = useAuth();
    const { getAccounts, getMerchants } = useDemoData();

    return useQuery({
        queryKey: ["transaction-metadata"],
        queryFn: async () => {
            // Parallel fetching
            const [profilesReq, accountsReq, merchantsReq, entitiesReq] = await Promise.all([
                supabase.from("profiles").select("user_id, name"),
                supabase.from("accounts").select("id, name, entity_id"),
                supabase.from("merchants").select("id, name"),
                supabase.from("entities").select("id, type, name")
            ]);

            const profileMap = new Map(profilesReq.data?.map((p) => [p.user_id, p.name]) || []);

            // Store full account object in map to access entity_id if needed, or just name
            // For backward compatibility with existing code that expects just name, we might need adjustments
            // But usually we just need name. Let's start with name map for simplicity, or object map if advanced.
            // Existing code: const accountMap = new Map(accounts?.map((a) => [a.id, a.name]) || []);
            // Some existing code uses: [a.id, { name: a.name, entity_id: a.entity_id }]
            // Let's return the raw arrays and let consumers build specific maps, OR build a versatile map.
            // Better: Return the data and helper functions/maps.

            const accounts = accountsReq.data || [];
            const merchants = merchantsReq.data || [];
            const profiles = profilesReq.data || [];
            const entities = entitiesReq.data || [];

            const accountNameMap = new Map(accounts.map((a) => [a.id, a.name]));
            const merchantNameMap = new Map(merchants.map((m) => [m.id, m.name]));
            const profileNameMap = new Map(profiles.map((p) => [p.user_id, p.name]));
            const accountEntityMap = new Map(accounts.map((a) => [a.id, a.entity_id]));
            const entityTypeMap = new Map(entities.map((e) => [e.id, e.type]));
            const entityNameMap = new Map(entities.map((e) => [e.id, e.name]));

            return {
                profiles,
                accounts,
                merchants,
                profileNameMap,
                accountNameMap,
                merchantNameMap,
                accountEntityMap,
                entityTypeMap,
                entityNameMap,
                entities
            };
        },
        enabled: !isDemo,
        staleTime: 1000 * 60 * 10, // 10 minutes cache for metadata
    });
}
