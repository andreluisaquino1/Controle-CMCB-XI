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
  especieBalance: number;
  cofreBalance: number;
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

async function fetchCurrentBalances(): Promise<Partial<DashboardData>> {
  const { data, error } = await supabase.rpc("get_current_balances");

  if (error) {
    console.error("Error fetching current balances:", error);
    throw error;
  }

  const result = data as any;
  return {
    especieBalance: Number(result?.especieBalance || 0),
    cofreBalance: Number(result?.cofreBalance || 0),
    pixBalance: Number(result?.pixBalance || 0),
    merchantBalances: result?.merchantBalances || [],
    resourceBalances: result?.resourceBalances || { UE: [], CX: [] },
  };
}

async function fetchReportSummary(startDate: string, endDate: string): Promise<Partial<DashboardData>> {
  const { data, error } = await supabase.rpc("get_report_summary", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error("Error fetching report summary:", error);
    throw error;
  }

  const result = data as any;
  return {
    weeklyExpensesCash: Number(result?.weeklyExpensesCash || 0),
    weeklyExpensesPix: Number(result?.weeklyExpensesPix || 0),
    weeklyEntriesCash: Number(result?.weeklyEntriesCash || 0),
    weeklyEntriesPix: Number(result?.weeklyEntriesPix || 0),
  };
}

export function useDashboardData(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["dashboard-data", startDate, endDate],
    queryFn: async () => {
      const current = await fetchCurrentBalances();
      let report = {};

      if (startDate && endDate) {
        report = await fetchReportSummary(startDate, endDate);
      } else {
        // Default to current week for summary if no dates provided
        const start = formatDateString(getWeekStartDate());
        const end = getTodayString();
        report = await fetchReportSummary(start, end);
      }

      return {
        ...current,
        ...report,
        periodStart: startDate || formatDateString(getWeekStartDate()),
        periodEnd: endDate || getTodayString(),
      } as DashboardData;
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
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
