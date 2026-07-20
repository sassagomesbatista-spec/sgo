import { describe, expect, it } from "vitest";
import {
  calcularSaldoAtual,
  calcularSaldoComprometido,
  calcularSaldoProjetado,
  calcularPercentualOrcamentoUtilizado,
  calcularPercentualComprometido,
  calcularAtrasoTarefaDias,
  calcularProgressoFisico,
  calcularReservaContingencia,
  calcularVariacaoOrcamento,
  diasEntre,
  type LancamentoCalc,
  type TarefaCalc,
} from "./calculos";

describe("calcularSaldoAtual", () => {
  it("soma entradas pagas e subtrai saídas pagas, ignorando previstos", () => {
    const lancamentos: LancamentoCalc[] = [
      { tipo: "entrada", status: "pago", valorCentavos: 100_000 },
      { tipo: "saida", status: "pago", valorCentavos: 30_000 },
      { tipo: "saida", status: "previsto", valorCentavos: 999_999 },
    ];
    expect(calcularSaldoAtual(lancamentos)).toBe(70_000);
  });

  it("considera pago_parcialmente como pago", () => {
    const lancamentos: LancamentoCalc[] = [
      { tipo: "entrada", status: "pago", valorCentavos: 100_000 },
      { tipo: "saida", status: "pago_parcialmente", valorCentavos: 10_000 },
    ];
    expect(calcularSaldoAtual(lancamentos)).toBe(90_000);
  });
});

describe("calcularSaldoComprometido", () => {
  it("subtrai despesas contratadas ainda não pagas do saldo atual", () => {
    const lancamentos: LancamentoCalc[] = [
      { tipo: "entrada", status: "pago", valorCentavos: 100_000 },
      { tipo: "saida", status: "contratado", valorCentavos: 20_000 },
      { tipo: "saida", status: "aguardando_pagamento", valorCentavos: 5_000 },
    ];
    expect(calcularSaldoComprometido(lancamentos)).toBe(100_000 - 25_000);
  });
});

describe("calcularSaldoProjetado", () => {
  it("é entradas previstas menos todas as despesas previstas, ignorando canceladas", () => {
    const lancamentos: LancamentoCalc[] = [
      { tipo: "entrada", status: "pago", valorCentavos: 100_000 },
      { tipo: "entrada", status: "cancelado", valorCentavos: 999_999 },
      { tipo: "saida", status: "previsto", valorCentavos: 40_000 },
      { tipo: "saida", status: "cancelado", valorCentavos: 999_999 },
    ];
    expect(calcularSaldoProjetado(lancamentos)).toBe(60_000);
  });
});

describe("percentuais", () => {
  it("calcula % do orçamento utilizado", () => {
    expect(calcularPercentualOrcamentoUtilizado(50_000, 200_000)).toBeCloseTo(0.25);
  });

  it("retorna 0 quando orçamento total é 0 (evita divisão por zero)", () => {
    expect(calcularPercentualOrcamentoUtilizado(50_000, 0)).toBe(0);
  });

  it("calcula % comprometido", () => {
    expect(calcularPercentualComprometido(80_000, 200_000)).toBeCloseTo(0.4);
  });
});

describe("calcularAtrasoTarefaDias", () => {
  it("retorna 0 para tarefa concluída, mesmo que a data planejada já tenha passado", () => {
    const tarefa: TarefaCalc = {
      status: "concluido",
      percentualConcluido: 100,
      dataTerminoPlanejada: new Date("2026-01-01"),
      dataTerminoReal: new Date("2026-01-10"),
    };
    expect(calcularAtrasoTarefaDias(tarefa, new Date("2026-02-01"))).toBe(0);
  });

  it("calcula dias de atraso para tarefa em andamento", () => {
    const tarefa: TarefaCalc = {
      status: "em_andamento",
      percentualConcluido: 50,
      dataTerminoPlanejada: new Date("2026-01-01"),
      dataTerminoReal: null,
    };
    expect(calcularAtrasoTarefaDias(tarefa, new Date("2026-01-11"))).toBe(10);
  });

  it("retorna negativo quando a tarefa está adiantada em relação ao planejado", () => {
    const tarefa: TarefaCalc = {
      status: "em_andamento",
      percentualConcluido: 50,
      dataTerminoPlanejada: new Date("2026-01-10"),
      dataTerminoReal: null,
    };
    expect(calcularAtrasoTarefaDias(tarefa, new Date("2026-01-05"))).toBe(-5);
  });
});

describe("calcularProgressoFisico", () => {
  it("faz média ponderada pelo custo previsto, ignorando canceladas", () => {
    const tarefas = [
      { status: "concluido", percentualConcluido: 100, dataTerminoPlanejada: new Date(), dataTerminoReal: new Date(), custoPrevistoCentavos: 100_000 },
      { status: "em_andamento", percentualConcluido: 50, dataTerminoPlanejada: new Date(), dataTerminoReal: null, custoPrevistoCentavos: 100_000 },
      { status: "cancelado", percentualConcluido: 0, dataTerminoPlanejada: new Date(), dataTerminoReal: null, custoPrevistoCentavos: 1_000_000 },
    ];
    // (100000*1.0 + 100000*0.5) / (100000+100000) = 0.75
    expect(calcularProgressoFisico(tarefas)).toBeCloseTo(0.75);
  });

  it("retorna 0 quando não há tarefas", () => {
    expect(calcularProgressoFisico([])).toBe(0);
  });
});

describe("calcularReservaContingencia", () => {
  it("calcula o valor da reserva a partir do percentual", () => {
    expect(calcularReservaContingencia(500_000_00, 12)).toBe(6_000_000);
  });
});

describe("calcularVariacaoOrcamento", () => {
  it("retorna estimado, realizado e a variação (realizado - estimado)", () => {
    const itens = [
      { valorEstimadoCentavos: 10_000, valorContratadoCentavos: 0, valorPagoCentavos: 12_000 },
      { valorEstimadoCentavos: 5_000, valorContratadoCentavos: 0, valorPagoCentavos: 4_000 },
    ];
    const resultado = calcularVariacaoOrcamento(itens);
    expect(resultado.estimado).toBe(15_000);
    expect(resultado.realizado).toBe(16_000);
    expect(resultado.variacao).toBe(1_000);
  });
});

describe("diasEntre", () => {
  it("calcula a diferença em dias entre duas datas", () => {
    expect(diasEntre(new Date("2026-01-01"), new Date("2026-01-11"))).toBe(10);
  });
});
