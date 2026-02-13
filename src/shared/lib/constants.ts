/**
 * Account name constants to prevent breakage if names are changed
 */
export const ACCOUNT_NAMES = {
  ESPECIE: "Espécie",
  PIX: "PIX (Conta BB)",
  CONTA_DIGITAL: "Conta Digital (Escolaweb)",
  COFRE: "Cofre",
} as const;

/**
 * Ledger keys for internal standardization
 */
export const LEDGER_KEYS = {
  CASH: "cash",
  PIX: "pix_bb",
  DIGITAL: "digital_escolaweb",
  SAFE: "safe",
  UE: "resource_ue",
  CX: "resource_cx",
  EXTERNAL_INCOME: "ext:income",
  EXTERNAL_EXPENSE: "ext:expense",
} as const;

export const ACCOUNT_NAME_TO_LEDGER_KEY: Record<string, string> = {
  [ACCOUNT_NAMES.ESPECIE]: LEDGER_KEYS.CASH,
  [ACCOUNT_NAMES.PIX]: LEDGER_KEYS.PIX,
  [ACCOUNT_NAMES.CONTA_DIGITAL]: LEDGER_KEYS.DIGITAL,
  [ACCOUNT_NAMES.COFRE]: LEDGER_KEYS.SAFE,
  // Mapping for Resources (Virtual Accounts for UE/CX)
  "Conta UE": LEDGER_KEYS.UE,
  "Conta CX": LEDGER_KEYS.CX,
};

export const LEDGER_KEY_TO_ACCOUNT_NAME: Record<string, string> = {
  ...Object.entries(ACCOUNT_NAME_TO_LEDGER_KEY).reduce((acc, [name, key]) => {
    acc[key] = name;
    return acc;
  }, {} as Record<string, string>),
  "external_expense": "Gasto Externo",
};

/**
 * Entity names
 */
export const ENTITY_NAMES = {
  ASSOCIACAO: "Associação CMCB-XI",
  UE: "Unidade Executora CMCB-XI",
  CX: "Caixa Escolar CMCB-XI",
} as const;

export const ENTITY_TYPE = {
  ASSOCIACAO: "associacao",
  UE: "ue",
  CX: "cx",
} as const;

/**
 * Transaction module labels for display
 */
export const MODULE_LABELS: Record<string, string> = {
  mensalidade: "Mensalidade",
  gasto_associacao: "Despesa Associação",
  especie_transfer: "Movimentação entre Contas",
  assoc_transfer: "Movimentação Associação",
  especie_deposito_pix: "Depósito PIX",
  especie_ajuste: "Ajuste de Saldo (Espécie)",
  pix_ajuste: "Ajuste de Saldo (PIX)",
  cofre_ajuste: "Ajuste de Saldo (Cofre)",
  conta_digital_ajuste: "Ajuste Conta Digital",
  conta_digital_taxa: "Taxa Escolaweb",
  consumo_saldo: "Gasto Estabelecimento",
  pix_direto_uecx: "Gasto de Recurso",
  aporte_estabelecimento_recurso: "Aporte em Estabelecimento (Recurso)",
  mensalidade_pix: "Mensalidade (PIX)",
  pix_nao_identificado: "PIX Não Identificado",
  taxa_pix_bb: "Taxas PIX BB",
} as const;

/**
 * User roles labels
 */
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  user: "Usuário",
  demo: "Demonstração",
  secretaria: "Secretaria",
} as const;

/**
 * Fund origins
 */
export const FUND_ORIGINS = {
  UE: "UE",
  CX: "CX",
} as const;

/**
 * Standard account display order: Espécie - PIX - Conta Digital - Cofre
 */
export const ACCOUNT_ORDER = [
  "Espécie",
  "PIX (Conta BB)",
  "Conta Digital (Escolaweb)",
  "Cofre",
] as const;

/**
 * Sort accounts by standard order: Espécie - PIX - Conta Digital - Cofre
 * Accounts not in the order list are sorted alphabetically at the end
 */
export function sortByAccountOrder<T extends { name: string }>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    const idxA = ACCOUNT_ORDER.indexOf(a.name as typeof ACCOUNT_ORDER[number]);
    const idxB = ACCOUNT_ORDER.indexOf(b.name as typeof ACCOUNT_ORDER[number]);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}
