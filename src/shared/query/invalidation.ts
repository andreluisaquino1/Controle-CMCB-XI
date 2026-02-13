import { QueryClient } from "@tanstack/react-query";

export const invalidateFinance = async (queryClient: QueryClient) => {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ledger_transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
        queryClient.invalidateQueries({ queryKey: ["saldos"] }),
    ]);
};

export const invalidateAccounts = async (queryClient: QueryClient) => {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["entities-with-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-data"] }),
    ]);
};

export const invalidateAllTransactions = async (queryClient: QueryClient) => {
    await invalidateFinance(queryClient);
    await invalidateAccounts(queryClient);
};
