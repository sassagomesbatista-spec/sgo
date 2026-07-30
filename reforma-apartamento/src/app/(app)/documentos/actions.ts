"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { salvarArquivo } from "@/lib/upload";

function str(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

export async function criarDocumento(formData: FormData) {
  const { projeto } = await getProjetoAtual();
  const arquivo = formData.get("arquivo") as File | null;
  const url = await salvarArquivo(arquivo);
  if (!url) return;

  const dataValidadeStr = str(formData, "dataValidade");

  await prisma.documento.create({
    data: {
      projetoId: projeto.id,
      nome: String(formData.get("nome") ?? ""),
      tipo: String(formData.get("tipo") ?? "outro"),
      url,
      versao: 1,
      responsavel: str(formData, "responsavel"),
      ambienteId: str(formData, "ambienteId"),
      fornecedorId: str(formData, "fornecedorId"),
      statusAprovacao: String(formData.get("statusAprovacao") ?? "pendente"),
      tags: str(formData, "tags"),
      dataValidade: dataValidadeStr ? new Date(`${dataValidadeStr}T12:00:00`) : null,
    },
  });

  revalidatePath("/documentos");
}

export async function excluirDocumento(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.documento.update({ where: { id, projetoId: projeto.id }, data: { deletedAt: new Date() } });
  revalidatePath("/documentos");
}
