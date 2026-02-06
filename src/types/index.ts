export interface Entity {
    id: string;
    name: string;
    type: string;
    cnpj: string;
}

export interface Account {
    id: string;
    name: string;
    balance: number;
    type: string;
    entity_id: string;
    bank: string | null;
    agency: string | null;
    account_number: string | null;
    active: boolean;
}

export interface Merchant {
    id: string;
    name: string;
    balance: number;
    active: boolean;
}

export interface Transaction {
    id: string;
    transaction_date: string;
    module: string;
    amount: number;
    direction: string;
    payment_method: string | null;
    shift: string | null;
    description: string | null;
    notes: string | null;
    status: string;
    created_by: string;
    source_account_id: string | null;
    destination_account_id: string | null;
    merchant_id: string | null;
    origin_fund: string | null;
    entity_id: string | null;
    created_at: string;
}

export interface TransactionWithCreator extends Transaction {
    creator_name: string | null;
    source_account_name: string | null;
    destination_account_name: string | null;
    merchant_name: string | null;
    entity_name?: string | null;
    entity_type?: string | null;
    entity_cnpj?: string | null;
}

export interface MerchantBalance {
    id: string;
    name: string;
    balance: number;
    mode: string;
}

export interface DashboardData {
    especieBalance: number;
    cofreBalance: number;
    pixBalance: number;
    contaDigitalBalance: number;
    merchantBalances: MerchantBalance[];
    resourceBalances: {
        UE: Account[];
        CX: Account[];
    };
    weeklyExpensesCash?: number;
    weeklyExpensesPix?: number;
    weeklyExpensesDigital?: number;
    weeklyEntriesCash?: number;
    weeklyEntriesPix?: number;
}

export interface ReportData {
    weeklyExpensesCash: number;
    weeklyExpensesPix: number;
    weeklyExpensesDigital: number;
    weeklyPixFees: number;
    weeklyEntriesCash: number;
    weeklyEntriesPix: number;
    weeklyEntriesPixNaoIdentificado: number;
    weeklyDeposits: number;
    weeklyConsumption: number;
    weeklyDirectPix: number;
}
