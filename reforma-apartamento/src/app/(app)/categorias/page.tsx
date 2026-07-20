import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { criarCategoria, atualizarCategoria, excluirCategoria } from "./actions";

export default async function CategoriasPage() {
  const { projeto } = await getProjetoAtual();

  const categorias = await prisma.categoria.findMany({
    where: { projetoId: projeto.id, deletedAt: null },
    include: { lancamentos: { where: { deletedAt: null, tipo: "saida" } } },
    orderBy: [{ grupo: "asc" }, { nome: "asc" }],
  });

  const grupos = new Map<string, typeof categorias>();
  for (const c of categorias) {
    const lista = grupos.get(c.grupo) ?? [];
    lista.push(c);
    grupos.set(c.grupo, lista);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Categorias</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organização das despesas por grupo e categoria.</p>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Nova categoria</summary>
          <form action={criarCategoria} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Nome">
              <TextInput name="nome" required />
            </Field>
            <Field label="Grupo">
              <TextInput name="grupo" required placeholder="Ex: Obra civil" />
            </Field>
            <Field label="Orçamento (R$, opcional)">
              <TextInput name="orcamento" type="number" step="0.01" defaultValue="0" />
            </Field>
            <div className="flex items-end">
              <SubmitButton>Adicionar</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      {categorias.length === 0 ? (
        <EmptyState title="Nenhuma categoria cadastrada" />
      ) : (
        Array.from(grupos.entries()).map(([grupo, itens]) => (
          <Card key={grupo}>
            <CardTitle>{grupo}</CardTitle>
            <div className="mt-3 divide-y divide-border">
              {itens.map((c) => {
                const gasto = c.lancamentos.reduce((acc, l) => acc + l.valorCentavos, 0);
                const atualizarComId = atualizarCategoria.bind(null, c.id);
                const excluirComId = excluirCategoria.bind(null, c.id);
                return (
                  <details key={c.id} className="py-2">
                    <summary className="flex cursor-pointer items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{c.nome}</span>
                      <span className="text-muted-foreground">
                        Gasto: <span className="tabular-nums text-foreground">{formatarMoeda(gasto)}</span>
                      </span>
                    </summary>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <form action={atualizarComId} className="flex flex-wrap items-end gap-3">
                        <Field label="Nome">
                          <TextInput name="nome" defaultValue={c.nome} required />
                        </Field>
                        <Field label="Grupo">
                          <TextInput name="grupo" defaultValue={c.grupo} required />
                        </Field>
                        <Field label="Orçamento (R$)">
                          <TextInput
                            name="orcamento"
                            type="number"
                            step="0.01"
                            defaultValue={(c.orcamentoCentavos / 100).toFixed(2)}
                          />
                        </Field>
                        <SubmitButton>Salvar</SubmitButton>
                      </form>
                      <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir a categoria "${c.nome}"?`} />
                    </div>
                  </details>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
