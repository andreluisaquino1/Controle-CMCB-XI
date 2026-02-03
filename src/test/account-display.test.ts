import { describe, it, expect } from "vitest";
import { cleanAccountDisplayName } from "@/lib/account-display";

describe("cleanAccountDisplayName", () => {
    it("should remove UE prefix", () => {
        expect(cleanAccountDisplayName("UE - Banco do Brasil")).toBe("Banco do Brasil");
        expect(cleanAccountDisplayName("UE-Banco do Brasil")).toBe("Banco do Brasil");
    });

    it("should remove CX prefix", () => {
        expect(cleanAccountDisplayName("CX - Caixa Escolar")).toBe("Caixa Escolar");
        expect(cleanAccountDisplayName("CX-Caixa Escolar")).toBe("Caixa Escolar");
    });

    it("should remove Unidade Executora prefix", () => {
        expect(cleanAccountDisplayName("Unidade Executora - Banco")).toBe("Banco");
    });

    it("should remove Caixa Escolar prefix", () => {
        expect(cleanAccountDisplayName("Caixa Escolar - Banco")).toBe("Banco");
    });

    it("should return same name if no prefix", () => {
        expect(cleanAccountDisplayName("Espécie")).toBe("Espécie");
        expect(cleanAccountDisplayName("BB Associação (PIX)")).toBe("BB Associação (PIX)");
    });

    it("should handle case insensitivity in prefixes", () => {
        expect(cleanAccountDisplayName("ue - Banco")).toBe("Banco");
        expect(cleanAccountDisplayName("cx - Banco")).toBe("Banco");
    });
});
