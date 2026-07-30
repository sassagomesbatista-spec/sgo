"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";
import { salvarArquivo } from "@/lib/upload";

function str(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

export async function criarCotacao(formData: FormData) {
  const { projeto } = await getProjetoAtual();
  const arquivo = formData.get("arquivo") as File | null;
  const arquivoUrl = await salvarArquivo(arquivo);

  await prisma.cotacao.create({
    data: {
      projetoId: projeto.id,
      itemDescricao: String(formData.get("itemDescricao") ?? ""),
      fornecedorId: str(formData, "fornecedorId"),
      valorCentavos: reaisParaCentavos(parseFloat(String(formData.get("valor") ?? "0").replace(",", "."))),
      prazoDias: formData.get("prazoDias") ? parseInt(String(formData.get("prazoDias")), 10) : null,
      formaPagamento: str(formData, "formaPagamento"),
      garantia: str(formData, "garantia"),
      freteCentavos: reaisParaCentavos(parseFloat(String(formData.get("frete") ?? "0").replace(",", "."))),
      instalacaoCentavos: reaisParaCentavos(parseFloat(String(formData.get("instalacao") ?? "0").replace(",", "."))),
      impostosCentavos: reaisParaCentavos(parseFloat(String(formData.get("impostos") ?? "0").replace(",", "."))),
      observacoes: str(formData, "observacoes"),
      arquivoUrl,
    },
  });

  revalidatePath("/cotacoes");
}

export async function marcarSelecaoCotacao(id: string, campo: "melhorPreco" | "melhorPrazo" | "melhorCustoBeneficio") {
  const { projeto } = await getProjetoAtual();
  const atual = await prisma.cotacao.findFirstOrThrow({ where: { id, projetoId: projeto.id } });

  if (campo === "melhorPreco") {
    await prisma.cotacao.update({ where: { id }, data: { melhorPreco: !atual.melhorPreco } });
  } else if (campo === "melhorPrazo") {
    await prisma.cotacao.update({ where: { id }, data: { melhorPrazo: !atual.melhorPrazo } });
  } else {
    await prisma.cotacao.update({ where: { id }, data: { melhorCustoBeneficio: !atual.melhorCustoBeneficio } });
  }

  revalidatePath("/cotacoes");
}

export async function atualizarStatusCotacao(id: string, status: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.cotacao.update({ where: { id, projetoId: projeto.id }, data: { statusSelecao: status } });
  revalidatePath("/cotacoes");
}

export async function excluirCotacao(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.cotacao.update({ where: { id, projetoId: projeto.id }, data: { deletedAt: new Date() } });
  revalidatePath("/cotacoes");
}
