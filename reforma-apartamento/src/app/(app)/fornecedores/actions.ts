"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProjetoAtual } from "@/lib/projeto";

function str(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

function dadosFornecedor(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    tipo: String(formData.get("tipo") ?? "empresa"),
    empresa: str(formData, "empresa"),
    documento: str(formData, "documento"),
    telefone: str(formData, "telefone"),
    email: str(formData, "email"),
    endereco: str(formData, "endereco"),
    dadosBancarios: str(formData, "dadosBancarios"),
    pix: str(formData, "pix"),
    contatoPrincipal: str(formData, "contatoPrincipal"),
    especialidade: str(formData, "especialidade"),
    avaliacao: formData.get("avaliacao") ? parseInt(String(formData.get("avaliacao")), 10) : null,
    status: String(formData.get("status") ?? "ativo"),
    observacoes: str(formData, "observacoes"),
  };
}

export async function criarFornecedor(formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.fornecedor.create({ data: { projetoId: projeto.id, ...dadosFornecedor(formData) } });
  revalidatePath("/fornecedores");
}

export async function atualizarFornecedor(id: string, formData: FormData) {
  const { projeto } = await getProjetoAtual();
  await prisma.fornecedor.update({ where: { id, projetoId: projeto.id }, data: dadosFornecedor(formData) });
  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
}

export async function excluirFornecedor(id: string) {
  const { projeto } = await getProjetoAtual();
  await prisma.fornecedor.update({
    where: { id, projetoId: projeto.id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/fornecedores");
}
