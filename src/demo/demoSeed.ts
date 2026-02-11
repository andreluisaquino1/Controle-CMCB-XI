

export interface DemoAccount {
    id: string;
    name: string;
    description: string;
    balance: number;
    type: 'association' | 'resource' | 'merchant';
    entity_id?: string;
    active: boolean;
}

export interface DemoTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    account_id: string;
    merchant_id?: string;
    source_account_id?: string;
    destination_account_id?: string;
    module: string;
    created_by_name?: string;
    status?: 'posted' | 'voided';
    parent_transaction_id?: string;
    created_at?: string;
}

export interface DemoAuditLog {
    id: string;
    created_at: string;
    action: string;
    reason: string | null;
    before_json?: Record<string, unknown> | null;
    after_json?: Record<string, unknown> | null;
    profiles: { name: string | null } | null;
    transactions: {
        description: string | null;
        amount: number;
        module: string;
        transaction_date: string;
        direction: string;
        origin_fund: string | null;
        notes: string | null;
        source: { name: string | null } | null;
        destination: { name: string | null } | null;
        merchant: { name: string | null } | null;
        entity: { name: string | null; type: string } | null;
    } | null;
}

// Initial Balances (Fictitious)
export const INITIAL_ACCOUNTS: DemoAccount[] = [
    // Associação
    { id: 'acc_especie', name: 'Espécie', description: 'Caixa físico da associação', balance: 1540.50, type: 'association', entity_id: 'ent_associacao', active: true },
    { id: 'acc_pix', name: 'PIX (Conta BB)', description: 'Conta corrente Banco do Brasil', balance: 12500.00, type: 'association', entity_id: 'ent_associacao', active: true },
    { id: 'acc_digital', name: 'Conta Digital (Escolaweb)', description: 'Recebimento de boletos', balance: 3200.75, type: 'association', entity_id: 'ent_associacao', active: true },
    { id: 'acc_cofre', name: 'Cofre', description: 'Reserva de segurança', balance: 5000.00, type: 'association', entity_id: 'ent_associacao', active: true },

    // Recursos (Unidade Executora - PDDE)
    { id: 'res_ue_basico', name: 'PDDE Básico', description: 'Custeio e Capital', balance: 15500.00, type: 'resource', entity_id: 'ent_ue', active: true },
    { id: 'res_ue_qualidade', name: 'PDDE Qualidade', description: 'Mais Educação / Atleta na Escola', balance: 12300.50, type: 'resource', entity_id: 'ent_ue', active: true },
    { id: 'res_ue_estrutura', name: 'PDDE Estrutura', description: 'Acessibilidade / Escola do Campo', balance: 17200.00, type: 'resource', entity_id: 'ent_ue', active: true },

    // Recursos (Caixa Escolar - PNAE/FEE)
    { id: 'res_cx_pnae', name: 'PNAE (Alimentação)', description: 'Merenda Escolar', balance: 18450.75, type: 'resource', entity_id: 'ent_cx', active: true },
    { id: 'res_cx_fee', name: 'FEE (Manutenção)', description: 'Manutenção e Pequenos Reparos', balance: 9549.25, type: 'resource', entity_id: 'ent_cx', active: true },
];


export const MOCK_ENTITIES = [
    { id: 'ent_associacao', name: 'Associação CMCB-XI', type: 'associacao' },
    { id: 'ent_ue', name: 'Unidade Executora', type: 'ue' },
    { id: 'ent_cx', name: 'Caixa Escolar', type: 'cx' },
];

export const INITIAL_MERCHANTS: DemoAccount[] = [
    { id: 'merc_atacadia', name: 'Atacadão Dia a Dia', description: 'Fornecedor de Alimentos', balance: 1250.00, type: 'merchant', entity_id: 'ent_associacao', active: true },
    { id: 'merc_kalunga', name: 'Kalunga', description: 'Material de Escritório', balance: 450.00, type: 'merchant', entity_id: 'ent_associacao', active: true },
    { id: 'merc_amazon', name: 'Amazon', description: 'Livros e Eletrônicos', balance: 0.00, type: 'merchant', entity_id: 'ent_associacao', active: true },
    { id: 'merc_posto', name: 'Posto Ipiranga', description: 'Combustível', balance: 0.00, type: 'merchant', entity_id: 'ent_associacao', active: true },
];

