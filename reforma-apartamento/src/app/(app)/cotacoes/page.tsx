import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput, SelectInput, TextArea, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { Trophy } from "lucide-react";
import { criarCotacao, marcarSelecaoCotacao, atualizarStatusCotacao, excluirCotacao } from "./actions";

export default async function CotacoesPage() {
  const { projeto } = await getProjetoAtual();

  const [cotacoes, fornecedores] = await Promise.all([
    prisma.cotacao.findMany({
      where: { projetoId: projeto.id, deletedAt: null },
      include: { fornecedor: true },
      orderBy: { itemDescricao: "asc" },
    }),
    prisma.fornecedor.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  const grupos = new Map<string, typeof cotacoes>();
  for (const c of cotacoes) {
    const lista = grupos.get(c.itemDescricao) ?? [];
    lista.push(c);
    grupos.set(c.itemDescricao, lista);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Cotações e Propostas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare propostas concorrentes lado a lado antes de decidir — preço não é o único critério.
        </p>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Nova cotação</summary>
          <form action={criarCotacao} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" encType="multipart/form-data">
            <Field label="Item ou serviço" className="md:col-span-2">
              <TextInput name="itemDescricao" required placeholder="Ex: Ar-condicionado 4 ambientes" />
            </Field>
            <Field label="Fornecedor">
              <SelectInput name="fornecedorId" defaultValue="">
                <option value="">Selecione</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Valor (R$)">
              <TextInput name="valor" type="number" step="0.01" required />
            </Field>
            <Field label="Prazo (dias)">
              <TextInput name="prazoDias" type="number" min="0" />
            </Field>
            <Field label="Forma de pagamento">
              <TextInput name="formaPagamento" />
            </Field>
            <Field label="Garantia">
              <TextInput name="garantia" />
            </Field>
            <Field label="Frete (R$)">
              <TextInput name="frete" type="number" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Instalação (R$)">
              <TextInput name="instalacao" type="number" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Impostos (R$)">
              <TextInput name="impostos" type="number" step="0.01" defaultValue="0" />
            </Field>
            <Field label="Arquivo anexo">
              <input type="file" name="arquivo" className="block w-full text-sm text-muted-foreground" />
            </Field>
            <Field label="Observações" className="md:col-span-3">
              <TextArea name="observacoes" rows={2} />
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>Adicionar cotação</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      {cotacoes.length === 0 ? (
        <EmptyState title="Nenhuma cotação cadastrada" />
      ) : (
        Array.from(grupos.entries()).map(([item, lista]) => (
          <Card key={item}>
            <CardTitle>{item}</CardTitle>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lista.map((c) => {
                const excluirComId = excluirCotacao.bind(null, c.id);
                return (
                  <div key={c.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-foreground">{c.fornecedor?.nome ?? "Sem fornecedor"}</p>
                      <ConfirmDeleteButton action={excluirComId} confirmMessage="Excluir esta cotação?" />
                    </div>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {formatarMoeda(c.valorCentavos)}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <p>Prazo: {c.prazoDias ? `${c.prazoDias} dias` : "—"}</p>
                      <p>Pagamento: {c.formaPagamento ?? "—"}</p>
                      <p>Garantia: {c.garantia ?? "—"}</p>
                      <p>
                        Frete + instalação + impostos:{" "}
                        {formatarMoeda((c.freteCentavos ?? 0) + (c.instalacaoCentavos ?? 0) + (c.impostosCentavos ?? 0))}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {c.melhorPreco && <Badge color="success">Melhor preço</Badge>}
                      {c.melhorPrazo && <Badge color="info">Melhor prazo</Badge>}
                      {c.melhorCustoBeneficio && (
                        <Badge color="gold" >
                          <Trophy size={10} className="mr-1 inline" /> Melhor custo-benefício
                        </Badge>
                      )}
                      <Badge
                        color={
                          c.statusSelecao === "aprovada"
                            ? "success"
                            : c.statusSelecao === "descartada"
                              ? "danger"
                              : c.statusSelecao === "preferida"
                                ? "warning"
                                : "neutral"
                        }
                      >
                        {c.statusSelecao}
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={marcarSelecaoCotacao.bind(null, c.id, "melhorPreco")}>
                        <button type="submit" className="text-xs text-accent hover:underline">
                          Marcar melhor preço
                        </button>
                      </form>
                      <form action={marcarSelecaoCotacao.bind(null, c.id, "melhorPrazo")}>
                        <button type="submit" className="text-xs text-accent hover:underline">
                          Marcar melhor prazo
                        </button>
                      </form>
                      <form action={marcarSelecaoCotacao.bind(null, c.id, "melhorCustoBeneficio")}>
                        <button type="submit" className="text-xs text-accent hover:underline">
                          Marcar custo-benefício
                        </button>
                      </form>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={atualizarStatusCotacao.bind(null, c.id, "aprovada")}>
                        <button type="submit" className="text-xs text-success hover:underline">
                          Aprovar
                        </button>
                      </form>
                      <form action={atualizarStatusCotacao.bind(null, c.id, "preferida")}>
                        <button type="submit" className="text-xs text-gold hover:underline">
                          Preferir
                        </button>
                      </form>
                      <form action={atualizarStatusCotacao.bind(null, c.id, "descartada")}>
                        <button type="submit" className="text-xs text-danger hover:underline">
                          Descartar
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
