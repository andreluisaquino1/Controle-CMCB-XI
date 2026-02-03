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
  gasto_associacao: "Gasto Associação",
  especie_transfer: "Movimentação Saldo",
  especie_deposito_pix: "Depósito PIX",
  especie_ajuste: "Ajuste Espécie",
  cofre_ajuste: "Ajuste Cofre",
  consumo_saldo: "Consumo Saldo",
  pix_direto_uecx: "Recurso (PIX Direto)",
} as const;

/**
 * Fund origins
 */
export const FUND_ORIGINS = {
  UE: "UE",
  CX: "CX",
} as const;
