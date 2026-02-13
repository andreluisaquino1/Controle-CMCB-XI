
export type GraduationEntryType = 'MENSALIDADE' | 'RIFA' | 'BINGO' | 'VENDA' | 'DOACAO' | 'OUTROS';
export type GraduationPayMethod = 'PIX' | 'ESPECIE';
export type ObligationKind = 'MENSALIDADE' | 'RIFA' | 'BINGO' | 'VENDA' | 'DOACAO' | 'OUTROS';
export type ObligationStatus = 'EM_ABERTO' | 'PAGO';

export interface GraduationConfig {
    id: string;
    graduation_id: string;
    version: number;
    installment_value: number;
    installments_count: number;
    due_day: number;
    start_month: number;
}

export interface Graduation {
    id: string;
    name: string;
    year: number;
    active: boolean;
    slug?: string;
}

export interface GraduationClass {
    id: string;
    graduation_id: string;
    name: string;
    active: boolean;
    slug?: string;
}

export interface GraduationStudent {
    id: string;
    class_id: string;
    full_name: string;
    guardian_name?: string;
    active: boolean;
}

export interface GraduationFinancialCard {
    totalIncome: number;
    totalExpenses: number;
    balanceTotal: number;
    balancePix: number;
    balanceCash: number;
    pendingIncome: number;
    totalWithTreasurer: number;
}

export interface FinancialTransaction {
    id: string;
    date: string;
    type: 'ENTRADA' | 'DESPESA' | 'TRANSFERENCIA' | 'AJUSTE';
    category?: string;
    description: string;
    amount: number;
    method?: string;
    account?: string;
}

export interface StudentObligation {
    id: string;
    student_id: string;
    kind: ObligationKind;
    reference_label: string;
    installment_number?: number;
    amount: number;
    due_date?: string;
    status: ObligationStatus;
    paid_at?: string;
    received_by?: string;
    financial_responsible?: string;
    signature?: string;
}
