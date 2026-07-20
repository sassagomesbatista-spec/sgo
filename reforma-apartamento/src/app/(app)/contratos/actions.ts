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

function dadosContrato(formData: FormData) {
  return {
    fornecedorId: str(formData, "fornecedorId"),
    escopo: String(formData.get("escopo") ?? ""),
    valorTotalCentavos: reaisParaCentavos(parseFloat(String(formData.get("valorTotal") ?? "0").replace(",", "."))),
    dataInicio: data(formData, "dataInicio"),
    dataFim: data(formData, "dataFim"),
    formaPagamento: str(formData, "formaPagamento"),
    prazo: str(formData, "prazo"),
    garantia: str(formData, "garantia"),
    reajustes: str(formData, "reajustes"),
    multas: str(formData, "multas"),
    status: String(formData.get("status") ?? "ativo"),
  };
}

export async function criarContrato(formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.contrato.create({ data: { projetoId: projeto.id, ...dadosContrato(formData) } });
  revalidatePath("/contratos");
}

export async function atualizarContrato(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.contrato.update({ where: { id, projetoId: projeto.id }, data: dadosContrato(formData) });
  revalidatePath("/contratos");
}

export async function excluirContrato(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.contrato.update({ where: { id, projetoId: projeto.id }, data: { deletedAt: new Date() } });
  revalidatePath("/contratos");
}
