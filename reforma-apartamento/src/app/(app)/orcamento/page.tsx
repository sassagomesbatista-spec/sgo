import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarPercentual } from "@/lib/money";
import { calcularReservaContingencia } from "@/lib/calculos";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput, SelectInput, TextArea, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { PRIORIDADE_LABEL } from "@/lib/status";
import { criarItemOrcamento, atualizarItemOrcamento, excluirItemOrcamento } from "./actions";

function indicador(estimado: number, pago: number): { label: string; color: "neutral" | "warning" | "success" | "danger" } {
  if (estimado <= 0) return { label: "Sem estimativa", color: "neutral" };
  const frac = pago / estimado;
  if (frac > 1) return { label: "Acima do orçamento", color: "danger" };
  if (frac >= 0.85) return { label: "Próximo do limite", color: "warning" };
  return { label: "Dentro do orçamento", color: "success" };
}

export default async function OrcamentoPage() {
  const { projeto } = await getProjetoAtual();

  const [itens, categorias, ambientes] = await Promise.all([
    prisma.orcamentoItem.findMany({
      where: { projetoId: projeto.id, deletedAt: null },
      include: { categoria: true, ambiente: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.categoria.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.ambiente.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { ordem: "asc" } }),
  ]);

  const reservaCentavos = calcularReservaContingencia(
    projeto.orcamentoTotalCentavos,
    projeto.reservaContingenciaPercent
  );

  const totalEstimado = itens.reduce((a, i) => a + i.valorEstimadoCentavos, 0);
  const totalAprovado = itens.reduce((a, i) => a + i.valorAprovadoCentavos, 0);
  const totalContratado = itens.reduce((a, i) => a + i.valorContratadoCentavos, 0);
  const totalPago = itens.reduce((a, i) => a + i.valorPagoCentavos, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Orçamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Divisão do orçamento por item, com reserva de contingência de {projeto.reservaContingenciaPercent}%.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Orçamento total" value={formatarMoeda(projeto.orcamentoTotalCentavos)} />
        <StatCard label="Reserva de contingência" value={formatarMoeda(reservaCentavos)} tone="gold" />
        <StatCard label="Estimado (itens)" value={formatarMoeda(totalEstimado)} />
        <StatCard label="Aprovado" value={formatarMoeda(totalAprovado)} />
        <StatCard label="Contratado" value={formatarMoeda(totalContratado)} />
        <StatCard label="Pago" value={formatarMoeda(totalPago)} tone="accent" />
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Novo item de orçamento</summary>
          <form action={criarItemOrcamento} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nome do item">
              <TextInput name="nome" required placeholder="Ex: Marcenaria cozinha" />
            </Field>
            <Field label="Prioridade">
              <SelectInput name="prioridade" defaultValue="media">
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </SelectInput>
            </Field>
            <Field label="Categoria">
              <SelectInput name="categoriaId" defaultValue="">
                <option value="">Sem categoria</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Ambiente">
              <SelectInput name="ambienteId" defaultValue="">
                <option value="">Sem ambiente</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Valor estimado (R$)">
              <TextInput name="valorEstimado" type="number" step="0.01" min="0" defaultValue="0" />
            </Field>
            <Field label="Valor aprovado (R$)">
              <TextInput name="valorAprovado" type="number" step="0.01" min="0" defaultValue="0" />
            </Field>
            <Field label="Valor contratado (R$)">
              <TextInput name="valorContratado" type="number" step="0.01" min="0" defaultValue="0" />
            </Field>
            <Field label="Valor pago (R$)">
              <TextInput name="valorPago" type="number" step="0.01" min="0" defaultValue="0" />
            </Field>
            <Field label="Descrição" className="md:col-span-2">
              <TextInput name="descricao" placeholder="Opcional" />
            </Field>
            <Field label="Observações" className="md:col-span-2">
              <TextArea name="observacoes" rows={2} />
            </Field>
            <div className="md:col-span-2">
              <SubmitButton>Adicionar item</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      <Card className="overflow-x-auto">
        <CardTitle>Itens do orçamento ({itens.length})</CardTitle>
        {itens.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhum item de orçamento cadastrado" description="Adicione o primeiro item acima." />
          </div>
        ) : (
          <table className="mt-3 w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Estimado</th>
                <th className="py-2 pr-3">Aprovado</th>
                <th className="py-2 pr-3">Contratado</th>
                <th className="py-2 pr-3">Pago</th>
                <th className="py-2 pr-3">% consumido</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const ind = indicador(item.valorEstimadoCentavos, item.valorPagoCentavos);
                const percentualConsumido =
                  item.valorEstimadoCentavos > 0 ? item.valorPagoCentavos / item.valorEstimadoCentavos : 0;
                const atualizarComId = atualizarItemOrcamento.bind(null, item.id);
                const excluirComId = excluirItemOrcamento.bind(null, item.id);
                return (
                  <tr key={item.id} className="border-b border-border align-top last:border-0">
                    <td className="py-2.5 pr-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-foreground">{item.nome}</summary>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.categoria?.nome ?? "—"} · {item.ambiente?.nome ?? "—"} · Prioridade:{" "}
                          {PRIORIDADE_LABEL[item.prioridade]}
                        </p>
                        <form action={atualizarComId} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Field label="Nome do item">
                            <TextInput name="nome" defaultValue={item.nome} required />
                          </Field>
                          <Field label="Prioridade">
                            <SelectInput name="prioridade" defaultValue={item.prioridade}>
                              <option value="alta">Alta</option>
                              <option value="media">Média</option>
                              <option value="baixa">Baixa</option>
                            </SelectInput>
                          </Field>
                          <Field label="Categoria">
                            <SelectInput name="categoriaId" defaultValue={item.categoriaId ?? ""}>
                              <option value="">Sem categoria</option>
                              {categorias.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </SelectInput>
                          </Field>
                          <Field label="Ambiente">
                            <SelectInput name="ambienteId" defaultValue={item.ambienteId ?? ""}>
                              <option value="">Sem ambiente</option>
                              {ambientes.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.nome}
                                </option>
                              ))}
                            </SelectInput>
                          </Field>
                          <Field label="Valor estimado (R$)">
                            <TextInput
                              name="valorEstimado"
                              type="number"
                              step="0.01"
                              defaultValue={(item.valorEstimadoCentavos / 100).toFixed(2)}
                            />
                          </Field>
                          <Field label="Valor aprovado (R$)">
                            <TextInput
                              name="valorAprovado"
                              type="number"
                              step="0.01"
                              defaultValue={(item.valorAprovadoCentavos / 100).toFixed(2)}
                            />
                          </Field>
                          <Field label="Valor contratado (R$)">
                            <TextInput
                              name="valorContratado"
                              type="number"
                              step="0.01"
                              defaultValue={(item.valorContratadoCentavos / 100).toFixed(2)}
                            />
                          </Field>
                          <Field label="Valor pago (R$)">
                            <TextInput
                              name="valorPago"
                              type="number"
                              step="0.01"
                              defaultValue={(item.valorPagoCentavos / 100).toFixed(2)}
                            />
                          </Field>
                          <Field label="Observações" className="md:col-span-2">
                            <TextArea name="observacoes" rows={2} defaultValue={item.observacoes ?? ""} />
                          </Field>
                          <div className="md:col-span-2">
                            <SubmitButton>Salvar alterações</SubmitButton>
                          </div>
                        </form>
                      </details>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatarMoeda(item.valorEstimadoCentavos)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatarMoeda(item.valorAprovadoCentavos)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatarMoeda(item.valorContratadoCentavos)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatarMoeda(item.valorPagoCentavos)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatarPercentual(percentualConsumido)}</td>
                    <td className="py-2.5 pr-3">
                      <Badge color={ind.color}>{ind.label}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir o item "${item.nome}"?`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
