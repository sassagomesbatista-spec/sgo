import Link from "next/link";
import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { criarAmbiente, excluirAmbiente } from "./actions";

export default async function AmbientesPage() {
  const { projeto } = await getProjetoAtual();

  const ambientes = await prisma.ambiente.findMany({
    where: { projetoId: projeto.id, deletedAt: null },
    orderBy: { ordem: "asc" },
    include: {
      lancamentos: { where: { deletedAt: null } },
      orcamentoItens: { where: { deletedAt: null } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Ambientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organize despesas e tarefas pelos cômodos do apartamento.</p>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Novo ambiente</summary>
          <form action={criarAmbiente} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Nome">
              <TextInput name="nome" required placeholder="Ex: Escritório" />
            </Field>
            <Field label="Orçamento próprio (R$, opcional)">
              <TextInput name="orcamento" type="number" step="0.01" min="0" defaultValue="0" />
            </Field>
            <div className="flex items-end">
              <SubmitButton>Adicionar ambiente</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      {ambientes.length === 0 ? (
        <EmptyState title="Nenhum ambiente cadastrado" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ambientes.map((a) => {
            const pago = a.lancamentos
              .filter((l) => l.tipo === "saida" && ["pago", "pago_parcialmente"].includes(l.status))
              .reduce((acc, l) => acc + l.valorCentavos, 0);
            const contratado = a.orcamentoItens.reduce((acc, i) => acc + i.valorContratadoCentavos, 0);
            const excluirComId = excluirAmbiente.bind(null, a.id);
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between">
                  <CardTitle>{a.nome}</CardTitle>
                  <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir o ambiente "${a.nome}"?`} />
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Orçamento</span>
                    <span className="tabular-nums">{formatarMoeda(a.orcamentoCentavos)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Contratado</span>
                    <span className="tabular-nums">{formatarMoeda(contratado)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="tabular-nums">{formatarMoeda(pago)}</span>
                  </p>
                </div>
                <Link href={`/ambientes/${a.id}`} className="mt-3 inline-block text-sm text-accent hover:underline">
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
