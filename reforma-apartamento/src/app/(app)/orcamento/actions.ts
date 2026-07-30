"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";

function num(formData: FormData, campo: string): number {
  const raw = String(formData.get(campo) ?? "0").replace(",", ".");
  return reaisParaCentavos(parseFloat(raw || "0"));
}

export async function criarItemOrcamento(formData: FormData) {
  const { projeto } = await getProjetoAtual();

  await prisma.orcamentoItem.create({
    data: {
      projetoId: projeto.id,
      nome: String(formData.get("nome") ?? ""),
      descricao: String(formData.get("descricao") ?? "") || null,
      categoriaId: String(formData.get("categoriaId") ?? "") || null,
      ambienteId: String(formData.get("ambienteId") ?? "") || null,
      valorEstimadoCentavos: num(formData, "valorEstimado"),
      valorAprovadoCentavos: num(formData, "valorAprovado"),
      prioridade: String(formData.get("prioridade") ?? "media"),
      observacoes: String(formData.get("observacoes") ?? "") || null,
    },
  });

  revalidatePath("/orcamento");
}

export async function atualizarItemOrcamento(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();

  await prisma.orcamentoItem.update({
    where: { id, projetoId: projeto.id },
    data: {
      nome: String(formData.get("nome") ?? ""),
      descricao: String(formData.get("descricao") ?? "") || null,
      categoriaId: String(formData.get("categoriaId") ?? "") || null,
      ambienteId: String(formData.get("ambienteId") ?? "") || null,
      valorEstimadoCentavos: num(formData, "valorEstimado"),
      valorAprovadoCentavos: num(formData, "valorAprovado"),
      prioridade: String(formData.get("prioridade") ?? "media"),
      observacoes: String(formData.get("observacoes") ?? "") || null,
    },
  });

  revalidatePath("/orcamento");
}

export async function excluirItemOrcamento(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.orcamentoItem.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/orcamento");
}
