"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";

export async function criarAmbiente(formData: FormData) {
  const { projeto } = await getProjetoAtual();
  const ultimo = await prisma.ambiente.findFirst({
    where: { projetoId: projeto.id },
    orderBy: { ordem: "desc" },
  });

  await prisma.ambiente.create({
    data: {
      projetoId: projeto.id,
      nome: String(formData.get("nome") ?? ""),
      orcamentoCentavos: reaisParaCentavos(parseFloat(String(formData.get("orcamento") ?? "0").replace(",", "."))),
      ordem: (ultimo?.ordem ?? 0) + 1,
    },
  });

  revalidatePath("/ambientes");
}

export async function atualizarAmbiente(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.ambiente.update({
    where: { id, projetoId: projeto.id },
    data: {
      nome: String(formData.get("nome") ?? ""),
      orcamentoCentavos: reaisParaCentavos(parseFloat(String(formData.get("orcamento") ?? "0").replace(",", "."))),
    },
  });
  revalidatePath("/ambientes");
  revalidatePath(`/ambientes/${id}`);
}

export async function excluirAmbiente(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.ambiente.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/ambientes");
}
