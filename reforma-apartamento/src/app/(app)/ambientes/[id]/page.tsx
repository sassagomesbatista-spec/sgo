import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/money";
import { calcularProgressoFisico, totalContratado, totalPago } from "@/lib/calculos";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput, SubmitButton } from "@/components/ui/form";
import { LANCAMENTO_STATUS, LANCAMENTO_STATUS_COLOR, TAREFA_STATUS, TAREFA_STATUS_COLOR } from "@/lib/status";
import { atualizarAmbiente } from "../actions";

export default async function AmbienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { projeto } = await getProjetoAtual();

  const ambiente = await prisma.ambiente.findFirst({
    where: { id, projetoId: projeto.id, deletedAt: null },
    include: {
      lancamentos: { where: { deletedAt: null }, include: { fornecedor: true }, orderBy: { dataVencimento: "asc" } },
      tarefas: { where: { deletedAt: null }, orderBy: { dataInicioPlanejada: "asc" } },
      documentos: { where: { deletedAt: null } },
    },
  });

  if (!ambiente) notFound();

  const pago = totalPago(ambiente.lancamentos);
  const contratado = totalContratado(ambiente.lancamentos);
  const saldo = ambiente.orcamentoCentavos - pago;
  const progresso = calcularProgressoFisico(ambiente.tarefas);

  const fornecedoresEnvolvidos = new Map<string, string>();
  for (const l of ambiente.lancamentos) {
    if (l.fornecedor) fornecedoresEnvolvidos.set(l.fornecedor.id, l.fornecedor.nome);
  }

  const atualizarComId = atualizarAmbiente.bind(null, ambiente.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ambientes" className="text-sm text-accent hover:underline">
          ← Ambientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{ambiente.nome}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Orçamento" value={formatarMoeda(ambiente.orcamentoCentavos)} />
        <StatCard label="Contratado" value={formatarMoeda(contratado)} />
        <StatCard label="Pago" value={formatarMoeda(pago)} tone="accent" />
        <StatCard label="Saldo" value={formatarMoeda(saldo)} tone={saldo < 0 ? "danger" : "success"} />
      </div>

      <Card>
        <CardTitle>Progresso físico</CardTitle>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.min(100, progresso * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{(progresso * 100).toFixed(0)}% concluído</p>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Editar ambiente</summary>
          <form action={atualizarComId} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Nome">
              <TextInput name="nome" defaultValue={ambiente.nome} required />
            </Field>
            <Field label="Orçamento (R$)">
              <TextInput
                name="orcamento"
                type="number"
                step="0.01"
                defaultValue={(ambiente.orcamentoCentavos / 100).toFixed(2)}
              />
            </Field>
            <div className="flex items-end">
              <SubmitButton>Salvar</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Tarefas do cronograma ({ambiente.tarefas.length})</CardTitle>
          <div className="mt-3 space-y-2">
            {ambiente.tarefas.length === 0 && <EmptyState title="Nenhuma tarefa vinculada" />}
            {ambiente.tarefas.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <p className="text-sm text-foreground">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarData(t.dataInicioPlanejada)} → {formatarData(t.dataTerminoPlanejada)}
                  </p>
                </div>
                <Badge color={TAREFA_STATUS_COLOR[t.status]}>{TAREFA_STATUS[t.status]}</Badge>
              </div>
            ))}
          </div>
          <Link href="/cronograma" className="mt-3 inline-block text-sm text-accent hover:underline">
            Ver cronograma completo →
          </Link>
        </Card>

        <Card>
          <CardTitle>Fornecedores envolvidos ({fornecedoresEnvolvidos.size})</CardTitle>
          <div className="mt-3 space-y-1">
            {fornecedoresEnvolvidos.size === 0 && <EmptyState title="Nenhum fornecedor vinculado ainda" />}
            {Array.from(fornecedoresEnvolvidos.entries()).map(([fid, nome]) => (
              <Link key={fid} href={`/fornecedores/${fid}`} className="block text-sm text-accent hover:underline">
                {nome}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardTitle>Lançamentos ({ambiente.lancamentos.length})</CardTitle>
        {ambiente.lancamentos.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhum lançamento neste ambiente" />
          </div>
        ) : (
          <table className="mt-3 w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Descrição</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3">Vencimento</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {ambiente.lancamentos.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">{l.descricao}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatarMoeda(l.valorCentavos)}</td>
                  <td className="py-2 pr-3">{formatarData(l.dataVencimento)}</td>
                  <td className="py-2 pr-3">
                    <Badge color={LANCAMENTO_STATUS_COLOR[l.status]}>{LANCAMENTO_STATUS[l.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <CardTitle>Documentos ({ambiente.documentos.length})</CardTitle>
        <div className="mt-3 space-y-1">
          {ambiente.documentos.length === 0 && <EmptyState title="Nenhum documento vinculado" />}
          {ambiente.documentos.map((d) => (
            <a key={d.id} href={d.url} target="_blank" className="block text-sm text-accent hover:underline">
              {d.nome}
            </a>
          ))}
        </div>
        <Link href="/documentos" className="mt-3 inline-block text-sm text-accent hover:underline">
          Ver todos os documentos →
        </Link>
      </Card>
    </div>
  );
}
