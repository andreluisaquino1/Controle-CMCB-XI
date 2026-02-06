
import { useState, useEffect, useCallback } from "react";
import { demoStore } from "./demoStore";
import { DemoAccount, DemoTransaction, DemoAuditLog } from "./demoSeed";
import { useAuth } from "@/contexts/AuthContext";

// Event listener for storage changes to sync across tabs/components
// Simple implementation: Custom Event
const DEMO_UPDATE_EVENT = "demo_data_updated";

export const triggerDemoUpdate = () => {
    window.dispatchEvent(new Event(DEMO_UPDATE_EVENT));
};

export function useDemoData() {
    const { isDemo } = useAuth();
    const [accounts, setAccounts] = useState<DemoAccount[]>([]);
    const [merchants, setMerchants] = useState<DemoAccount[]>([]);
    const [transactions, setTransactions] = useState<DemoTransaction[]>([]);
    const [logs, setLogs] = useState<DemoAuditLog[]>([]);

    const refresh = useCallback(() => {
        if (isDemo) {
            setAccounts(demoStore.getAccounts());
            setMerchants(demoStore.getMerchants());
            setTransactions(demoStore.getTransactions());
            setLogs(demoStore.getLogs());
        }
    }, [isDemo]);

    useEffect(() => {
        if (isDemo) {
            demoStore.init();
            refresh();

            const handleUpdate = () => refresh();
            window.addEventListener(DEMO_UPDATE_EVENT, handleUpdate);
            return () => window.removeEventListener(DEMO_UPDATE_EVENT, handleUpdate);
        }
    }, [isDemo, refresh]);

    return {
        accounts,
        merchants,
        transactions,
        logs,
        // Expose direct getters for synchronous access (fixes initial render issues)
        getAccounts: () => demoStore.getAccounts(),
        getMerchants: () => demoStore.getMerchants(),
        getTransactions: () => demoStore.getTransactions(),
        getLogs: () => demoStore.getLogs(),
        addTransaction: (tx: DemoTransaction) => {
            demoStore.addTransaction(tx);
            triggerDemoUpdate();
        },
        updateMerchantBalance: (id: string, delta: number) => {
            demoStore.updateMerchantBalance(id, delta);
            triggerDemoUpdate();
        },
        voidTransaction: (id: string) => {
            demoStore.voidTransaction(id);
            triggerDemoUpdate();
        },
        getReportSummary: (start: string, end: string) => demoStore.getReportSummary(start, end),
        refresh
    };
}
