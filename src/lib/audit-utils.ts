
/**
 * Traduz chaves técnicas do banco para nomes amigáveis em português
 */
const FIELD_LABELS: Record<string, string> = {
    name: "Nome",
    role: "Nível de Acesso",
    active: "Status da Conta",
    email: "E-mail",
    active_user: "Usuário Ativo",
    updated_at: "Última Atualização",
    user_id: "Usuário",
    user: "Usuário",
    account_id: "Conta",
    source_account_id: "Conta de Origem",
    destination_account_id: "Conta de Destino",
    description: "Descrição",
    notes: "Observações",
    amount: "Valor",
    module: "Módulo",
    entity_id: "Entidade",
    merchant_id: "Estabelecimento"
};

/**
 * Traduz valores específicos para algo mais legível
 */
const VALUE_LABELS: Record<string, string> = {
    admin: "Administrador",
    user: "Usuário",
    demo: "Demonstração",
    true: "Ativo",
    false: "Inativo/Pendente",
    posted: "Efetivado",
    voided: "Anulado"
};

export function renderSecurityDiff(
    before: any,
    after: any,
    lookups: { users?: Record<string, string>, accounts?: Record<string, string> } = {}
) {
    if (!before || !after) return "Alteração de Segurança";

    const changes = [];

    // Lista de chaves que representam IDs e devem ser resolvidas
    const USER_KEYS = ['user_id', 'user', 'actor', 'created_by'];
    const ACCOUNT_KEYS = ['account_id', 'source_account_id', 'destination_account_id'];

    const resolveValue = (key: string, val: any) => {
        const strVal = String(val ?? 'Nulo');

        // Se for uma chave de usuário e tivermos o lookup
        if (USER_KEYS.includes(key) && lookups.users?.[strVal]) {
            return lookups.users[strVal];
        }

        // Se for uma chave de conta e tivermos o lookup
        if (ACCOUNT_KEYS.includes(key) && lookups.accounts?.[strVal]) {
            return lookups.accounts[strVal];
        }

        return VALUE_LABELS[strVal] || strVal;
    };

    // Compara as chaves do objeto 'after' com 'before'
    for (const key in after) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            // Ignora campos de sistema ou timestamp
            if (['id', 'updated_at', 'created_at'].includes(key)) continue;

            const label = FIELD_LABELS[key] || key;
            const oldVal = resolveValue(key, before[key]);
            const newVal = resolveValue(key, after[key]);

            changes.push(`${label}: ${oldVal} ➔ ${newVal}`);
        }
    }

    return changes.length > 0 ? changes.join(" | ") : "Ajuste técnico de sistema";
}
