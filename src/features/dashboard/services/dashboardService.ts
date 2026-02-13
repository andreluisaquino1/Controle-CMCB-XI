import { supabase } from "@/integrations/supabase/client";
import { DashboardData, ReportData, MerchantBalance, Account } from "@/types";

export const dashboardService = {
    /**
     * Busca os saldos atuais para o dashboard
     */
    async getDashboardBalances(): Promise<DashboardData> {
        const { data, error } = await supabase.rpc("get_current_balances");

        if (error) {
            console.error("Error fetching current balances:", error);
            throw error;
        }

        const result = data as {
            especieBalance?: number;
            cofreBalance?: number;
            pixBalance?: number;
            contaDigitalBalance?: number;
            merchantBalances?: MerchantBalance[];
            resourceBalances?: { UE: Account[]; CX: Account[] };
        };

        return {
            especieBalance: Number(result?.especieBalance ?? 0),
            cofreBalance: Number(result?.cofreBalance ?? 0),
            pixBalance: Number(result?.pixBalance ?? 0),
            contaDigitalBalance: Number(result?.contaDigitalBalance ?? 0),
            merchantBalances: Array.isArray(result?.merchantBalances) ? result.merchantBalances : [],
            resourceBalances: result?.resourceBalances ?? { UE: [], CX: [] },
        };
    },

    /**
     * Busca resumo de relatório para um período e entidade
     */
    async getReportSummary(startDate: string, endDate: string, entityId: string): Promise<ReportData> {
        const { data, error } = await supabase.rpc("get_report_summary", {
            p_start_date: startDate,
            p_end_date: endDate,
            p_entity_id: entityId,
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
            weeklyPixFees?: number;
            weeklyEntriesPixNaoIdentificado?: number;
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
            weeklyPixFees: Number(result?.weeklyPixFees || 0),
            weeklyEntriesPixNaoIdentificado: Number(result?.weeklyEntriesPixNaoIdentificado || 0),
        };
    }
};
