import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { paraCsv } from "@/lib/csv";
import { centavosParaReais } from "@/lib/money";

export async function GET() {
  const { projeto } = await getProjetoAtual();

  const lancamentos = await prisma.lancamento.findMany({
    where: { projetoId: projeto.id, deletedAt: null },
    include: { categoria: true, ambiente: true, fornecedor: true },
    orderBy: { dataVencimento: "asc" },
  });

  const colunas = [
    "tipo",
    "descricao",
    "valor",
    "data_vencimento",
    "data_pagamento",
    "status",
    "categoria",
    "ambiente",
    "fornecedor",
    "forma_pagamento",
    "parcela",
    "nota_fiscal",
  ];

  const linhas = lancamentos.map((l) => [
    l.tipo,
    l.descricao,
    centavosParaReais(l.valorCentavos).toFixed(2),
    l.dataVencimento?.toISOString().slice(0, 10) ?? "",
    l.dataPagamento?.toISOString().slice(0, 10) ?? "",
    l.status,
    l.categoria?.nome ?? "",
    l.ambiente?.nome ?? "",
    l.fornecedor?.nome ?? "",
    l.formaPagamento ?? "",
    `${l.parcelaAtual}/${l.numeroParcelas}`,
    l.notaFiscal ?? "",
  ]);

  const csv = paraCsv(colunas, linhas);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lancamentos.csv"`,
    },
  });
}
