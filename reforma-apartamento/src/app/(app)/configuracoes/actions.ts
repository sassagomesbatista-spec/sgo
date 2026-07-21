"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";

function data(formData: FormData, campo: string): Date | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v ? new Date(`${v}T12:00:00`) : null;
}

export async function atualizarProjeto(formData: FormData) {
  const { projeto } = await getProjetoAtual();

  await prisma.projeto.update({
    where: { id: projeto.id },
    data: {
      nome: String(formData.get("nome") ?? projeto.nome),
      orcamentoTotalCentavos: reaisParaCentavos(
        parseFloat(String(formData.get("orcamentoTotal") ?? "0").replace(",", "."))
      ),
      reservaContingenciaPercent: parseFloat(String(formData.get("reservaContingencia") ?? "0").replace(",", ".")),
      dataInicioPrevista: data(formData, "dataInicioPrevista") ?? projeto.dataInicioPrevista,
      dataTerminoPrevista: data(formData, "dataTerminoPrevista") ?? projeto.dataTerminoPrevista,
      dataTerminoRevisada: data(formData, "dataTerminoRevisada"),
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/orcamento");
  revalidatePath("/cronograma");
}

export async function criarContaBancaria(formData: FormData) {
  const { projeto } = await getProjetoAtual();

  await prisma.contaBancaria.create({
    data: {
      projetoId: projeto.id,
      nome: String(formData.get("nome") ?? ""),
      saldoInicialCentavos: reaisParaCentavos(
        parseFloat(String(formData.get("saldoInicial") ?? "0").replace(",", "."))
      ),
      dataSaldoInicial: data(formData, "dataSaldoInicial") ?? new Date(),
      observacoes: String(formData.get("observacoes") ?? "") || null,
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/lancamentos");
}

export async function atualizarContaBancaria(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();

  await prisma.contaBancaria.update({
    where: { id, projetoId: projeto.id },
    data: {
      nome: String(formData.get("nome") ?? ""),
      saldoInicialCentavos: reaisParaCentavos(
        parseFloat(String(formData.get("saldoInicial") ?? "0").replace(",", "."))
      ),
      dataSaldoInicial: data(formData, "dataSaldoInicial") ?? new Date(),
      observacoes: String(formData.get("observacoes") ?? "") || null,
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/lancamentos");
}

export async function excluirContaBancaria(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.contaBancaria.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/configuracoes");
  revalidatePath("/");
  revalidatePath("/lancamentos");
}
