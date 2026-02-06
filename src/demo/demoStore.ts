import { DemoAccount, DemoTransaction, INITIAL_ACCOUNTS, INITIAL_MERCHANTS, INITIAL_TRANSACTIONS, MOCK_LOGS } from "./demoSeed";

const STORAGE_KEY = "demo_state";
const DEMO_schema_VERSION = "1.7"; // Increment this to force reset

interface DemoState {
    version?: string;
    accounts: DemoAccount[];
    merchants: DemoAccount[];
    transactions: DemoTransaction[];
    logs: any[]; // Using any for simplicity or define AuditLog interface
}

const getStoredState = (): DemoState | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
};

const setStoredState = (state: DemoState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const demoStore = {
    init: () => {
        const current = getStoredState();
        if (!current || current.version !== DEMO_schema_VERSION) {
            console.log("Fluxo Demo: Inicializando ou Resetando dados (Versão alterada)", {
                currentVersion: current?.version,
                newVersion: DEMO_schema_VERSION,
                txCount: INITIAL_TRANSACTIONS.length
            });
            setStoredState({
                version: DEMO_schema_VERSION,
                accounts: INITIAL_ACCOUNTS,
                merchants: INITIAL_MERCHANTS,
                transactions: INITIAL_TRANSACTIONS,
                logs: MOCK_LOGS,
            });
            // Force reload if we are resetting while app is running to ensure hooks get fresh data?
            // Not strictly necessary if specific hooks call init(), but safer for global state.
        }
    },

    reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        demoStore.init();
        window.location.reload();
    },

    getAccounts: (): DemoAccount[] => {
        demoStore.init();
        return getStoredState()?.accounts || [];
    },

    getMerchants: (): DemoAccount[] => {
        demoStore.init();
        return getStoredState()?.merchants || [];
    },

    getTransactions: (): DemoTransaction[] => {
        demoStore.init();
        return getStoredState()?.transactions || [];
    },

    getLogs: (): any[] => {
        demoStore.init();
        return getStoredState()?.logs || [];
    },

    addTransaction: (transaction: DemoTransaction) => {
        const state = getStoredState();
        if (!state) return;

        // Add transaction
        state.transactions = [transaction, ...state.transactions];

        // Update balances based on transaction type/module
        const { amount, account_id, merchant_id, destination_account_id, source_account_id, type, module } = transaction;

        const findAccount = (id: string) => state.accounts.find(a => a.id === id);
        const findMerchant = (id: string) => state.merchants.find(m => m.id === id);

        // Handle Transfer Logic (Explicit transfer module or direction)
        // Note: useCreateTransaction usually sets direction='transfer' for transfers.
        // But demo transaction might not have 'direction' property on interface?
        // Let's check DemoTransaction interface in demoSeed.ts. 
        // It has: type: 'income' | 'expense'.
        // We should probably add 'transfer' to DemoTransaction type or emulate it.
        // If it's a transfer, we usually see Expense from Source and Income to Destination?
        // Or we handle it based on module/properties.

        // In our mock logic in useCreateTransaction, we mapped:
        // type: transaction.direction === 'in' ? 'income' : 'expense'
        // This is lossy for 'transfer'.
        // But we assigned account_id = destination or source.

        // Let's improve useCreateTransaction mock mapping first? 
        // No, let's look at what we have in demoStore.
        // If module is 'transferencia_saldo' or 'deposito_cofre', etc.

        // Actually, simpler:
        // If account_id is present and type is 'income', add.
        // If account_id is present and type is 'expense', subtract.

        // BUT: Transfers involve TWO accounts.
        // The current DemoTransaction interface only has ONE `account_id`.
        // We need to support transfers. 
        // I should update DemoTransaction to support source/destination or handle as two transactions?
        // Real Supabase `transactions` table has `source_account_id` and `destination_account_id`.
        // My `DemoTransaction` should match that properly.

        // CRITICAL FIX: Update DemoTransaction interface (in next step) and here.
        // I will code assuming DemoTransaction HAS source/dest support.

        if (module === 'transferencia_saldo' || module === 'deposito_cofre' || module === 'retirada_cofre' || module === 'aplicacao_poupanca' || module === 'resgate_poupanca') {
            // Transfer logic
            // We typically expect source & dest. 
            // If we only have account_id (from the mock mapping), we might be missing data.
            // I will assume `source_account_id` and `destination_account_id` are passed in `transaction` object (I need to add them to interface).
        }

        // Standard Logic
        if (source_account_id) {
            const acc = findAccount(source_account_id);
            if (acc) acc.balance -= amount;
        }

        if (destination_account_id) {
            const acc = findAccount(destination_account_id);
            if (acc) acc.balance += amount;
        }

        if (account_id && !source_account_id && !destination_account_id) {
            const acc = findAccount(account_id);
            if (acc) {
                if (type === 'income') acc.balance += amount;
                else acc.balance -= amount;
            }
        }

        // Merchant Logic
        if (merchant_id) {
            const merc = findMerchant(merchant_id);
            if (merc) {
                // Basic logic: if we spent balance (module=consumo_saldo), reduce balance.
                // If we added balance (aporte), increase.
                // If we just spent money AT the merchant (expense), it doesn't affect 'merchant balance' unless it's a credit tab.
                // But usually 'merchant balance' in this app implies a pre-paid credit or tab.

                if (module === 'consumo_saldo') {
                    // Expense from Merchant Balance
                    merc.balance -= amount;
                } else if (module === 'aporte_saldo' || module === 'aporte_estabelecimento_recurso') {
                    // Credit to Merchant Balance
                    merc.balance += amount;
                }
            }
        }

        setStoredState(state);
    },

    // Specific Helpers for Complex Logic
    updateAccountBalance: (accountId: string, newBalance: number) => {
        const state = getStoredState();
        if (!state) return;

        const acc = state.accounts.find(a => a.id === accountId);
        if (acc) {
            acc.balance = newBalance;
            setStoredState(state);
        }
    },

    updateMerchantBalance: (merchantId: string, delta: number) => {
        const state = getStoredState();
        if (!state) return;

        const merc = state.merchants.find(m => m.id === merchantId);
        if (merc) {
            merc.balance += delta;
            setStoredState(state);
        }
    },

    getReportSummary: (startDate: string, endDate: string) => {
        demoStore.init();
        const transactions = getStoredState()?.transactions || [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        // End date should include the full day
        end.setHours(23, 59, 59, 999);

        const filtered = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= start && d <= end;
        });

        // Helper to sum
        const sum = (txs: any[]) => txs.reduce((acc, t) => acc + Number(t.amount), 0);

        // Logic based on inference of how the real RPC works
        // weeklyExpensesCash: Expenses from Especie
        const expensesCash = filtered.filter(t => t.type === 'expense' && t.account_id === 'acc_especie');

        // weeklyExpensesPix: Expenses from Pix
        const expensesPix = filtered.filter(t => t.type === 'expense' && t.account_id === 'acc_pix');

        // weeklyExpensesDigital: Expenses from Conta Digital
        const expensesDigital = filtered.filter(t => t.type === 'expense' && (t.account_id === 'acc_digital' || t.account_id === 'acc_bb')); // acc_bb is old name? Using acc_digital based on Seed.

        // weeklyEntriesCash: Income to Especie
        const entriesCash = filtered.filter(t => t.type === 'income' && t.account_id === 'acc_especie');

        // weeklyEntriesPix: Income to Pix
        const entriesPix = filtered.filter(t => t.type === 'income' && t.account_id === 'acc_pix');

        // weeklyDeposits: Transfers from Especie to Pix/Bank
        // In our demo logic, transfers might be explicit modules
        const deposits = filtered.filter(t => t.module === 'deposito_cofre' || (t.type === 'expense' && t.account_id === 'acc_especie' && t.destination_account_id === 'acc_pix')); // Simplified

        // weeklyConsumption: Merchant consumption
        const consumption = filtered.filter(t => t.module === 'consumo_saldo');

        // weeklyDirectPix: Direct Pix payments? Maybe payments where payment_method='pix'?
        // The mock RPC result has this field. In demo we might not track payment_method explicitly in DemoTransaction yet.
        // We can approximate or leave 0.

        return {
            weeklyExpensesCash: sum(expensesCash),
            weeklyExpensesPix: sum(expensesPix),
            weeklyExpensesDigital: sum(expensesDigital),
            weeklyEntriesCash: sum(entriesCash),
            weeklyEntriesPix: sum(entriesPix),
            weeklyDeposits: sum(deposits),
            weeklyConsumption: sum(consumption),
            weeklyDirectPix: 0
        };
    }
};
