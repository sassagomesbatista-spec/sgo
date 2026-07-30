"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";
import { reaisParaCentavos } from "@/lib/money";

function str(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

function data(formData: FormData, campo: string): Date | null {
  const v = str(formData, campo);
  return v ? new Date(`${v}T12:00:00`) : null;
}

async function sincronizarDependencias(tarefaId: string, formData: FormData) {
  const dependeDeIds = formData.getAll("dependeDe").map(String).filter(Boolean);
  await prisma.tarefaDependencia.deleteMany({ where: { tarefaId } });
  for (const dependeDeId of dependeDeIds) {
    if (dependeDeId === tarefaId) continue;
    await prisma.tarefaDependencia.create({ data: { tarefaId, dependeDeId } });
  }
}

export async function criarTarefa(formData: FormData) {
  const { projeto } = await getProjetoAtual();

  const tarefa = await prisma.tarefa.create({
    data: {
      projetoId: projeto.id,
      titulo: String(formData.get("titulo") ?? ""),
      descricao: str(formData, "descricao"),
      ambienteId: str(formData, "ambienteId"),
      categoriaId: str(formData, "categoriaId"),
      responsavel: str(formData, "responsavel"),
      fornecedorId: str(formData, "fornecedorId"),
      dataInicioPlanejada: data(formData, "dataInicioPlanejada") ?? new Date(),
      dataTerminoPlanejada: data(formData, "dataTerminoPlanejada") ?? new Date(),
      dataInicioReal: data(formData, "dataInicioReal"),
      dataTerminoReal: data(formData, "dataTerminoReal"),
      percentualConcluido: parseInt(String(formData.get("percentualConcluido") ?? "0"), 10) || 0,
      status: String(formData.get("status") ?? "nao_iniciado"),
      prioridade: String(formData.get("prioridade") ?? "media"),
      custoPrevistoCentavos: reaisParaCentavos(parseFloat(String(formData.get("custoPrevisto") ?? "0").replace(",", "."))),
      custoRealizadoCentavos: reaisParaCentavos(parseFloat(String(formData.get("custoRealizado") ?? "0").replace(",", "."))),
      ehMarco: formData.get("ehMarco") === "on",
      observacoes: str(formData, "observacoes"),
    },
  });

  await sincronizarDependencias(tarefa.id, formData);

  revalidatePath("/cronograma");
  revalidatePath("/");
}

export async function atualizarTarefa(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();

  await prisma.tarefa.update({
    where: { id, projetoId: projeto.id },
    data: {
      titulo: String(formData.get("titulo") ?? ""),
      descricao: str(formData, "descricao"),
      ambienteId: str(formData, "ambienteId"),
      categoriaId: str(formData, "categoriaId"),
      responsavel: str(formData, "responsavel"),
      fornecedorId: str(formData, "fornecedorId"),
      dataInicioPlanejada: data(formData, "dataInicioPlanejada") ?? new Date(),
      dataTerminoPlanejada: data(formData, "dataTerminoPlanejada") ?? new Date(),
      dataInicioReal: data(formData, "dataInicioReal"),
      dataTerminoReal: data(formData, "dataTerminoReal"),
      percentualConcluido: parseInt(String(formData.get("percentualConcluido") ?? "0"), 10) || 0,
      status: String(formData.get("status") ?? "nao_iniciado"),
      prioridade: String(formData.get("prioridade") ?? "media"),
      custoPrevistoCentavos: reaisParaCentavos(parseFloat(String(formData.get("custoPrevisto") ?? "0").replace(",", "."))),
      custoRealizadoCentavos: reaisParaCentavos(parseFloat(String(formData.get("custoRealizado") ?? "0").replace(",", "."))),
      ehMarco: formData.get("ehMarco") === "on",
      observacoes: str(formData, "observacoes"),
    },
  });

  await sincronizarDependencias(id, formData);

  revalidatePath("/cronograma");
  revalidatePath("/");
}

export async function excluirTarefa(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.tarefa.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/cronograma");
  revalidatePath("/");
}

export async function mudarStatusTarefa(id: string, status: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.tarefa.update({
    where: { id, projetoId: projeto.id },
    data: {
      status,
      dataTerminoReal: status === "concluido" ? new Date() : undefined,
      percentualConcluido: status === "concluido" ? 100 : undefined,
    },
  });
  revalidatePath("/cronograma");
  revalidatePath("/");
}
