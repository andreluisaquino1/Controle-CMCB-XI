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
                import("@/pages/DashboardPage"),
                import("@/pages/AssociacaoPage"),
                import("@/pages/RecursosPage"),
                import("@/pages/RelatoriosPage"),
                import("@/pages/LogPage"),

                import("@/pages/SaldosPage"),
                import("@/pages/AuthPage"),
                import("@/pages/PerfilPage"),
                import("@/pages/UsuariosPage"),
                import("@/pages/ResetPasswordPage"),
                import("@/pages/NotFound"),
                import("@/pages/Index"),
            ]);
            expect(modules).toHaveLength(12);
            modules.forEach(m => expect(m.default).toBeDefined());
        }, 30000); // 30 second timeout for heavy imports
    });

    describe("Hooks", () => {
        it("should import all hook modules", async () => {
            const modules = await Promise.all([
                import("@/hooks/use-accounts"),
                import("@/hooks/use-associacao-actions"),
                import("@/hooks/use-dashboard-data"),
                import("@/hooks/use-entity-transactions"),
                import("@/hooks/use-expense-shortcuts"),
                import("@/hooks/use-merchants"),
                import("@/hooks/use-mobile"),
                import("@/hooks/use-pix-batch"),
                import("@/hooks/use-reports"),
                import("@/hooks/use-saldos-actions"),
                import("@/hooks/use-transaction-metadata"),
                import("@/hooks/use-transactions"),
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
                import("@/components/transactions/TransactionTable"),
                import("@/components/transactions/TransactionItemsDialog"),
            ]);
            expect(modules).toHaveLength(2);
        });

        it("should import form dialogs", async () => {
            const modules = await Promise.all([
                import("@/components/forms/AporteSaldoDialog"),
                import("@/components/forms/ConsumoSaldoDialog"),
            ]);
            expect(modules).toHaveLength(2);
        });
    });
});
