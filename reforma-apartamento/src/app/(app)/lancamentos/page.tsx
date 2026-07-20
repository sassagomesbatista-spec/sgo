import Link from "next/link";
import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput, SelectInput, TextArea, SubmitButton, GhostButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { LANCAMENTO_STATUS, LANCAMENTO_STATUS_COLOR } from "@/lib/status";
import { Download, Upload, Paperclip, Copy, CheckCircle2 } from "lucide-react";
import {
  criarLancamento,
  atualizarLancamento,
  excluirLancamento,
  duplicarLancamento,
  marcarComoPago,
} from "./actions";
import { ImportForm } from "./import-form";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { projeto } = await getProjetoAtual();
  const filtros = await searchParams;

  const [categorias, ambientes, fornecedores, tarefas] = await Promise.all([
    prisma.categoria.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.ambiente.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { ordem: "asc" } }),
    prisma.fornecedor.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.tarefa.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { titulo: "asc" } }),
  ]);

  const lancamentos = await prisma.lancamento.findMany({
    where: {
      projetoId: projeto.id,
      deletedAt: null,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
      ...(filtros.ambienteId ? { ambienteId: filtros.ambienteId } : {}),
      ...(filtros.fornecedorId ? { fornecedorId: filtros.fornecedorId } : {}),
      ...(filtros.busca ? { descricao: { contains: filtros.busca } } : {}),
    },
    include: { categoria: true, ambiente: true, fornecedor: true, etapa: true },
    orderBy: { dataVencimento: "asc" },
  });

  const totalFiltrado = lancamentos.reduce(
    (acc, l) => acc + (l.tipo === "entrada" ? l.valorCentavos : -l.valorCentavos),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Lançamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entradas e saídas financeiras da reforma.</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/lancamentos/export">
            <GhostButton type="button" className="flex items-center gap-2">
              <Download size={15} /> Exportar CSV
            </GhostButton>
          </a>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <form className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6" method="get">
          <Field label="Busca">
            <TextInput name="busca" defaultValue={filtros.busca ?? ""} placeholder="Descrição..." />
          </Field>
          <Field label="Tipo">
            <SelectInput name="tipo" defaultValue={filtros.tipo ?? ""}>
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput name="status" defaultValue={filtros.status ?? ""}>
              <option value="">Todos</option>
              {Object.entries(LANCAMENTO_STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Categoria">
            <SelectInput name="categoriaId" defaultValue={filtros.categoriaId ?? ""}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Ambiente">
            <SelectInput name="ambienteId" defaultValue={filtros.ambienteId ?? ""}>
              <option value="">Todos</option>
              {ambientes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Fornecedor">
            <SelectInput name="fornecedorId" defaultValue={filtros.fornecedorId ?? ""}>
              <option value="">Todos</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="col-span-2 flex items-end gap-2 md:col-span-4 lg:col-span-6">
            <SubmitButton>Filtrar</SubmitButton>
            <Link href="/lancamentos">
              <GhostButton type="button">Limpar filtros</GhostButton>
            </Link>
            <span className="ml-auto self-center text-sm text-muted-foreground">
              {lancamentos.length} resultado(s) · saldo do filtro:{" "}
              <span className="font-medium text-foreground">{formatarMoeda(totalFiltrado)}</span>
            </span>
          </div>
        </form>
      </Card>

      {/* Novo lançamento */}
      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Novo lançamento</summary>
          <FormularioLancamento
            action={criarLancamento}
            categorias={categorias}
            ambientes={ambientes}
            fornecedores={fornecedores}
            tarefas={tarefas}
          />
        </details>
      </Card>

      {/* Importar CSV */}
      <Card>
        <details>
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
            <Upload size={15} /> Importar lançamentos via CSV
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Colunas esperadas (com cabeçalho): tipo, descricao, valor, data_vencimento (AAAA-MM-DD), status.
          </p>
          <ImportForm />
        </details>
      </Card>

      {/* Tabela */}
      <Card className="overflow-x-auto">
        <CardTitle>Lançamentos ({lancamentos.length})</CardTitle>
        {lancamentos.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhum lançamento encontrado" description="Ajuste os filtros ou crie um novo lançamento." />
          </div>
        ) : (
          <table className="mt-3 w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Descrição</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3">Vencimento</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Fornecedor</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => {
                const atualizarComId = atualizarLancamento.bind(null, l.id);
                const excluirComId = excluirLancamento.bind(null, l.id);
                const duplicarComId = duplicarLancamento.bind(null, l.id);
                const marcarPagoComId = marcarComoPago.bind(null, l.id);
                return (
                  <tr key={l.id} className="border-b border-border align-top last:border-0">
                    <td className="py-2.5 pr-3">
                      <details>
                        <summary className="cursor-pointer font-medium text-foreground">
                          {l.descricao}
                          {(l.numeroParcelas ?? 1) > 1 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({l.parcelaAtual}/{l.numeroParcelas})
                            </span>
                          )}
                        </summary>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {l.categoria?.nome ?? "—"} · {l.ambiente?.nome ?? "—"}
                          {l.comprovanteUrl && (
                            <>
                              {" "}
                              ·{" "}
                              <a href={l.comprovanteUrl} target="_blank" className="inline-flex items-center gap-1 text-accent underline">
                                <Paperclip size={12} /> comprovante
                              </a>
                            </>
                          )}
                        </p>
                        <FormularioLancamento
                          action={atualizarComId}
                          categorias={categorias}
                          ambientes={ambientes}
                          fornecedores={fornecedores}
                          tarefas={tarefas}
                          valores={l}
                          modoEdicao
                        />
                      </details>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge color={l.tipo === "entrada" ? "success" : "neutral"}>
                        {l.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{formatarMoeda(l.valorCentavos)}</td>
                    <td className="py-2.5 pr-3">{formatarData(l.dataVencimento)}</td>
                    <td className="py-2.5 pr-3">
                      <Badge color={LANCAMENTO_STATUS_COLOR[l.status]}>{LANCAMENTO_STATUS[l.status]}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">{l.fornecedor?.nome ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        {l.status !== "pago" && l.tipo === "saida" && (
                          <form action={marcarPagoComId}>
                            <button
                              type="submit"
                              aria-label="Marcar como pago"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-success-bg hover:text-success"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          </form>
                        )}
                        <form action={duplicarComId}>
                          <button
                            type="submit"
                            aria-label="Duplicar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                          >
                            <Copy size={15} />
                          </button>
                        </form>
                        <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir "${l.descricao}"?`} />
                      </div>
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

type LancamentoValores = {
  tipo: string;
  descricao: string;
  valorCentavos: number;
  dataLancamento: Date;
  dataCompetencia: Date | null;
  dataVencimento: Date | null;
  dataPagamento: Date | null;
  status: string;
  categoriaId: string | null;
  ambienteId: string | null;
  etapaId: string | null;
  fornecedorId: string | null;
  formaPagamento: string | null;
  contaOrigemDestino: string | null;
  numeroParcelas: number | null;
  recorrencia: string | null;
  observacoes: string | null;
  tags: string | null;
  notaFiscal: string | null;
};

function paraInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function FormularioLancamento({
  action,
  categorias,
  ambientes,
  fornecedores,
  tarefas,
  valores,
  modoEdicao,
}: {
  action: (formData: FormData) => Promise<void>;
  categorias: { id: string; nome: string }[];
  ambientes: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
  tarefas: { id: string; titulo: string }[];
  valores?: LancamentoValores;
  modoEdicao?: boolean;
}) {
  return (
    <form action={action} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" encType="multipart/form-data">
      <Field label="Tipo">
        <SelectInput name="tipo" defaultValue={valores?.tipo ?? "saida"}>
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </SelectInput>
      </Field>
      <Field label="Descrição" className="md:col-span-2">
        <TextInput name="descricao" required defaultValue={valores?.descricao ?? ""} />
      </Field>
      <Field label="Valor (R$)">
        <TextInput
          name="valor"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={valores ? (valores.valorCentavos / 100).toFixed(2) : ""}
        />
      </Field>
      <Field label="Status">
        <SelectInput name="status" defaultValue={valores?.status ?? "previsto"}>
          {Object.entries(LANCAMENTO_STATUS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectInput>
      </Field>
      {!modoEdicao && (
        <Field label="Nº de parcelas">
          <TextInput name="numeroParcelas" type="number" min="1" defaultValue="1" />
        </Field>
      )}
      <Field label="Data de lançamento">
        <TextInput name="dataLancamento" type="date" defaultValue={paraInputDate(valores?.dataLancamento) || undefined} />
      </Field>
      <Field label="Data de competência">
        <TextInput name="dataCompetencia" type="date" defaultValue={paraInputDate(valores?.dataCompetencia)} />
      </Field>
      <Field label="Data de vencimento">
        <TextInput name="dataVencimento" type="date" defaultValue={paraInputDate(valores?.dataVencimento)} />
      </Field>
      <Field label="Data de pagamento">
        <TextInput name="dataPagamento" type="date" defaultValue={paraInputDate(valores?.dataPagamento)} />
      </Field>
      <Field label="Categoria">
        <SelectInput name="categoriaId" defaultValue={valores?.categoriaId ?? ""}>
          <option value="">Sem categoria</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Ambiente">
        <SelectInput name="ambienteId" defaultValue={valores?.ambienteId ?? ""}>
          <option value="">Sem ambiente</option>
          {ambientes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Etapa do cronograma">
        <SelectInput name="etapaId" defaultValue={valores?.etapaId ?? ""}>
          <option value="">Sem etapa</option>
          {tarefas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.titulo}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Fornecedor">
        <SelectInput name="fornecedorId" defaultValue={valores?.fornecedorId ?? ""}>
          <option value="">Sem fornecedor</option>
          {fornecedores.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Forma de pagamento">
        <TextInput name="formaPagamento" defaultValue={valores?.formaPagamento ?? ""} placeholder="Pix, boleto..." />
      </Field>
      <Field label="Conta de origem/destino">
        <TextInput name="contaOrigemDestino" defaultValue={valores?.contaOrigemDestino ?? ""} />
      </Field>
      <Field label="Recorrência">
        <SelectInput name="recorrencia" defaultValue={valores?.recorrencia ?? ""}>
          <option value="">Nenhuma</option>
          <option value="mensal">Mensal</option>
          <option value="bimestral">Bimestral</option>
          <option value="anual">Anual</option>
        </SelectInput>
      </Field>
      <Field label="Nota fiscal">
        <TextInput name="notaFiscal" defaultValue={valores?.notaFiscal ?? ""} placeholder="Número da NF" />
      </Field>
      <Field label="Tags (separadas por vírgula)">
        <TextInput name="tags" defaultValue={valores?.tags ?? ""} />
      </Field>
      <Field label="Comprovante / nota fiscal (arquivo)">
        <input type="file" name="comprovante" className="block w-full text-sm text-muted-foreground" />
      </Field>
      <Field label="Observações" className="md:col-span-3">
        <TextArea name="observacoes" rows={2} defaultValue={valores?.observacoes ?? ""} />
      </Field>
      <div className="md:col-span-3">
        <SubmitButton>{modoEdicao ? "Salvar alterações" : "Adicionar lançamento"}</SubmitButton>
      </div>
    </form>
  );
}