const today = new Date();
const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(today.getDate() - days);
    return d.toISOString();
};

export const INITIAL_TRANSACTIONS: DemoTransaction[] = [
    // --- ASSOCIAÇÃO TRANSACTIONS ---
    {
        id: 'tx-101',
        date: daysAgo(2),
        description: 'Mensalidade Aluno A',
        amount: 150.00,
        type: 'income',
        category: 'Mensalidade',
        account_id: 'acc_pix',
        module: 'mensalidade',
        created_by_name: 'Tenente X',
        created_at: daysAgo(2)
    },
    {
        id: 'tx-102',
        date: daysAgo(5),
        description: 'Compra de Material Limpeza',
        amount: 250.00,
        type: 'expense',
        category: 'Material',
        account_id: 'acc_especie',
        module: 'saida_especie',
        created_by_name: 'Capitão Y',
        created_at: daysAgo(5)
    },
    {
        id: 'tx-103',
        date: daysAgo(10),
        description: 'Transferência para Cofre',
        amount: 1000.00,
        type: 'expense',
        category: 'Transferência',
        account_id: 'acc_pix',
        module: 'transferencia',
        source_account_id: 'acc_pix',
        destination_account_id: 'acc_cofre',
        created_by_name: 'Major Z',
        created_at: daysAgo(10)
    },
    {
        id: 'tx-104',
        date: daysAgo(10),
        description: 'Transferência recebida do PIX',
        amount: 1000.00,
        type: 'income',
        category: 'Transferência',
        account_id: 'acc_cofre',
        module: 'transferencia',
        source_account_id: 'acc_pix',
        destination_account_id: 'acc_cofre',
        created_by_name: 'Major Z',
        created_at: daysAgo(10)
    },

    // --- SALDOS DOS ESTABELECIMENTOS TRANSACTIONS ---
    {
        id: 'tx-201',
        date: daysAgo(3),
        description: 'Pagamento Saldo Devedor Atacadão',
        amount: 500.00,
        type: 'expense',
        category: 'Pagamento Fornecedor',
        account_id: 'acc_pix',
        merchant_id: 'merc_atacadia',
        module: 'consumo_saldo',
        created_by_name: 'Tenente X',
        created_at: daysAgo(3)
    },
    {
        id: 'tx-202',
        date: daysAgo(7),
        description: 'Aporte Saldo Kalunga',
        amount: 450.00, // Positive for merchant balance logic usually implies adding credit
        type: 'income', // Context depends on merchant view vs account view. Usually expense for account, income for merchant.
        category: 'Aporte',
        account_id: 'merc_kalunga', // This transaction sits on the merchant "account"
        module: 'aporte_saldo',
        created_by_name: 'Capitão Y',
        created_at: daysAgo(7)
    },

    // --- MORE SALDOS TRANSACTIONS ---
    {
        id: 'tx-203',
        date: daysAgo(12),
        description: 'Abatimento Saldo Amazon - Livros Biblioteca',
        amount: 250.00,
        type: 'expense',
        category: 'Material Bibliográfico',
        account_id: 'acc_pix',
        merchant_id: 'merc_amazon',
        module: 'consumo_saldo',
        created_by_name: 'Major Z',
        created_at: daysAgo(12)
    },
    {
        id: 'tx-204',
        date: daysAgo(15),
        description: 'Aporte Saldo Posto Ipiranga',
        amount: 2000.00,
        type: 'income',
        category: 'Aporte',
        account_id: 'merc_posto',
        module: 'aporte_saldo',
        created_by_name: 'Tenente X',
        created_at: daysAgo(15)
    },
    {
        id: 'tx-205',
        date: daysAgo(18),
        description: 'Abastecimento Viatura 01',
        amount: 350.00,
        type: 'expense',
        category: 'Combustível',
        account_id: 'acc_pix',
        merchant_id: 'merc_posto',
        module: 'consumo_saldo',
        created_by_name: 'Tenente X',
        created_at: daysAgo(18)
    },
    {
        id: 'tx-206',
        date: daysAgo(20),
        description: 'Compra Toner Impressora - Kalunga',
        amount: 299.90,
        type: 'expense',
        category: 'Material Escritório',
        account_id: 'acc_pix',
        merchant_id: 'merc_kalunga',
        module: 'consumo_saldo',
        created_by_name: 'Capitão Y',
        created_at: daysAgo(20)
    },

    // --- MORE RECURSOS TRANSACTIONS ---
    {
        id: 'tx-304',
        date: daysAgo(5),
        description: 'Serviço de Jardinagem',
        amount: 450.00,
        type: 'expense',
        category: 'Serviços Terceiros',
        account_id: 'res_ue_basico',
        module: 'pix_direto_uecx',
        created_by_name: 'Major Z',
        created_at: daysAgo(5)
    },
    {
        id: 'tx-305',
        date: daysAgo(10),
        description: 'Recarga Gás Cozinha',
        amount: 180.00,
        type: 'expense',
        category: 'Gás',
        account_id: 'res_cx_fee',
        module: 'pix_direto_uecx',
        created_by_name: 'Tenente X',
        created_at: daysAgo(10)
    },
    {
        id: 'tx-306',
        date: daysAgo(14),
        description: 'Internet Fibra Óptica - Mensalidade',
        amount: 150.00,
        type: 'expense',
        category: 'Internet',
        account_id: 'res_ue_estrutura',
        module: 'pix_direto_uecx',
        created_by_name: 'Capitão Y',
        created_at: daysAgo(14)
    },
    {
        id: 'tx-307',
        date: daysAgo(25),
        description: 'Manutenção Elétrica Quadra Esportes',
        amount: 850.00,
        type: 'expense',
        category: 'Reparos',
        account_id: 'res_ue_qualidade',
        module: 'pix_direto_uecx',
        created_by_name: 'Major Z',
        created_at: daysAgo(25)
    },
    {
        id: 'tx-308',
        date: daysAgo(28),
        description: 'Compra Descartáveis Cantina',
        amount: 320.50,
        type: 'expense',
        category: 'Material Consumo',
        account_id: 'res_cx_pnae',
        module: 'pix_direto_uecx',
        created_by_name: 'Tenente X',
        created_at: daysAgo(28)
    }
];

