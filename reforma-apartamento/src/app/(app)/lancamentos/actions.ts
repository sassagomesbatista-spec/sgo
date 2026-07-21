"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";
import { salvarArquivo } from "@/lib/upload";
import { parseCsv } from "@/lib/csv";
import { randomUUID } from "crypto";

function str(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

function data(formData: FormData, campo: string): Date | null {
  const v = str(formData, campo);
  return v ? new Date(`${v}T12:00:00`) : null;
}

export async function criarLancamento(formData: FormData) {
  const { projeto } = await getProjetoAtual();

  const descricao = String(formData.get("descricao") ?? "");
  const valorReais = parseFloat(String(formData.get("valor") ?? "0").replace(",", "."));
  const valorCentavos = reaisParaCentavos(valorReais);
  const numeroParcelas = Math.max(1, parseInt(String(formData.get("numeroParcelas") ?? "1"), 10) || 1);
  const dataVencimento = data(formData, "dataVencimento");
  const comprovanteFile = formData.get("comprovante") as File | null;
  const comprovanteUrl = await salvarArquivo(comprovanteFile);

  const base = {
    projetoId: projeto.id,
    tipo: String(formData.get("tipo") ?? "saida"),
    dataLancamento: data(formData, "dataLancamento") ?? new Date(),
    dataCompetencia: data(formData, "dataCompetencia"),
    dataPagamento: data(formData, "dataPagamento"),
    status: String(formData.get("status") ?? "previsto"),
    categoriaId: str(formData, "categoriaId"),
    ambienteId: str(formData, "ambienteId"),
    etapaId: str(formData, "etapaId"),
    fornecedorId: str(formData, "fornecedorId"),
    orcamentoItemId: str(formData, "orcamentoItemId"),
    contaBancariaId: str(formData, "contaBancariaId"),
    formaPagamento: str(formData, "formaPagamento"),
    contaOrigemDestino: str(formData, "contaOrigemDestino"),
    recorrencia: str(formData, "recorrencia"),
    observacoes: str(formData, "observacoes"),
    tags: str(formData, "tags"),
    notaFiscal: str(formData, "notaFiscal"),
    comprovanteUrl,
  };

  if (numeroParcelas <= 1) {
    await prisma.lancamento.create({
      data: {
        ...base,
        descricao,
        valorCentavos,
        dataVencimento,
        numeroParcelas: 1,
        parcelaAtual: 1,
      },
    });
  } else {
    const grupoParcelaId = randomUUID();
    const valorParcela = Math.round(valorCentavos / numeroParcelas);
    const dataBase = dataVencimento ?? new Date();
    for (let i = 1; i <= numeroParcelas; i++) {
      const vencimentoParcela = new Date(dataBase);
      vencimentoParcela.setMonth(vencimentoParcela.getMonth() + (i - 1));
      await prisma.lancamento.create({
        data: {
          ...base,
          descricao: `${descricao} — parcela ${i}/${numeroParcelas}`,
          valorCentavos: valorParcela,
          dataVencimento: vencimentoParcela,
          numeroParcelas,
          parcelaAtual: i,
          grupoParcelaId,
          status: i === 1 ? base.status : "previsto",
        },
      });
    }
  }

  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function atualizarLancamento(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();
  const comprovanteFile = formData.get("comprovante") as File | null;
  const comprovanteUrl = await salvarArquivo(comprovanteFile);

  await prisma.lancamento.update({
    where: { id, projetoId: projeto.id },
    data: {
      tipo: String(formData.get("tipo") ?? "saida"),
      descricao: String(formData.get("descricao") ?? ""),
      valorCentavos: reaisParaCentavos(parseFloat(String(formData.get("valor") ?? "0").replace(",", "."))),
      dataLancamento: data(formData, "dataLancamento") ?? new Date(),
      dataCompetencia: data(formData, "dataCompetencia"),
      dataVencimento: data(formData, "dataVencimento"),
      dataPagamento: data(formData, "dataPagamento"),
      status: String(formData.get("status") ?? "previsto"),
      categoriaId: str(formData, "categoriaId"),
      ambienteId: str(formData, "ambienteId"),
      etapaId: str(formData, "etapaId"),
      fornecedorId: str(formData, "fornecedorId"),
      orcamentoItemId: str(formData, "orcamentoItemId"),
      contaBancariaId: str(formData, "contaBancariaId"),
      formaPagamento: str(formData, "formaPagamento"),
      contaOrigemDestino: str(formData, "contaOrigemDestino"),
      recorrencia: str(formData, "recorrencia"),
      observacoes: str(formData, "observacoes"),
      tags: str(formData, "tags"),
      notaFiscal: str(formData, "notaFiscal"),
      ...(comprovanteUrl ? { comprovanteUrl } : {}),
    },
  });

  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function excluirLancamento(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.lancamento.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export async function duplicarLancamento(id: string) {
  const { projeto } = await getProjetoAtual();
  const original = await prisma.lancamento.findFirstOrThrow({ where: { id, projetoId: projeto.id } });

  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...resto } = original;
  await prisma.lancamento.create({
    data: { ...resto, descricao: `${original.descricao} (cópia)` },
  });

  revalidatePath("/lancamentos");
}

export async function marcarComoPago(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.lancamento.update({
    where: { id, projetoId: projeto.id },
    data: { status: "pago", dataPagamento: new Date() },
  });
  revalidatePath("/lancamentos");
  revalidatePath("/");
}

export type ImportState = { mensagem?: string; erro?: string } | null;

export async function importarCsv(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  const { projeto } = await getProjetoAtual();
  const file = formData.get("arquivo") as File | null;
  if (!file || file.size === 0) return { erro: "Selecione um arquivo CSV." };

  const texto = await file.text();
  const linhas = parseCsv(texto);
  if (linhas.length < 2) return { erro: "CSV vazio ou sem dados." };

  const [, ...dados] = linhas; // ignora cabeçalho
  let criados = 0;
  for (const cols of dados) {
    const [tipo, descricao, valor, dataVencimentoStr, status] = cols;
    if (!descricao) continue;
    await prisma.lancamento.create({
      data: {
        projetoId: projeto.id,
        tipo: tipo?.trim() === "entrada" ? "entrada" : "saida",
        descricao: descricao.trim(),
        valorCentavos: reaisParaCentavos(parseFloat((valor ?? "0").replace(",", ".")) || 0),
        dataLancamento: new Date(),
        dataVencimento: dataVencimentoStr ? new Date(`${dataVencimentoStr.trim()}T12:00:00`) : null,
        status: status?.trim() || "previsto",
      },
    });
    criados++;
  }

  revalidatePath("/lancamentos");
  return { mensagem: `${criados} lançamento(s) importado(s) com sucesso.` };
}
