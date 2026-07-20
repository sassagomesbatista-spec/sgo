import { describe, expect, it } from "vitest";
import { paraCsv, parseCsv } from "./csv";

describe("paraCsv", () => {
  it("escapa campos com vírgula, aspas ou quebra de linha", () => {
    const csv = paraCsv(["a", "b"], [["valor, com vírgula", 'valor com "aspas"']]);
    expect(csv).toBe('a,b\n"valor, com vírgula","valor com ""aspas"""');
  });
});

describe("parseCsv", () => {
  it("faz o roundtrip de um CSV gerado por paraCsv", () => {
    const linhas = [
      ["tipo", "descricao", "valor"],
      ["saida", "Compra, com vírgula", "100.00"],
      ["entrada", 'Aporte "especial"', "200.00"],
    ];
    const csv = paraCsv(linhas[0], linhas.slice(1));
    const resultado = parseCsv(csv);
    expect(resultado).toEqual(linhas);
  });

  it("ignora linhas totalmente vazias", () => {
    const resultado = parseCsv("a,b\n1,2\n\n3,4\n");
    expect(resultado).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});
