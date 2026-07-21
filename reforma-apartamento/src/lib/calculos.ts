// Regras financeiras e de cronograma centralizadas.
// Todas as funções são puras (sem I/O) para permitir testes unitários isolados.
// Valores sempre em centavos (Int).

export type LancamentoCalc = {
  tipo: string; // "entrada" | "saida"
  status: string;
  valorCentavos: number;
};

export type OrcamentoItemCalc = {
  valorEstimadoCentavos: number;
  valorContratadoCentavos: number;
  valorPagoCentavos: number;
};

export type TarefaCalc = {
  status: string;
  percentualConcluido: number;
  dataTerminoPlanejada: Date;
  dataTerminoReal: Date | null;
};

const STATUS_PAGO = new Set(["pago", "pago_parcialmente"]);
const STATUS_CONTRATADO_NAO_PAGO = new Set(["contratado", "aguardando_pagamento", "vencido"]);
const STATUS_PREVISTO = new Set([
  "previsto",
  "em_cotacao",
  "aguardando_aprovacao",
  "aprovado",
  "contratado",
  "aguardando_pagamento",
  "pago_parcialmente",
  "vencido",
]);

/** Saldo atual = entradas recebidas - saídas pagas. */
export function calcularSaldoAtual(lancamentos: LancamentoCalc[]): number {
  let saldo = 0;
  for (const l of lancamentos) {
    if (!STATUS_PAGO.has(l.status)) continue;
    saldo += l.tipo === "entrada" ? l.valorCentavos : -l.valorCentavos;
  }
  return saldo;
}

/** Saldo comprometido = saldo atual - despesas contratadas ainda não pagas. */
export function calcularSaldoComprometido(lancamentos: LancamentoCalc[]): number {
  const saldoAtual = calcularSaldoAtual(lancamentos);
  const contratadoNaoPago = lancamentos
    .filter((l) => l.tipo === "saida" && STATUS_CONTRATADO_NAO_PAGO.has(l.status))
    .reduce((acc, l) => acc + l.valorCentavos, 0);
  return saldoAtual - contratadoNaoPago;
}

/** Saldo projetado = total de entradas previstas - todas as despesas previstas. */
export function calcularSaldoProjetado(lancamentos: LancamentoCalc[]): number {
  const entradas = lancamentos
    .filter((l) => l.tipo === "entrada" && l.status !== "cancelado")
    .reduce((acc, l) => acc + l.valorCentavos, 0);
  const saidas = lancamentos
    .filter((l) => l.tipo === "saida" && l.status !== "cancelado")
    .reduce((acc, l) => acc + l.valorCentavos, 0);
  return entradas - saidas;
}

export function totalPorTipoEStatus(
  lancamentos: LancamentoCalc[],
  tipo: "entrada" | "saida",
  statuses: string[]
): number {
  const set = new Set(statuses);
  return lancamentos
    .filter((l) => l.tipo === tipo && set.has(l.status))
    .reduce((acc, l) => acc + l.valorCentavos, 0);
}

export function totalPago(lancamentos: LancamentoCalc[]): number {
  return totalPorTipoEStatus(lancamentos, "saida", ["pago", "pago_parcialmente"]);
}

export function totalContratado(lancamentos: LancamentoCalc[]): number {
  return totalPorTipoEStatus(lancamentos, "saida", [
    "contratado",
    "aguardando_pagamento",
    "pago_parcialmente",
    "pago",
    "vencido",
  ]);
}

export function totalPrevisto(lancamentos: LancamentoCalc[]): number {
  return totalPorTipoEStatus(lancamentos, "saida", Array.from(STATUS_PREVISTO));
}

/**
 * Contratado e pago de um item de orçamento, calculados a partir dos
 * lançamentos vinculados a ele (nunca digitados manualmente) — garante que
 * o orçamento nunca dessincroniza do extrato financeiro real.
 */
