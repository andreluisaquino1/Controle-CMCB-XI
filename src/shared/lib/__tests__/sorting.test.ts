import { describe, it, expect } from "vitest";

// The sorting logic extracted from SaldosPage.tsx
const sortAccounts = (accounts: { name: string }[]) => {
    const order = ["Espécie", "PIX (Conta BB)", "Conta Digital (Escolaweb)", "Cofre"];
    return [...accounts].sort((a, b) => {
        const idxA = order.indexOf(a.name);
        const idxB = order.indexOf(b.name);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        return a.name.localeCompare(b.name);
    });
};

describe("Account Sorting Logic", () => {
    it("should sort accounts in the correct order: Espécie, PIX, Conta Digital, Cofre", () => {
        const accounts = [
            { id: "4", name: "Cofre" },
            { id: "2", name: "PIX (Conta BB)" },
            { id: "3", name: "Conta Digital (Escolaweb)" },
            { id: "1", name: "Espécie" },
            { id: "5", name: "Z-Other Account" }
        ];

        const sorted = sortAccounts(accounts);

        expect(sorted[0].name).toBe("Espécie");
        expect(sorted[1].name).toBe("PIX (Conta BB)");
        expect(sorted[2].name).toBe("Conta Digital (Escolaweb)");
        expect(sorted[3].name).toBe("Cofre");
        expect(sorted[4].name).toBe("Z-Other Account");
    });

    it("should put unrecognized accounts at the end sorted alphabetically", () => {
        const accounts = [
            { name: "Outro B" },
            { name: "Espécie" },
            { name: "Outro A" }
        ];

        const sorted = sortAccounts(accounts);

        expect(sorted[0].name).toBe("Espécie");
        expect(sorted[1].name).toBe("Outro A");
        expect(sorted[2].name).toBe("Outro B");
    });

    it("should handle case where some accounts are missing", () => {
        const accounts = [
            { name: "Cofre" },
            { name: "Espécie" }
        ];

        const sorted = sortAccounts(accounts);

        expect(sorted[0].name).toBe("Espécie");
        expect(sorted[1].name).toBe("Cofre");
    });
});
