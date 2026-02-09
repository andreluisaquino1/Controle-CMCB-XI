import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Merchant } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { merchantService } from "@/services/merchantService";

export function useMerchants(includeInactive = false) {
  const { isDemo } = useAuth();
  const { merchants } = useDemoData();

  const query = useQuery({
    queryKey: ["merchants", includeInactive],
    queryFn: () => merchantService.getAllMerchants(includeInactive),
    enabled: !isDemo,
  });

  if (isDemo) {
    const data = includeInactive ? merchants : merchants.filter(m => m.active);
    return { ...query, data: data as unknown as Merchant[], isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useCreateMerchant() {
  const { isDemo } = useAuth();
  const { createMerchant } = useDemoData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
    }: {
      name: string;
    }) => {
      if (isDemo) {
        return createMerchant(name);
      }
      return merchantService.createMerchant(name);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success(`${variables.name} foi adicionado com sucesso.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível adicionar o estabelecimento.");
    },
  });
}

export function useUpdateMerchant() {
  const { isDemo } = useAuth();
  const { updateMerchant } = useDemoData();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (isDemo) {
        updateMerchant(id, name);
        return;
      }
      return merchantService.updateMerchant(id, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Estabelecimento atualizado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível atualizar.");
    },
  });
}

export function useDeactivateMerchant() {
  const queryClient = useQueryClient();
  const { isDemo } = useAuth();
  const { setMerchantActive } = useDemoData();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        setMerchantActive(id, false);
        return;
      }
      return merchantService.setMerchantActive(id, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Estabelecimento desativado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível desativar.");
    },
  });
}
export function useActivateMerchant() {
  const queryClient = useQueryClient();
  const { isDemo } = useAuth();
  const { setMerchantActive } = useDemoData();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemo) {
        setMerchantActive(id, true);
        return;
      }
      return merchantService.setMerchantActive(id, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      toast.success("Estabelecimento reativado.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível reativar.");
    },
  });
}
