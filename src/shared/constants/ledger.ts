export enum LedgerStatus {
  PENDING = "pending",
  VALIDATED = "validated",
  VOIDED = "voided",
}

export enum EntityType {
  ASSOCIACAO = "associacao",
  UE = "ue",
  CX = "cx",
}

export enum TransactionModuleKey {
  ASSOCIACAO = "associacao",
  RECURSOS = "recursos",
  MERCHANTS = "merchants",
  GRADUATIONS = "graduations",
  USERS = "users",
  DASHBOARD = "dashboard",
  TRANSACTIONS = "transactions",
  OUTROS = "outros",
}

// ACCOUNT_NAMES and LEDGER_KEYS are defined in @/shared/lib/constants.ts (canonical source)
