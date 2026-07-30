import { describe, expect, it } from "vitest";
import { centavosParaReais, reaisParaCentavos, formatarMoeda } from "./money";

describe("conversão de centavos", () => {
  it("converte centavos para reais e vice-versa sem perder precisão", () => {
    expect(centavosParaReais(150_055)).toBeCloseTo(1500.55);
    expect(reaisParaCentavos(1500.55)).toBe(150_055);
  });
});

describe("formatarMoeda", () => {
  it("formata centavos como R$ no padrão brasileiro", () => {
    // Normaliza espaços (Intl.NumberFormat pode usar U+00A0/U+202F entre "R$" e o valor).
    const normalizado = formatarMoeda(123_456).replace(/\s+/g, " ");
    expect(normalizado).toBe("R$ 1.234,56");
  });
});
