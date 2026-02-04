import { z } from "zod";

export const mensalidadeSchema = z.object({
    date: z.string().min(1, "Data é obrigatória"),
    turno: z.enum(["matutino", "vespertino"], {
        errorMap: () => ({ message: "Selecione o turno" }),
    }),
    cash: z.number().min(0),
    pix: z.number().min(0),
    obs: z.string().optional(),
}).refine((data) => data.cash > 0 || data.pix > 0, {
    message: "Informe pelo menos um valor (Espécie ou PIX)",
    path: ["cash"],
});

export const gastoAssociacaoSchema = z.object({
    date: z.string().min(1, "Data é obrigatória"),
    meio: z.enum(["cash", "pix"], {
        errorMap: () => ({ message: "Selecione o meio de pagamento" }),
    }),
    valor: z.number().gt(0, "O valor deve ser maior que zero"),
    descricao: z.string().min(3, "Mínimo de 3 caracteres"),
    obs: z.string().optional(),
});

export const movimentarSaldoSchema = z.object({
    date: z.string().min(1, "Data é obrigatória"),
    de: z.string().min(1, "Selecione a conta de origem"),
    para: z.string().min(1, "Selecione a conta de destino"),
    valor: z.number().gt(0, "O valor deve ser maior que zero"),
    descricao: z.string().min(3, "Mínimo de 3 caracteres"),
    obs: z.string().optional(),
}).refine((data) => data.de !== data.para, {
    message: "Origem e destino não podem ser iguais",
    path: ["para"],
});

export const ajusteSchema = z.object({
    date: z.string().min(1, "Data é obrigatória"),
    valor: z.number().refine((v) => v !== 0, "O valor não pode ser zero"),
    motivo: z.string().min(3, "Mínimo de 3 caracteres"),
    obs: z.string().optional(),
});

export const aporteSaldoSchema = z.object({
    date: z.string().min(1, "Data é obrigatória"),
    origem: z.enum(["ASSOC", "UE", "CX"], {
        errorMap: () => ({ message: "Selecione a origem" }),
    }),
    conta: z.string().min(1, "Selecione a conta"),
    merchant: z.string().min(1, "Selecione o estabelecimento"),
    valor: z.number().gt(0, "O valor deve ser maior que zero"),
    descricao: z.string().min(3, "Mínimo de 3 caracteres"),
    obs: z.string().optional(),
    capitalCusteio: z.enum(["capital", "custeio", ""]).optional(),
});

export const consumoSaldoSchema = z.object({
    date: z.string().min(1, "Data é obrigatória"),
    merchant: z.string().min(1, "Selecione o estabelecimento"),
    valor: z.number().gt(0, "O valor deve ser maior que zero"),
    descricao: z.string().min(3, "Mínimo de 3 caracteres"),
    obs: z.string().optional(),
});

export type MensalidadeFormData = z.infer<typeof mensalidadeSchema>;
export type GastoAssociacaoFormData = z.infer<typeof gastoAssociacaoSchema>;
export type MovimentarSaldoFormData = z.infer<typeof movimentarSaldoSchema>;
export type AjusteFormData = z.infer<typeof ajusteSchema>;
export type AporteSaldoFormData = z.infer<typeof aporteSaldoSchema>;
export type ConsumoSaldoFormData = z.infer<typeof consumoSaldoSchema>;
