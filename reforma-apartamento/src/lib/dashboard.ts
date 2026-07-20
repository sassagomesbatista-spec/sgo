import { prisma } from "@/lib/prisma";
import {
  calcularSaldoAtual,
  calcularSaldoComprometido,
  calcularSaldoProjetado,
  calcularPercentualOrcamentoUtilizado,
  calcularPercentualComprometido,
  calcularProgressoFisico,
  calcularAtrasoTarefaDias,
  totalPago,
  totalContratado,
  totalPrevisto,
  totalEntradas,
  diasEntre,
} from "@/lib/calculos";

export async function carregarDadosDashboard(projetoId: string) {
  const [projeto, lancamentos, tarefas, orcamentoItens] = await Promise.all([
    prisma.projeto.findUniqueOrThrow({ where: { id: projetoId } }),
    prisma.lancamento.findMany({
      where: { projetoId, deletedAt: null },
      include: { categoria: true, ambiente: true, fornecedor: true, etapa: true },
      orderBy: { dataVencimento: "asc" },
    }),
    prisma.tarefa.findMany({
      where: { projetoId, deletedAt: null },
      include: { ambiente: true, fornecedor: true },
      orderBy: { dataInicioPlanejada: "asc" },
    }),
    prisma.orcamentoItem.findMany({
      where: { projetoId, deletedAt: null },
      include: { categoria: true, ambiente: true },
    }),
  ]);

  const hoje = new Date();

  const saldoAtual = calcularSaldoAtual(lancamentos);
  const saldoComprometido = calcularSaldoComprometido(lancamentos);
  const saldoProjetado = calcularSaldoProjetado(lancamentos);
  const valorPago = totalPago(lancamentos);
  const valorContratado = totalContratado(lancamentos);
  const valorPrevisto = totalPrevisto(lancamentos);
  const valorEntradas = totalEntradas(lancamentos);
  const percentualOrcamentoUtilizado = calcularPercentualOrcamentoUtilizado(
    valorPago,
    projeto.orcamentoTotalCentavos
  );
  const percentualComprometido = calcularPercentualComprometido(
    valorContratado,
    projeto.orcamentoTotalCentavos
  );

  const progressoFisico = calcularProgressoFisico(tarefas);
  const progressoFinanceiro = percentualOrcamentoUtilizado;

  const prazoOriginalDias = diasEntre(projeto.dataInicioPrevista, projeto.dataTerminoPrevista);
  const diasDecorridos = Math.max(0, diasEntre(projeto.dataInicioPrevista, hoje));
  const percentualPrazoConsumido = prazoOriginalDias > 0 ? Math.min(1, diasDecorridos / prazoOriginalDias) : 0;
  const terminoAtual = projeto.dataTerminoRevisada ?? projeto.dataTerminoPrevista;
  const diasAtrasoGeral = diasEntre(projeto.dataTerminoPrevista, terminoAtual);
  const diasRestantes = diasEntre(hoje, terminoAtual);

  const pagamentosVencidos = lancamentos.filter((l) => l.status === "vencido");
  const pagamentosFuturos = (dias: number) => {
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + dias);
    return lancamentos.filter(
      (l) =>
        l.tipo === "saida" &&
        l.dataVencimento &&
        l.dataVencimento >= hoje &&
        l.dataVencimento <= limite &&
        !["pago", "cancelado"].includes(l.status)
    );
  };

  const proximos7 = pagamentosFuturos(7);
  const proximos15 = pagamentosFuturos(15);
  const proximos30 = pagamentosFuturos(30);

  // Despesas por ambiente (baseado no valor pago; cai back pra estimado quando nada pago ainda)
  const porAmbiente = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo !== "saida") continue;
    const nome = l.ambiente?.nome ?? "Sem ambiente";
    porAmbiente.set(nome, (porAmbiente.get(nome) ?? 0) + l.valorCentavos);
  }
  const despesasPorAmbiente = Array.from(porAmbiente.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);

  const porCategoria = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo !== "saida") continue;
    const nome = l.categoria?.nome ?? "Sem categoria";
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + l.valorCentavos);
  }
  const despesasPorCategoria = Array.from(porCategoria.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const porFornecedor = new Map<string, number>();
  for (const l of lancamentos) {
    if (l.tipo !== "saida" || !l.fornecedor) continue;
    porFornecedor.set(l.fornecedor.nome, (porFornecedor.get(l.fornecedor.nome) ?? 0) + l.valorCentavos);
  }
  const despesasPorFornecedor = Array.from(porFornecedor.entries())
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // Fluxo de caixa mensal (histórico + previsão), agrupado por mês de vencimento
  const mesesMap = new Map<string, { entradas: number; saidas: number }>();
  for (const l of lancamentos) {
    const data = l.dataVencimento ?? l.dataLancamento;
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    const atual = mesesMap.get(chave) ?? { entradas: 0, saidas: 0 };
    if (l.tipo === "entrada") atual.entradas += l.valorCentavos;
    else atual.saidas += l.valorCentavos;
    mesesMap.set(chave, atual);
  }
  const fluxoCaixaMensal = Array.from(mesesMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([mes, valores]) => ({ mes, ...valores }));

  // Evolução acumulada: estimado (orçamento) x pago, ao longo dos meses de vencimento
  let acumuladoPago = 0;
  const evolucaoAcumulada = fluxoCaixaMensal.map((m) => {
    acumuladoPago += m.saidas;
    return { mes: m.mes, acumulado: acumuladoPago };
  });

  const orcamentoEstimadoTotal = orcamentoItens.reduce((acc, i) => acc + i.valorEstimadoCentavos, 0);

  // Alertas
  type Alerta = { titulo: string; detalhe: string; severidade: "alta" | "media" };
  const alertas: Alerta[] = [];

  if (valorPago > projeto.orcamentoTotalCentavos) {
    alertas.push({
      titulo: "Orçamento ultrapassado",
      detalhe: "O valor pago já superou o orçamento total do projeto.",
      severidade: "alta",
    });
  }

  for (const item of orcamentoItens) {
    if (item.valorEstimadoCentavos <= 0) continue;
    const consumido = item.valorPagoCentavos / item.valorEstimadoCentavos;
    if (consumido > 1) {
      alertas.push({
        titulo: `Item "${item.nome}" acima do orçamento`,
        detalhe: `Pago ${(consumido * 100).toFixed(0)}% do estimado.`,
        severidade: "alta",
      });
    } else if (consumido >= 0.85) {
      alertas.push({
        titulo: `Item "${item.nome}" perto do limite`,
        detalhe: `Já consumiu ${(consumido * 100).toFixed(0)}% do valor estimado.`,
        severidade: "media",
      });
    }
  }

  for (const item of orcamentoItens) {
    if (item.valorEstimadoCentavos > 0 && item.valorContratadoCentavos > item.valorEstimadoCentavos * 1.2) {
      alertas.push({
        titulo: `Custo contratado muito acima do estimado: ${item.nome}`,
        detalhe: `Estimado ${item.valorEstimadoCentavos / 100} vs contratado ${item.valorContratadoCentavos / 100}.`,
        severidade: "alta",
      });
    }
  }

  for (const l of pagamentosVencidos) {
    alertas.push({
      titulo: `Pagamento vencido: ${l.descricao}`,
      detalhe: `Venceu em ${l.dataVencimento?.toLocaleDateString("pt-BR")}.`,
      severidade: "alta",
    });
  }

  for (const l of proximos7.filter((l) => l.status !== "vencido")) {
    alertas.push({
      titulo: `Pagamento próximo do vencimento: ${l.descricao}`,
      detalhe: `Vence em ${l.dataVencimento?.toLocaleDateString("pt-BR")}.`,
      severidade: "media",
    });
  }

  for (const t of tarefas) {
    const atrasoDias = calcularAtrasoTarefaDias(t, hoje);
    if (t.status !== "concluido" && t.status !== "cancelado" && atrasoDias > 0) {
      alertas.push({
        titulo: `Etapa atrasada: ${t.titulo}`,
        detalhe: `${atrasoDias} dia(s) além do planejado.`,
        severidade: "alta",
      });
    }
    if (!t.responsavel && t.status !== "concluido" && t.status !== "cancelado") {
      alertas.push({
        titulo: `Tarefa sem responsável: ${t.titulo}`,
        detalhe: "Defina um responsável para esta etapa.",
        severidade: "media",
      });
    }
    if (t.custoPrevistoCentavos === 0 && t.status !== "cancelado") {
      alertas.push({
        titulo: `Custo ainda indefinido: ${t.titulo}`,
        detalhe: "Nenhum custo previsto foi cadastrado para essa etapa.",
        severidade: "media",
      });
    }
  }

  const lancamentosSemComprovante = lancamentos.filter(
    (l) => l.tipo === "saida" && ["pago", "pago_parcialmente"].includes(l.status) && !l.comprovanteUrl
  );
  for (const l of lancamentosSemComprovante.slice(0, 5)) {
    alertas.push({
      titulo: `Despesa sem comprovante: ${l.descricao}`,
      detalhe: "Anexe a nota fiscal ou comprovante correspondente.",
      severidade: "media",
    });
  }

  return {
    projeto,
    lancamentos,
    tarefas,
    orcamentoItens,
    metrics: {
      orcamentoTotalCentavos: projeto.orcamentoTotalCentavos,
      valorEntradas,
      valorPago,
      valorContratado,
      valorPrevisto,
      saldoAtual,
      saldoComprometido,
      saldoProjetado,
      percentualOrcamentoUtilizado,
      percentualComprometido,
      progressoFisico,
      progressoFinanceiro,
      orcamentoEstimadoTotal,
      prazoOriginalDias,
      percentualPrazoConsumido,
      diasAtrasoGeral,
      diasRestantes,
      qtdVencidos: pagamentosVencidos.length,
      qtdProximos7: proximos7.length,
      qtdProximos15: proximos15.length,
      qtdProximos30: proximos30.length,
      terminoAtual,
    },
    graficos: {
      despesasPorAmbiente,
      despesasPorCategoria,
      despesasPorFornecedor,
      fluxoCaixaMensal,
      evolucaoAcumulada,
    },
    alertas,
    proximosPagamentos: proximos30
      .slice()
      .sort((a, b) => (a.dataVencimento! < b.dataVencimento! ? -1 : 1))
      .slice(0, 8),
  };
}
