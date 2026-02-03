/**
 * Account name constants to prevent breakage if names are changed
 */
export const ACCOUNT_NAMES = {
  BOLSINHA: "Espécie",
  RESERVA: "Cofre",
  BB_ASSOCIACAO_PIX: "BB Associação (PIX)",
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
  bolsinha_transfer: "Movimentação Saldo",
  bolsinha_deposito_pix: "Depósito PIX",
  bolsinha_ajuste: "Ajuste Espécie",
  reserva_ajuste: "Ajuste Cofre",
  aporte_saldo: "Aporte Saldo",
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
