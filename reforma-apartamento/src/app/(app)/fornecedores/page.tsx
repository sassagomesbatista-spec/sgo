import Link from "next/link";
import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Star } from "lucide-react";
import { criarFornecedor, excluirFornecedor } from "./actions";
import { FornecedorForm } from "./fornecedor-form";

export default async function FornecedoresPage() {
  const { projeto } = await getProjetoAtual();

  const fornecedores = await prisma.fornecedor.findMany({
    where: { projetoId: projeto.id, deletedAt: null },
    include: { lancamentos: { where: { deletedAt: null } } },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Fornecedores</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cadastro de fornecedores e profissionais da reforma.</p>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Novo fornecedor</summary>
          <FornecedorForm action={criarFornecedor} />
        </details>
      </Card>

      {fornecedores.length === 0 ? (
        <EmptyState title="Nenhum fornecedor cadastrado" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fornecedores.map((f) => {
            const contratado = f.lancamentos
              .filter((l) => l.tipo === "saida")
              .reduce((acc, l) => acc + l.valorCentavos, 0);
            const pago = f.lancamentos
              .filter((l) => l.tipo === "saida" && ["pago", "pago_parcialmente"].includes(l.status))
              .reduce((acc, l) => acc + l.valorCentavos, 0);
            const excluirComId = excluirFornecedor.bind(null, f.id);
            return (
              <Card key={f.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{f.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">{f.especialidade ?? f.tipo}</p>
                  </div>
                  <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir o fornecedor "${f.nome}"?`} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge color={f.status === "ativo" ? "success" : "neutral"}>{f.status}</Badge>
                  {f.avaliacao && (
                    <span className="flex items-center gap-0.5 text-xs text-gold">
                      <Star size={12} fill="currentColor" /> {f.avaliacao}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Total (contratado+saída)</span>
                    <span className="tabular-nums">{formatarMoeda(contratado)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="tabular-nums">{formatarMoeda(pago)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Saldo pendente</span>
                    <span className="tabular-nums">{formatarMoeda(contratado - pago)}</span>
                  </p>
                </div>
                <Link href={`/fornecedores/${f.id}`} className="mt-3 inline-block text-sm text-accent hover:underline">
                  Ver detalhes →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
