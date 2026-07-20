import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput, SelectInput, TextArea, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { criarContrato, atualizarContrato, excluirContrato } from "./actions";

function paraInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

const STATUS_COR: Record<string, "neutral" | "success" | "danger" | "warning"> = {
  rascunho: "neutral",
  ativo: "warning",
  concluido: "success",
  cancelado: "danger",
};

export default async function ContratosPage() {
  const { projeto } = await getProjetoAtual();

  const [contratos, fornecedores] = await Promise.all([
    prisma.contrato.findMany({
      where: { projetoId: projeto.id, deletedAt: null },
      include: { fornecedor: true, lancamentos: { where: { deletedAt: null } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fornecedor.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Compras e Contratos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Contratos, pedidos de compra e condições acordadas.</p>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Novo contrato</summary>
          <form action={criarContrato} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <Field label="Valor total (R$)">
              <TextInput name="valorTotal" type="number" step="0.01" required />
            </Field>
            <Field label="Status">
              <SelectInput name="status" defaultValue="ativo">
                <option value="rascunho">Rascunho</option>
                <option value="ativo">Ativo</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </SelectInput>
            </Field>
            <Field label="Data de início">
              <TextInput name="dataInicio" type="date" />
            </Field>
            <Field label="Data de fim">
              <TextInput name="dataFim" type="date" />
            </Field>
            <Field label="Forma de pagamento">
              <TextInput name="formaPagamento" />
            </Field>
            <Field label="Prazo">
              <TextInput name="prazo" />
            </Field>
            <Field label="Garantia">
              <TextInput name="garantia" />
            </Field>
            <Field label="Multas">
              <TextInput name="multas" />
            </Field>
            <Field label="Escopo" className="md:col-span-3">
              <TextArea name="escopo" rows={2} required />
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>Adicionar contrato</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      {contratos.length === 0 ? (
        <EmptyState title="Nenhum contrato cadastrado" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {contratos.map((c) => {
            const pago = c.lancamentos
              .filter((l) => ["pago", "pago_parcialmente"].includes(l.status))
              .reduce((acc, l) => acc + l.valorCentavos, 0);
            const atualizarComId = atualizarContrato.bind(null, c.id);
            const excluirComId = excluirContrato.bind(null, c.id);
            return (
              <Card key={c.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{c.fornecedor?.nome ?? "Sem fornecedor"}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{c.escopo}</p>
                  </div>
                  <Badge color={STATUS_COR[c.status] ?? "neutral"}>{c.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="tabular-nums">{formatarMoeda(c.valorTotalCentavos)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Pago</span>
                    <span className="tabular-nums">{formatarMoeda(pago)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Início</span>
                    <span>{formatarData(c.dataInicio)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">Fim</span>
                    <span>{formatarData(c.dataFim)}</span>
                  </p>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-accent">Editar</summary>
                  <form action={atualizarComId} className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Fornecedor">
                      <SelectInput name="fornecedorId" defaultValue={c.fornecedorId ?? ""}>
                        <option value="">Selecione</option>
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                    <Field label="Valor total (R$)">
                      <TextInput
                        name="valorTotal"
                        type="number"
                        step="0.01"
                        defaultValue={(c.valorTotalCentavos / 100).toFixed(2)}
                      />
                    </Field>
                    <Field label="Status">
                      <SelectInput name="status" defaultValue={c.status}>
                        <option value="rascunho">Rascunho</option>
                        <option value="ativo">Ativo</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </SelectInput>
                    </Field>
                    <Field label="Data de início">
                      <TextInput name="dataInicio" type="date" defaultValue={paraInputDate(c.dataInicio)} />
                    </Field>
                    <Field label="Data de fim">
                      <TextInput name="dataFim" type="date" defaultValue={paraInputDate(c.dataFim)} />
                    </Field>
                    <Field label="Forma de pagamento">
                      <TextInput name="formaPagamento" defaultValue={c.formaPagamento ?? ""} />
                    </Field>
                    <Field label="Prazo">
                      <TextInput name="prazo" defaultValue={c.prazo ?? ""} />
                    </Field>
                    <Field label="Garantia">
                      <TextInput name="garantia" defaultValue={c.garantia ?? ""} />
                    </Field>
                    <Field label="Escopo" className="md:col-span-2">
                      <TextArea name="escopo" rows={2} defaultValue={c.escopo} />
                    </Field>
                    <div className="md:col-span-2">
                      <SubmitButton>Salvar</SubmitButton>
                    </div>
                  </form>
                  <div className="mt-2">
                    <ConfirmDeleteButton action={excluirComId} confirmMessage="Excluir este contrato?" />
                  </div>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
