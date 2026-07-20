"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";

export async function criarCategoria(formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.categoria.create({
    data: {
      projetoId: projeto.id,
      nome: String(formData.get("nome") ?? ""),
      grupo: String(formData.get("grupo") ?? "Outros"),
      orcamentoCentavos: reaisParaCentavos(parseFloat(String(formData.get("orcamento") ?? "0").replace(",", "."))),
    },
  });
  revalidatePath("/categorias");
}

export async function atualizarCategoria(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.categoria.update({
    where: { id, projetoId: projeto.id },
    data: {
      nome: String(formData.get("nome") ?? ""),
      grupo: String(formData.get("grupo") ?? "Outros"),
      orcamentoCentavos: reaisParaCentavos(parseFloat(String(formData.get("orcamento") ?? "0").replace(",", "."))),
    },
  });
  revalidatePath("/categorias");
}

export async function excluirCategoria(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.categoria.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/categorias");
}
