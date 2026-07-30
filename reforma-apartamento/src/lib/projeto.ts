import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * MVP é single-project por usuário: retorna o primeiro projeto ao qual o
 * usuário da sessão está associado. O schema (ProjetoUsuario) já suporta
 * múltiplos projetos/colaboradores para quando isso for necessário.
 */
export async function getProjetoAtual() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  const vinculo = await prisma.projetoUsuario.findFirst({
    where: { userId: sessao.userId },
    include: { projeto: true },
    orderBy: { id: "asc" },
  });

  if (!vinculo) redirect("/login");
  return { projeto: vinculo.projeto, sessao };
}
