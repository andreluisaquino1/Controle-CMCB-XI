import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWeekStartDate, formatDateString, getTodayString } from "@/lib/date-utils";

interface MerchantBalance {
  id: string;
  name: string;
  balance: number;
  mode: string;
}

export interface DashboardData {
  bolsinhaBalance: number;
  reservaBalance: number;
  pixBalance: number;
  weeklyExpensesCash: number;
  weeklyExpensesPix: number;
  weeklyEntriesCash: number;
  weeklyEntriesPix: number;
  merchantBalances: MerchantBalance[];
  resourceBalances: {
    UE: any[];
    CX: any[];
  };
  weeklyDeposits: number;
  weeklyConsumption: number;
  weeklyDirectPix: number;
  periodStart: string;
  periodEnd: string;
}

async function fetchDashboardSummary(startDate?: string, endDate?: string): Promise<DashboardData> {
  const start = startDate || formatDateString(getWeekStartDate());
  const end = endDate || getTodayString();

  const { data, error } = await supabase.rpc("get_dashboard_summary", {
    start_date: start,
    end_date: end,
  });

  if (error) {
    console.error("Error fetching dashboard summary:", error);
    throw error;
  }

  const result = data as any;

  return {
    bolsinhaBalance: Number(result?.bolsinhaBalance || 0),
    reservaBalance: Number(result?.reservaBalance || 0),
    pixBalance: Number(result?.pixBalance || 0),
    weeklyExpensesCash: Number(result?.weeklyExpensesCash || 0),
    weeklyExpensesPix: Number(result?.weeklyExpensesPix || 0),
    weeklyEntriesCash: Number(result?.weeklyEntriesCash || 0),
    weeklyEntriesPix: Number(result?.weeklyEntriesPix || 0),
    weeklyDeposits: Number(result?.weeklyDeposits || 0),
    weeklyConsumption: Number(result?.weeklyConsumption || 0),
    weeklyDirectPix: Number(result?.weeklyDirectPix || 0),
    merchantBalances: result?.merchantBalances || [],
    resourceBalances: result?.resourceBalances || { UE: [], CX: [] },
    periodStart: result?.periodStart || start,
    periodEnd: result?.periodEnd || end,
  };
}

export function useDashboardData(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["dashboard-summary", startDate, endDate],
    queryFn: () => fetchDashboardSummary(startDate, endDate),
    staleTime: 1000 * 30, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: ["dashboard-summary"],
      refetchType: "active",
    });
  };
}
