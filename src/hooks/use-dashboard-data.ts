import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoData } from "@/demo/useDemoData";
import { ACCOUNT_NAMES } from "@/lib/constants";
import { DashboardData, Account, MerchantBalance } from "@/types";
import { dashboardService } from "@/services/dashboardService";

/**
 * Hook for Dashboard page - returns only current balances (no period)
 */
export function useDashboardData() {
  const { isDemo } = useAuth();
  const { accounts, merchants } = useDemoData();

  const query = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: () => dashboardService.getDashboardBalances(),
    staleTime: 0, // Ensure fresh data on invalidation
    refetchOnWindowFocus: true,
    enabled: !isDemo,
  });

  if (isDemo) {
    // Calculate balances from demo state
    const especieBalance = accounts.find(a => a.name === ACCOUNT_NAMES.ESPECIE)?.balance || 0;
    const pixBalance = accounts.find(a => a.name === ACCOUNT_NAMES.PIX)?.balance || 0;
    const cofreBalance = accounts.find(a => a.name === ACCOUNT_NAMES.COFRE)?.balance || 0;
    const contaDigitalBalance = accounts.find(a => a.name === ACCOUNT_NAMES.CONTA_DIGITAL)?.balance || 0;

    const ueAccounts = accounts.filter(a => a.entity_id === 'ent_ue') as unknown as Account[];
    const cxAccounts = accounts.filter(a => a.entity_id === 'ent_cx') as unknown as Account[];

    const data: DashboardData = {
      especieBalance,
      pixBalance,
      cofreBalance,
      contaDigitalBalance,
      merchantBalances: merchants as unknown as MerchantBalance[],
      resourceBalances: { UE: ueAccounts, CX: cxAccounts }
    };

    return { ...query, data, isLoading: false, isError: false, error: null };
  }

  return query;
}

/**
 * Hook for Reports page - returns period-based transaction summaries
 */
export function useReportData(startDate: string, endDate: string, entityId?: string) {
  const { isDemo } = useAuth();
  const { getReportSummary } = useDemoData();

  const query = useQuery({
    queryKey: ["report-data", startDate, endDate, entityId],
    queryFn: () => dashboardService.getReportSummary(startDate, endDate, entityId!),
    staleTime: 1000 * 60,
    enabled: !!startDate && !!endDate && !!entityId && !isDemo,
  });

  if (isDemo && startDate && endDate) {
    const data = getReportSummary(startDate, endDate);
    return { ...query, data, isLoading: false, isError: false, error: null };
  }

  return query;
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: ["dashboard-data"],
      refetchType: "active",
    });
  };
}