export const MOCK_LOGS = [
    {
        id: 'log-1',
        created_at: daysAgo(1),
        action: 'void',
        reason: 'Lançamento duplicado',
        profiles: { name: 'Major Z' },
        transactions: {
            description: 'Pagamento Errado',
            amount: 150.00,
            module: 'mensalidade',
            transaction_date: daysAgo(1),
            direction: 'in',
            origin_fund: 'Associação',
            notes: 'Erro de digitação',
            source: { name: 'PIX (Conta BB)' },
            destination: null,
            merchant: null,
            entity: { name: 'Associação CMCB-XI', type: 'associacao' }
        }
    },
    {
        id: 'log-2',
        created_at: daysAgo(5),
        action: 'void',
        reason: 'Valor incorreto',
        profiles: { name: 'Tenente X' },
        transactions: {
            description: 'Compra Material',
            amount: 50.00,
            module: 'saida_especie',
            transaction_date: daysAgo(5),
            direction: 'out',
            origin_fund: 'Associação',
            notes: 'Valor real era 45.00',
            source: { name: 'Espécie' },
            destination: null,
            merchant: null,
            entity: { name: 'Associação CMCB-XI', type: 'associacao' }
        }
    },
    {
        id: 'log-3',
        created_at: daysAgo(8),
        action: 'edit',
        reason: 'Correção de categoria',
        profiles: { name: 'Capitão Y' },
        transactions: {
            description: 'Manutenção PC',
            amount: 250.00,
            module: 'pix_direto_uecx',
            transaction_date: daysAgo(8),
            direction: 'out',
            origin_fund: 'Unidade Executora',
            notes: 'Categoria alterada de Material para Serviços',
            source: { name: 'Unidade Executora' },
            destination: null,
            merchant: null,
            entity: { name: 'Unidade Executora', type: 'ue' }
        }
    },
    {
        id: 'log-4',
        created_at: daysAgo(12),
        action: 'void',
        reason: 'Teste de sistema',
        profiles: { name: 'Major Z' },
        transactions: {
            description: 'Teste 123',
            amount: 1.00,
            module: 'aporte_saldo',
            transaction_date: daysAgo(12),
            direction: 'in',
            origin_fund: 'Associação',
            notes: 'Transação de teste removida',
            source: null,
            destination: null,
            merchant: { name: 'Amazon' },
            entity: { name: 'Associação CMCB-XI', type: 'associacao' }
        }
    },
    {
        id: 'log-5',
        created_at: daysAgo(20),
        action: 'Anulação de Transação',
        reason: 'Nota fiscal cancelada',
        profiles: { name: 'Tenente X' },
        transactions: {
            description: 'Compra Papel A4',
            amount: 1200.00,
            module: 'transferencia',
            transaction_date: daysAgo(20),
            direction: 'out',
            origin_fund: 'Associação',
            notes: 'Devolução realizada',
            source: { name: 'PIX (Conta BB)' },
            destination: { name: 'Cofre' },
            merchant: null,
            entity: { name: 'Associação CMCB-XI', type: 'associacao' }
        }
    },
    {
        id: 'log-6',
        created_at: daysAgo(2),
        action: 'change',
        reason: 'Promoção de cargo e permissões',
        profiles: { name: 'Sistema' },
        transactions: null,
        before_json: { role: 'user', active: true, user_id: 'user-123' },
        after_json: { role: 'admin', active: true, user_id: 'user-123' }
    },
    {
        id: 'log-7',
        created_at: daysAgo(3),
        action: 'edit',
        reason: 'Ajuste de valor centavos',
        profiles: { name: 'Capitão Y' },
        transactions: {
            description: 'Mensalidade Aluno B',
            amount: 150.50,
            module: 'mensalidade',
            transaction_date: daysAgo(3),
            direction: 'in',
            origin_fund: 'Associação',
            notes: 'Valor estava 150.00',
            source: { name: 'PIX (Conta BB)' },
            destination: null,
            merchant: null,
            entity: { name: 'Associação CMCB-XI', type: 'associacao' }
        },
        before_json: null,
        after_json: null
    },
    {
        id: 'log-8',
        created_at: daysAgo(1),
        action: 'void',
        reason: 'Lançamento em conta errada',
        profiles: { name: 'Major Z' },
        transactions: {
            description: 'Manutenção Ar Condicionado',
            amount: 450.00,
            module: 'saida_especie',
            transaction_date: daysAgo(1),
            direction: 'out',
            origin_fund: 'Associação',
            notes: 'Deveria ser PIX',
            source: { name: 'Espécie' },
            destination: null,
            merchant: null,
            entity: { name: 'Associação CMCB-XI', type: 'associacao' }
        },
        before_json: null,
        after_json: null
    },
    {
        id: 'log-9',
        created_at: daysAgo(0),
        action: 'change',
        reason: 'Bloqueio de acesso temporário',
        profiles: { name: 'Admin' },
        transactions: null,
        before_json: { active: true, user_id: 'user-456' },
        after_json: { active: false, user_id: 'user-456' }
    },
    {
        id: 'log-10',
        created_at: daysAgo(0),
        action: 'change',
        reason: 'Transferência manual de responsabilidade',
        profiles: { name: 'Admin' },
        transactions: null,
        before_json: { account_id: 'acc_especie', responsible_id: 'user-old' },
        after_json: { account_id: 'acc_especie', responsible_id: 'user-new' }
    }
];
