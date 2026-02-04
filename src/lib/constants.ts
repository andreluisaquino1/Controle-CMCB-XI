/**
 * Account name constants to prevent breakage if names are changed
 */
export const ACCOUNT_NAMES = {
  ESPECIE: "Espécie",
  COFRE: "Cofre",
  PIX: "PIX",
} as const;

/**
 * Entity names
 */
export const ENTITY_NAMES = {
  ASSOCIACAO: "Associação CMCB-XI",
  UE: "Unidade Executora CMCB-XI",
  CX: "Caixa Escolar CMCB-XI",
} as const;

/**
 * Transaction module labels for display
 */
export const MODULE_LABELS: Record<string, string> = {
  mensalidade: "Mensalidade",
  gasto_associacao: "Despesa Associação",
  especie_transfer: "Movimentação entre Contas",
  especie_deposito_pix: "Depósito PIX",
  especie_ajuste: "Ajuste de Saldo (Espécie)",
  cofre_ajuste: "Ajuste de Saldo (Cofre)",
  consumo_saldo: "Gasto Estabelecimento",
  pix_direto_uecx: "Entrada/Saída (PIX Direto)",
} as const;

/**
 * Fund origins
 */
export const FUND_ORIGINS = {
  UE: "UE",
  CX: "CX",
} as const;
