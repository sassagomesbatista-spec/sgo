import Link from "next/link";
import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { formatarMoeda, formatarData } from "@/lib/money";
import { calcularAtrasoTarefaDias, diasEntre } from "@/lib/calculos";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { TAREFA_STATUS, TAREFA_STATUS_COLOR } from "@/lib/status";
import { TarefaForm } from "./tarefa-form";
import { criarTarefa, atualizarTarefa, excluirTarefa, mudarStatusTarefa } from "./actions";

type TarefaComRelacoes = Prisma.TarefaGetPayload<{ include: { ambiente: true; fornecedor: true } }>;

const ORDEM_STATUS = [
  "nao_iniciado",
  "aguardando_decisao",
  "aguardando_material",
  "aguardando_fornecedor",
  "em_andamento",
  "concluido",
];

export default async function CronogramaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { projeto } = await getProjetoAtual();
  const { view = "lista" } = await searchParams;

  const [tarefas, ambientes, categorias, fornecedores, dependencias] = await Promise.all([
    prisma.tarefa.findMany({
      where: { projetoId: projeto.id, deletedAt: null },
      include: { ambiente: true, fornecedor: true },
      orderBy: { dataInicioPlanejada: "asc" },
    }),
    prisma.ambiente.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { ordem: "asc" } }),
    prisma.categoria.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
    prisma.tarefaDependencia.findMany({ where: { tarefa: { projetoId: projeto.id } } }),
  ]);

  const dependenciasPorTarefa = new Map<string, string[]>();
  for (const d of dependencias) {
    const lista = dependenciasPorTarefa.get(d.tarefaId) ?? [];
    lista.push(d.dependeDeId);
    dependenciasPorTarefa.set(d.tarefaId, lista);
  }
  const tituloPorId = new Map(tarefas.map((t) => [t.id, t.titulo]));

  const hoje = new Date();
  const atrasadas = tarefas.filter(
    (t) => t.status !== "concluido" && t.status !== "cancelado" && calcularAtrasoTarefaDias(t, hoje) > 0
  );
  const semResponsavel = tarefas.filter(
    (t) => !t.responsavel && t.status !== "concluido" && t.status !== "cancelado"
  );
  const semCusto = tarefas.filter((t) => t.custoPrevistoCentavos === 0 && t.status !== "cancelado");

  const tabClass = (ativo: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium ${ativo ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-muted"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cronograma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prazo original: {formatarData(projeto.dataInicioPrevista)} → {formatarData(projeto.dataTerminoPrevista)}.
            Previsão atual: {formatarData(projeto.dataTerminoRevisada ?? projeto.dataTerminoPrevista)}.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <Link href="/cronograma?view=lista" className={tabClass(view === "lista")}>
            Lista
          </Link>
          <Link href="/cronograma?view=kanban" className={tabClass(view === "kanban")}>
            Kanban
          </Link>
          <Link href="/cronograma?view=linha-do-tempo" className={tabClass(view === "linha-do-tempo")}>
            Linha do tempo
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardTitle>Etapas atrasadas ({atrasadas.length})</CardTitle>
          <div className="mt-2 space-y-1">
            {atrasadas.slice(0, 5).map((t) => (
              <p key={t.id} className="text-sm text-danger">
                {t.titulo} — {calcularAtrasoTarefaDias(t, hoje)}d
              </p>
            ))}
            {atrasadas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma etapa atrasada.</p>}
          </div>
        </Card>
        <Card>
          <CardTitle>Sem responsável ({semResponsavel.length})</CardTitle>
          <div className="mt-2 space-y-1">
            {semResponsavel.slice(0, 5).map((t) => (
              <p key={t.id} className="text-sm text-muted-foreground">
                {t.titulo}
              </p>
            ))}
            {semResponsavel.length === 0 && <p className="text-sm text-muted-foreground">Todas com responsável.</p>}
          </div>
        </Card>
        <Card>
          <CardTitle>Sem custo definido ({semCusto.length})</CardTitle>
          <div className="mt-2 space-y-1">
            {semCusto.slice(0, 5).map((t) => (
              <p key={t.id} className="text-sm text-muted-foreground">
                {t.titulo}
              </p>
            ))}
            {semCusto.length === 0 && <p className="text-sm text-muted-foreground">Todas com custo previsto.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Nova tarefa</summary>
          <TarefaForm
            action={criarTarefa}
            ambientes={ambientes}
            categorias={categorias}
            fornecedores={fornecedores}
            todasTarefas={tarefas}
          />
        </details>
      </Card>

      {tarefas.length === 0 ? (
        <EmptyState title="Nenhuma tarefa cadastrada" description="Adicione a primeira etapa do cronograma acima." />
      ) : view === "kanban" ? (
        <KanbanView tarefas={tarefas} hoje={hoje} />
      ) : view === "linha-do-tempo" ? (
        <LinhaDoTempo tarefas={tarefas} projeto={projeto} />
      ) : (
        <ListaView
          tarefas={tarefas}
          ambientes={ambientes}
          categorias={categorias}
          fornecedores={fornecedores}
          dependenciasPorTarefa={dependenciasPorTarefa}
          tituloPorId={tituloPorId}
          hoje={hoje}
        />
      )}
    </div>
  );
}

function ListaView({
  tarefas,
  ambientes,
  categorias,
  fornecedores,
  dependenciasPorTarefa,
  tituloPorId,
  hoje,
}: {
  tarefas: TarefaComRelacoes[];
  ambientes: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
  dependenciasPorTarefa: Map<string, string[]>;
  tituloPorId: Map<string, string>;
  hoje: Date;
}) {
  return (
    <Card className="overflow-x-auto">
      <CardTitle>Tarefas ({tarefas.length})</CardTitle>
      <table className="mt-3 w-full min-w-[1000px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3">Tarefa</th>
            <th className="py-2 pr-3">Planejado</th>
            <th className="py-2 pr-3">% concl.</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Atraso</th>
            <th className="py-2 pr-3">Custo (prev./real.)</th>
            <th className="py-2 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {tarefas.map((t) => {
            const atualizarComId = atualizarTarefa.bind(null, t.id);
            const excluirComId = excluirTarefa.bind(null, t.id);
            const atraso = calcularAtrasoTarefaDias(t, hoje);
            const deps = (dependenciasPorTarefa.get(t.id) ?? []).map((id) => tituloPorId.get(id)).filter(Boolean);
            return (
              <tr key={t.id} className="border-b border-border align-top last:border-0">
                <td className="py-2.5 pr-3">
                  <details>
                    <summary className="cursor-pointer font-medium text-foreground">
                      {t.ehMarco && "🚩 "}
                      {t.titulo}
                    </summary>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.ambiente?.nome ?? "—"} · {t.responsavel ?? "Sem responsável"}
                      {deps.length > 0 && <> · depende de: {deps.join(", ")}</>}
                    </p>
                    <TarefaForm
                      action={atualizarComId}
                      ambientes={ambientes}
                      categorias={categorias}
                      fornecedores={fornecedores}
                      todasTarefas={tarefas}
                      valores={t}
                      tarefaId={t.id}
                      dependenciasAtuais={dependenciasPorTarefa.get(t.id) ?? []}
                      modoEdicao
                    />
                  </details>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  {formatarData(t.dataInicioPlanejada)} → {formatarData(t.dataTerminoPlanejada)}
                </td>
                <td className="py-2.5 pr-3">{t.percentualConcluido}%</td>
                <td className="py-2.5 pr-3">
                  <Badge color={TAREFA_STATUS_COLOR[t.status]}>{TAREFA_STATUS[t.status]}</Badge>
                </td>
                <td className="py-2.5 pr-3">
                  {atraso > 0 ? <Badge color="danger">{atraso}d</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap tabular-nums">
                  {formatarMoeda(t.custoPrevistoCentavos)} / {formatarMoeda(t.custoRealizadoCentavos)}
                </td>
                <td className="py-2.5 pr-3">
                  <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir a tarefa "${t.titulo}"?`} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function KanbanView({
  tarefas,
  hoje,
}: {
  tarefas: TarefaComRelacoes[];
  hoje: Date;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Object.entries(TAREFA_STATUS).map(([status, label]) => {
        const doColuna = tarefas.filter((t) => t.status === status);
        return (
          <div key={status} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <span className="text-xs text-muted-foreground">{doColuna.length}</span>
            </div>
            <div className="space-y-2">
              {doColuna.map((t) => {
                const atraso = calcularAtrasoTarefaDias(t, hoje);
                const proximoIndex = ORDEM_STATUS.indexOf(status) + 1;
                const proximoStatus = ORDEM_STATUS[proximoIndex];
                return (
                  <div key={t.id} className="rounded-xl border border-border bg-surface p-3 text-sm">
                    <p className="font-medium text-foreground">
                      {t.ehMarco && "🚩 "}
                      {t.titulo}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{t.responsavel ?? "Sem responsável"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatarData(t.dataTerminoPlanejada)}</p>
                    {atraso > 0 && (
                      <Badge color="danger">
                        {atraso}d atraso
                      </Badge>
                    )}
                    {proximoStatus && (
                      <form action={mudarStatusTarefa.bind(null, t.id, proximoStatus)} className="mt-2">
                        <button type="submit" className="text-xs text-accent hover:underline">
                          Mover para: {TAREFA_STATUS[proximoStatus]} →
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
              {doColuna.length === 0 && <p className="text-xs text-muted-foreground">Vazio</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LinhaDoTempo({
  tarefas,
  projeto,
}: {
  tarefas: TarefaComRelacoes[];
  projeto: { dataInicioPrevista: Date; dataTerminoPrevista: Date; dataTerminoRevisada: Date | null };
}) {
  const inicio = projeto.dataInicioPrevista;
  const fim = new Date(
    Math.max(
      projeto.dataTerminoPrevista.getTime(),
      projeto.dataTerminoRevisada?.getTime() ?? 0,
      ...tarefas.map((t) => t.dataTerminoPlanejada.getTime())
    )
  );
  const totalDias = Math.max(1, diasEntre(inicio, fim));

  const corPorStatus: Record<string, string> = {
    concluido: "bg-success",
    atrasado: "bg-danger",
    em_andamento: "bg-accent",
  };

  return (
    <Card className="overflow-x-auto">
      <CardTitle>Linha do tempo</CardTitle>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatarData(inicio)} até {formatarData(fim)}
      </p>
      <div className="mt-4 min-w-[700px] space-y-2">
        {tarefas.map((t) => {
          const offsetDias = Math.max(0, diasEntre(inicio, t.dataInicioPlanejada));
          const duracaoDias = Math.max(1, diasEntre(t.dataInicioPlanejada, t.dataTerminoPlanejada));
          const offsetPct = (offsetDias / totalDias) * 100;
          const larguraPct = Math.max(1, (duracaoDias / totalDias) * 100);
          const cor = corPorStatus[t.status] ?? "bg-secondary";
          return (
            <div key={t.id} className="flex items-center gap-3 text-xs">
              <div className="w-48 shrink-0 truncate text-foreground">
                {t.ehMarco && "🚩 "}
                {t.titulo}
              </div>
              <div className="relative h-5 flex-1 rounded bg-surface-muted">
                <div
                  className={`absolute top-0 h-full rounded ${cor} opacity-80`}
                  style={{ left: `${offsetPct}%`, width: `${larguraPct}%` }}
                  title={`${formatarData(t.dataInicioPlanejada)} → ${formatarData(t.dataTerminoPlanejada)}`}
                />
              </div>
              <div className="w-10 shrink-0 text-right text-muted-foreground">{t.percentualConcluido}%</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-success" /> Concluído
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" /> Em andamento
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-danger" /> Atrasado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-secondary" /> Outros
        </span>
      </div>
    </Card>
  );
}