export function calcularContratadoEPagoDoItem(lancamentosDoItem: LancamentoCalc[]): {
  contratado: number;
  pago: number;
} {
  return {
    contratado: totalContratado(lancamentosDoItem),
    pago: totalPago(lancamentosDoItem),
  };
}

export function totalEntradas(lancamentos: LancamentoCalc[]): number {
  return lancamentos
    .filter((l) => l.tipo === "entrada" && l.status !== "cancelado")
    .reduce((acc, l) => acc + l.valorCentavos, 0);
}

/** Variação do orçamento = valor realizado (pago) - valor orçado (estimado). */
export function calcularVariacaoOrcamento(
  itens: OrcamentoItemCalc[]
): { estimado: number; realizado: number; variacao: number } {
  const estimado = itens.reduce((acc, i) => acc + i.valorEstimadoCentavos, 0);
  const realizado = itens.reduce((acc, i) => acc + i.valorPagoCentavos, 0);
  return { estimado, realizado, variacao: realizado - estimado };
}

/** % do orçamento utilizado = valor pago / orçamento total. */
export function calcularPercentualOrcamentoUtilizado(
  valorPagoCentavos: number,
  orcamentoTotalCentavos: number
): number {
  if (orcamentoTotalCentavos <= 0) return 0;
  return valorPagoCentavos / orcamentoTotalCentavos;
}

/** % financeiro comprometido = valor contratado / orçamento total. */
export function calcularPercentualComprometido(
  valorContratadoCentavos: number,
  orcamentoTotalCentavos: number
): number {
  if (orcamentoTotalCentavos <= 0) return 0;
  return valorContratadoCentavos / orcamentoTotalCentavos;
}

/**
 * Atraso da tarefa em dias (data atual - data planejada de término),
 * apenas quando a tarefa ainda não estiver concluída. Negativo = adiantada.
 */
export function calcularAtrasoTarefaDias(tarefa: TarefaCalc, hoje: Date = new Date()): number {
  if (tarefa.status === "concluido" || tarefa.status === "cancelado") return 0;
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.floor((hoje.getTime() - tarefa.dataTerminoPlanejada.getTime()) / msPorDia);
}

/** Progresso físico = média ponderada (peso = custo previsto) do % de conclusão das tarefas. */
export function calcularProgressoFisico(
  tarefas: (TarefaCalc & { custoPrevistoCentavos: number })[]
): number {
  const naoCanceladas = tarefas.filter((t) => t.status !== "cancelado");
  if (naoCanceladas.length === 0) return 0;
  const pesoTotal = naoCanceladas.reduce((acc, t) => acc + Math.max(t.custoPrevistoCentavos, 1), 0);
  const soma = naoCanceladas.reduce(
    (acc, t) => acc + Math.max(t.custoPrevistoCentavos, 1) * (t.percentualConcluido / 100),
    0
  );
  return pesoTotal === 0 ? 0 : soma / pesoTotal;
}

export function calcularReservaContingencia(
  orcamentoTotalCentavos: number,
  percentual: number
): number {
  return Math.round(orcamentoTotalCentavos * (percentual / 100));
}

/**
 * Saldo atual de uma conta bancária = saldo inicial (numa data de referência)
 * + entradas pagas - saídas pagas vinculadas a essa conta, com data de
 * pagamento a partir da data do saldo inicial (evita contar de novo o que já
 * estava embutido no saldo inicial informado).
 */
export function calcularSaldoConta(
  saldoInicialCentavos: number,
  dataSaldoInicial: Date,
  lancamentosDaConta: (LancamentoCalc & { dataPagamento: Date | null })[]
): number {
  let saldo = saldoInicialCentavos;
  for (const l of lancamentosDaConta) {
    if (!STATUS_PAGO.has(l.status)) continue;
    if (!l.dataPagamento || l.dataPagamento < dataSaldoInicial) continue;
    saldo += l.tipo === "entrada" ? l.valorCentavos : -l.valorCentavos;
  }
  return saldo;
}

export function diasEntre(a: Date, b: Date): number {
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPorDia);
}
