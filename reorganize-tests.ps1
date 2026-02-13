$dirs = @(
    "src/shared/lib/__tests__",
    "src/shared/components/forms/__tests__",
    "src/features/associacao/hooks/__tests__",
    "src/features/associacao/pages/__tests__",
    "src/features/recursos/hooks/__tests__",
    "src/features/recursos/pages/__tests__",
    "src/features/recursos/components/__tests__",
    "src/features/transactions/hooks/__tests__",
    "src/features/transactions/pages/__tests__",
    "src/features/transactions/components/__tests__",
    "src/features/auth/contexts/__tests__",
    "src/features/graduations/services/__tests__",
    "src/features/graduations/pages/__tests__",
    "src/features/merchants/hooks/__tests__"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
    }
}

function Move-Test($src, $dest) {
    if (Test-Path $src) {
        Move-Item -Path $src -Destination $dest -Force
        Write-Host "Moved: $src -> $dest"
    } else {
        Write-Host "Not found: $src"
    }
}

Move-Test "src/test/utils/currency.test.ts" "src/shared/lib/__tests__/currency.test.ts"
Move-Test "src/test/utils/date-utils.test.ts" "src/shared/lib/__tests__/date-utils.test.ts"
Move-Test "src/test/utils/search-filter.test.ts" "src/shared/lib/__tests__/search-filter.test.ts"
Move-Test "src/test/utils/sorting.test.ts" "src/shared/lib/__tests__/sorting.test.ts"
Move-Test "src/test/utils/account-display.test.ts" "src/shared/lib/__tests__/account-display.test.ts"
Move-Test "src/test/utils/domain-balances.test.ts" "src/shared/lib/__tests__/domain-balances.test.ts"
Move-Test "src/test/components/CurrencyInput.test.tsx" "src/shared/components/forms/__tests__/CurrencyInput.test.tsx"
Move-Test "src/test/components/DateInput.test.tsx" "src/shared/components/forms/__tests__/DateInput.test.tsx"
Move-Test "src/test/hooks/use-associacao-actions.test.tsx" "src/features/associacao/hooks/__tests__/use-associacao-actions.test.tsx"
Move-Test "src/test/pages/AssociacaoPage.test.tsx" "src/features/associacao/pages/__tests__/AssociacaoPage.test.tsx"
Move-Test "src/test/hooks/use-saldos-actions.test.tsx" "src/features/recursos/hooks/__tests__/use-saldos-actions.test.tsx"
Move-Test "src/test/pages/RecursosPage.test.tsx" "src/features/recursos/pages/__tests__/RecursosPage.test.tsx"
Move-Test "src/test/pages/SaldosPage.test.tsx" "src/features/recursos/pages/__tests__/SaldosPage.test.tsx"
Move-Test "src/test/components/GastoRecursoDialog.test.tsx" "src/features/recursos/components/__tests__/GastoRecursoDialog.test.tsx"
Move-Test "src/test/components/ConsumoSaldoDialog.test.tsx" "src/features/recursos/components/__tests__/ConsumoSaldoDialog.test.tsx"
Move-Test "src/test/hooks/use-entity-transactions.test.tsx" "src/features/transactions/hooks/__tests__/use-entity-transactions.test.tsx"
Move-Test "src/test/pages/RelatoriosPage.test.tsx" "src/features/transactions/pages/__tests__/RelatoriosPage.test.tsx"
Move-Test "src/test/pages/LogPage.test.tsx" "src/features/transactions/pages/__tests__/LogPage.test.tsx"
Move-Test "src/test/components/TransactionTable.test.tsx" "src/features/transactions/components/__tests__/TransactionTable.test.tsx"
Move-Test "src/test/hooks/use-merchants.test.tsx" "src/features/merchants/hooks/__tests__/use-merchants.test.tsx"
