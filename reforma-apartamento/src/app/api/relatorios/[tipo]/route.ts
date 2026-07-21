import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { paraCsv } from "@/lib/csv";
import { centavosParaReais } from "@/lib/money";
import { calcularAtrasoTarefaDias, calcularContratadoEPagoDoItem } from "@/lib/calculos";

function csvResponse(nomeArquivo: string, colunas: string[], linhas: (string | number)[][]) {
  const csv = paraCsv(colunas, linhas);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const { projeto } = await getProjetoAtual();
  const hoje = new Date();

  switch (tipo) {
    case "resumo-financeiro": {
      const lancamentos = await prisma.lancamento.findMany({ where: { projetoId: projeto.id, deletedAt: null } });
      const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((a, l) => a + l.valorCentavos, 0);
      const pago = lancamentos
        .filter((l) => l.tipo === "saida" && ["pago", "pago_parcialmente"].includes(l.status))
        .reduce((a, l) => a + l.valorCentavos, 0);
      const contratado = lancamentos
        .filter((l) => l.tipo === "saida" && ["contratado", "aguardando_pagamento", "pago_parcialmente", "pago", "vencido"].includes(l.status))
        .reduce((a, l) => a + l.valorCentavos, 0);
      return csvResponse(
        "resumo-financeiro.csv",
        ["indicador", "valor"],
        [
          ["orcamento_total", centavosParaReais(projeto.orcamentoTotalCentavos).toFixed(2)],
          ["total_entradas", centavosParaReais(entradas).toFixed(2)],
          ["total_pago", centavosParaReais(pago).toFixed(2)],
          ["total_contratado", centavosParaReais(contratado).toFixed(2)],
          ["saldo_disponivel", centavosParaReais(entradas - pago).toFixed(2)],
        ]
      );
    }

    case "orcamento-vs-realizado": {
      const itens = await prisma.orcamentoItem.findMany({
        where: { projetoId: projeto.id, deletedAt: null },
        include: {
          categoria: true,
          ambiente: true,
          lancamentos: { where: { deletedAt: null, tipo: "saida" } },
        },
      });
      return csvResponse(
        "orcamento-vs-realizado.csv",
        ["item", "categoria", "ambiente", "estimado", "aprovado", "contratado", "pago"],
        itens.map((i) => {
          const { contratado, pago } = calcularContratadoEPagoDoItem(i.lancamentos);
          return [
            i.nome,
            i.categoria?.nome ?? "",
            i.ambiente?.nome ?? "",
            centavosParaReais(i.valorEstimadoCentavos).toFixed(2),
            centavosParaReais(i.valorAprovadoCentavos).toFixed(2),
            centavosParaReais(contratado).toFixed(2),
            centavosParaReais(pago).toFixed(2),
          ];
        })
      );
    }

    case "despesas-por-ambiente": {
      const lancamentos = await prisma.lancamento.findMany({
        where: { projetoId: projeto.id, deletedAt: null, tipo: "saida" },
        include: { ambiente: true },
      });
      const mapa = new Map<string, number>();
      for (const l of lancamentos) {
        const nome = l.ambiente?.nome ?? "Sem ambiente";
        mapa.set(nome, (mapa.get(nome) ?? 0) + l.valorCentavos);
      }
      return csvResponse(
        "despesas-por-ambiente.csv",
        ["ambiente", "total"],
        Array.from(mapa.entries()).map(([nome, valor]) => [nome, centavosParaReais(valor).toFixed(2)])
      );
    }

    case "despesas-por-categoria": {
      const lancamentos = await prisma.lancamento.findMany({
        where: { projetoId: projeto.id, deletedAt: null, tipo: "saida" },
        include: { categoria: true },
      });
      const mapa = new Map<string, number>();
      for (const l of lancamentos) {
        const nome = l.categoria?.nome ?? "Sem categoria";
        mapa.set(nome, (mapa.get(nome) ?? 0) + l.valorCentavos);
      }
      return csvResponse(
        "despesas-por-categoria.csv",
        ["categoria", "total"],
        Array.from(mapa.entries()).map(([nome, valor]) => [nome, centavosParaReais(valor).toFixed(2)])
      );
    }

    case "despesas-por-fornecedor": {
      const lancamentos = await prisma.lancamento.findMany({
        where: { projetoId: projeto.id, deletedAt: null, tipo: "saida" },
        include: { fornecedor: true },
      });
      const mapa = new Map<string, number>();
      for (const l of lancamentos) {
        const nome = l.fornecedor?.nome ?? "Sem fornecedor";
        mapa.set(nome, (mapa.get(nome) ?? 0) + l.valorCentavos);
      }
      return csvResponse(
        "despesas-por-fornecedor.csv",
        ["fornecedor", "total"],
        Array.from(mapa.entries()).map(([nome, valor]) => [nome, centavosParaReais(valor).toFixed(2)])
      );
    }

    case "pagamentos-futuros": {
      const lancamentos = await prisma.lancamento.findMany({
        where: {
          projetoId: projeto.id,
          deletedAt: null,
          tipo: "saida",
          dataVencimento: { gte: hoje },
          status: { notIn: ["pago", "cancelado"] },
        },
        orderBy: { dataVencimento: "asc" },
      });
      return csvResponse(
        "pagamentos-futuros.csv",
        ["descricao", "valor", "vencimento", "status"],
        lancamentos.map((l) => [
          l.descricao,
          centavosParaReais(l.valorCentavos).toFixed(2),
          l.dataVencimento?.toISOString().slice(0, 10) ?? "",
          l.status,
        ])
      );
    }

    case "pagamentos-vencidos": {
      const lancamentos = await prisma.lancamento.findMany({
        where: { projetoId: projeto.id, deletedAt: null, status: "vencido" },
        orderBy: { dataVencimento: "asc" },
      });
      return csvResponse(
        "pagamentos-vencidos.csv",
        ["descricao", "valor", "vencimento"],
        lancamentos.map((l) => [
          l.descricao,
          centavosParaReais(l.valorCentavos).toFixed(2),
          l.dataVencimento?.toISOString().slice(0, 10) ?? "",
        ])
      );
    }

    case "despesas-sem-comprovante": {
      const lancamentos = await prisma.lancamento.findMany({
        where: {
          projetoId: projeto.id,
          deletedAt: null,
          tipo: "saida",
          status: { in: ["pago", "pago_parcialmente"] },
          comprovanteUrl: null,
        },
      });
      return csvResponse(
        "despesas-sem-comprovante.csv",
        ["descricao", "valor", "vencimento"],
        lancamentos.map((l) => [
          l.descricao,
          centavosParaReais(l.valorCentavos).toFixed(2),
          l.dataVencimento?.toISOString().slice(0, 10) ?? "",
        ])
      );
    }

    case "contratos-saldos": {
      const contratos = await prisma.contrato.findMany({
        where: { projetoId: projeto.id, deletedAt: null },
        include: { fornecedor: true, lancamentos: true },
      });
      return csvResponse(
        "contratos-saldos.csv",
        ["fornecedor", "escopo", "valor_total", "pago", "saldo", "status"],
        contratos.map((c) => {
          const pago = c.lancamentos
            .filter((l) => ["pago", "pago_parcialmente"].includes(l.status))
            .reduce((a, l) => a + l.valorCentavos, 0);
          return [
            c.fornecedor?.nome ?? "",
            c.escopo,
            centavosParaReais(c.valorTotalCentavos).toFixed(2),
            centavosParaReais(pago).toFixed(2),
            centavosParaReais(c.valorTotalCentavos - pago).toFixed(2),
            c.status,
          ];
        })
      );
    }

    case "tarefas-atrasadas": {
      const tarefas = await prisma.tarefa.findMany({ where: { projetoId: projeto.id, deletedAt: null } });
      const atrasadas = tarefas
        .filter((t) => t.status !== "concluido" && t.status !== "cancelado" && calcularAtrasoTarefaDias(t, hoje) > 0)
        .map((t) => [t.titulo, String(calcularAtrasoTarefaDias(t, hoje)), t.dataTerminoPlanejada.toISOString().slice(0, 10)]);
      return csvResponse("tarefas-atrasadas.csv", ["tarefa", "dias_atraso", "termino_planejado"], atrasadas);
    }

    case "cronograma": {
      const tarefas = await prisma.tarefa.findMany({
        where: { projetoId: projeto.id, deletedAt: null },
        orderBy: { dataInicioPlanejada: "asc" },
      });
      return csvResponse(
        "cronograma.csv",
        ["tarefa", "inicio_planejado", "termino_planejado", "termino_real", "percentual_concluido", "status"],
        tarefas.map((t) => [
          t.titulo,
          t.dataInicioPlanejada.toISOString().slice(0, 10),
          t.dataTerminoPlanejada.toISOString().slice(0, 10),
          t.dataTerminoReal?.toISOString().slice(0, 10) ?? "",
          String(t.percentualConcluido),
          t.status,
        ])
      );
    }

    case "fornecedores-resumo": {
      // Versão compartilhável: sem dados bancários/pix.
      const fornecedores = await prisma.fornecedor.findMany({ where: { projetoId: projeto.id, deletedAt: null } });
      return csvResponse(
        "fornecedores-resumo.csv",
        ["nome", "especialidade", "status", "avaliacao"],
        fornecedores.map((f) => [f.nome, f.especialidade ?? "", f.status, f.avaliacao ? String(f.avaliacao) : ""])
      );
    }

    default:
      return new Response("Relatório não encontrado", { status: 404 });
  }
}
