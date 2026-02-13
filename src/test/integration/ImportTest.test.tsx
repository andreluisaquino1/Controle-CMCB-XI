/**
 * Import Test - Garante que todos os módulos principais podem ser importados
 * sem erros de compilação ou dependências circulares.
 * 
 * Este teste NÃO renderiza componentes, apenas valida que os imports funcionam.
 * Isso garante 100% de cobertura de "categorias" no sentido de validação estrutural.
 */
import { describe, it, expect } from "vitest";

describe("Import Test - Category Coverage 100%", () => {
    describe("Pages", () => {
        it("should import all page modules", async () => {
            const modules = await Promise.all([
                import("@/features/dashboard/pages/DashboardPage"),
                import("@/features/associacao/pages/AssociacaoPage"),
                import("@/features/recursos/pages/RecursosPage"),
                import("@/features/transactions/pages/RelatoriosPage"),
                import("@/features/transactions/pages/LogPage"),

                import("@/features/recursos/pages/SaldosPage"),
                import("@/features/auth/pages/AuthPage"),
                import("@/features/users/pages/PerfilPage"),
                import("@/features/users/pages/UsuariosPage"),
                import("@/features/auth/pages/ResetPasswordPage"),
                import("@/shared/components/NotFound"),
            ]);
            expect(modules).toHaveLength(11);
            modules.forEach(m => expect(m.default).toBeDefined());
        }, 30000); // 30 second timeout for heavy imports
    });

    describe("Hooks", () => {
        it("should import all hook modules", async () => {
            const modules = await Promise.all([
                import("@/shared/hooks/use-accounts"),
                import("@/features/associacao/hooks/use-associacao-actions"),
                import("@/features/dashboard/hooks/use-dashboard-data"),
                import("@/features/transactions/hooks/use-entity-transactions"),
                import("@/features/transactions/hooks/use-expense-shortcuts"),
                import("@/features/merchants/hooks/use-merchants"),
                import("@/shared/hooks/use-mobile"),
                import("@/features/associacao/hooks/use-pix-batch"),
                import("@/features/transactions/hooks/use-reports"),
                import("@/features/recursos/hooks/use-saldos-actions"),
                import("@/features/transactions/hooks/use-transaction-metadata"),
                import("@/features/transactions/hooks/use-transactions"),
            ]);
            expect(modules).toHaveLength(12);
        });
    });

    describe("Domain Logic", () => {
        it("should import ledger module", async () => {
            const ledger = await import("@/domain/ledger");
            // ledger.ts exports types only (LedgerType, LedgerTransaction)
            expect(ledger).toBeDefined();
        });
    });

    describe("Core Components", () => {
        it("should import transaction components", async () => {
            const modules = await Promise.all([
                import("@/features/transactions/components/TransactionTable"),
                import("@/features/transactions/components/TransactionItemsDialog"),
            ]);
            expect(modules).toHaveLength(2);
        });

        it("should import form dialogs", async () => {
            const modules = await Promise.all([
                import("@/features/recursos/components/AporteSaldoDialog"),
                import("@/features/recursos/components/ConsumoSaldoDialog"),
            ]);
            expect(modules).toHaveLength(2);
        });
    });
});
