import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarData } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { LANCAMENTO_STATUS, LANCAMENTO_STATUS_COLOR, TAREFA_STATUS_COLOR, TAREFA_STATUS } from "@/lib/status";
import { atualizarFornecedor } from "../actions";
import { FornecedorForm } from "../fornecedor-form";

export default async function FornecedorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { projeto } = await getProjetoAtual();

  const fornecedor = await prisma.fornecedor.findFirst({
    where: { id, projetoId: projeto.id, deletedAt: null },
    include: {
      lancamentos: { where: { deletedAt: null }, orderBy: { dataVencimento: "asc" } },
      tarefas: { where: { deletedAt: null } },
      documentos: { where: { deletedAt: null } },
      contratos: { where: { deletedAt: null } },
      cotacoes: { where: { deletedAt: null } },
    },
  });

  if (!fornecedor) notFound();

  const saidas = fornecedor.lancamentos.filter((l) => l.tipo === "saida");
  const contratado = saidas.reduce((acc, l) => acc + l.valorCentavos, 0);
  const pago = saidas
    .filter((l) => ["pago", "pago_parcialmente"].includes(l.status))
    .reduce((acc, l) => acc + l.valorCentavos, 0);
  const atrasos = saidas.filter((l) => l.status === "vencido");
  const proximosVencimentos = saidas
    .filter((l) => l.dataVencimento && l.dataVencimento >= new Date() && !["pago", "cancelado"].includes(l.status))
    .slice(0, 5);

  const atualizarComId = atualizarFornecedor.bind(null, fornecedor.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/fornecedores" className="text-sm text-accent hover:underline">
          ← Fornecedores
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{fornecedor.nome}</h1>
        <p className="text-sm text-muted-foreground">{fornecedor.especialidade ?? fornecedor.tipo}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total contratado" value={formatarMoeda(contratado)} />
        <StatCard label="Total pago" value={formatarMoeda(pago)} tone="accent" />
        <StatCard label="Saldo pendente" value={formatarMoeda(contratado - pago)} />
        <StatCard label="Pagamentos vencidos" value={String(atrasos.length)} tone={atrasos.length ? "danger" : "neutral"} />
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Editar dados do fornecedor</summary>
          <FornecedorForm action={atualizarComId} valores={fornecedor} modoEdicao />
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Próximos vencimentos</CardTitle>
          <div className="mt-3 space-y-2">
            {proximosVencimentos.length === 0 && <EmptyState title="Nenhum vencimento futuro" />}
            {proximosVencimentos.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <p className="text-sm text-foreground">{l.descricao}</p>
                  <p className="text-xs text-muted-foreground">{formatarData(l.dataVencimento)}</p>
                </div>
                <span className="tabular-nums text-sm">{formatarMoeda(l.valorCentavos)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Tarefas relacionadas</CardTitle>
          <div className="mt-3 space-y-2">
            {fornecedor.tarefas.length === 0 && <EmptyState title="Nenhuma tarefa vinculada" />}
            {fornecedor.tarefas.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <p className="text-sm text-foreground">{t.titulo}</p>
                <Badge color={TAREFA_STATUS_COLOR[t.status]}>{TAREFA_STATUS[t.status]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardTitle>Histórico de pagamentos ({fornecedor.lancamentos.length})</CardTitle>
        {fornecedor.lancamentos.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nenhum lançamento associado" />
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
              {fornecedor.lancamentos.map((l) => (
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
        <CardTitle>Documentos ({fornecedor.documentos.length})</CardTitle>
        <div className="mt-3 space-y-1">
          {fornecedor.documentos.length === 0 && <EmptyState title="Nenhum documento" />}
          {fornecedor.documentos.map((d) => (
            <a key={d.id} href={d.url} target="_blank" className="block text-sm text-accent hover:underline">
              {d.nome}
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}
