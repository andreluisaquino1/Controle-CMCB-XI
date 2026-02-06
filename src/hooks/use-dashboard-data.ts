import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { MerchantBalance, DashboardData, ReportData, Account } from "@/types";

async function fetchCurrentBalances(): Promise<DashboardData> {
  const { data, error } = await supabase.rpc("get_current_balances");

  console.log("RPC get_current_balances raw data:", data);

  if (error) {
    console.error("Error fetching current balances:", error);
    throw error;
  }

  const result = data as any;

  return {
    especieBalance: Number(result?.especieBalance || 0),
    cofreBalance: Number(result?.cofreBalance || 0),
    pixBalance: Number(result?.pixBalance || 0),
    contaDigitalBalance: Number(result?.contaDigitalBalance || 0),
    merchantBalances: result?.merchantBalances || [],
    resourceBalances: result?.resourceBalances || { UE: [], CX: [] },
  };
}

async function fetchReportSummary(startDate: string, endDate: string): Promise<ReportData> {
  const { data, error } = await supabase.rpc("get_report_summary", {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    console.error("Error fetching report summary:", error);
    throw error;
  }

  const result = data as {
    weeklyExpensesCash?: number;
    weeklyExpensesPix?: number;
    weeklyExpensesDigital?: number;
    weeklyEntriesCash?: number;
    weeklyEntriesPix?: number;
    weeklyDeposits?: number;
    weeklyConsumption?: number;
    weeklyDirectPix?: number;
  };

  return {
    weeklyExpensesCash: Number(result?.weeklyExpensesCash || 0),
    weeklyExpensesPix: Number(result?.weeklyExpensesPix || 0),
    weeklyExpensesDigital: Number(result?.weeklyExpensesDigital || 0),
    weeklyEntriesCash: Number(result?.weeklyEntriesCash || 0),
    weeklyEntriesPix: Number(result?.weeklyEntriesPix || 0),
    weeklyDeposits: Number(result?.weeklyDeposits || 0),
    weeklyConsumption: Number(result?.weeklyConsumption || 0),
    weeklyDirectPix: Number(result?.weeklyDirectPix || 0),
  };
}

/**
 * Hook for Dashboard page - returns only current balances (no period)
 */
export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: fetchCurrentBalances,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for Reports page - returns period-based transaction summaries
 */
export function useReportData(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["report-data", startDate, endDate],
    queryFn: () => fetchReportSummary(startDate, endDate),
    staleTime: 1000 * 60,
    enabled: !!startDate && !!endDate,
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
