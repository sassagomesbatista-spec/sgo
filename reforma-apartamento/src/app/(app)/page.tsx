import Link from "next/link";
import { getProjetoAtual } from "@/lib/projeto";
import { carregarDadosDashboard } from "@/lib/dashboard";
import { formatarMoeda, formatarPercentual, formatarData } from "@/lib/money";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LANCAMENTO_STATUS, LANCAMENTO_STATUS_COLOR } from "@/lib/status";
import { BarraHorizontal } from "@/components/charts/barra-horizontal";
import { FluxoCaixaChart } from "@/components/charts/fluxo-caixa";
import { EvolucaoAcumuladaChart } from "@/components/charts/evolucao-acumulada";
import { AlertTriangle, TrendingUp, CalendarClock } from "lucide-react";

export default async function VisaoGeralPage() {
  const { projeto } = await getProjetoAtual();
  const dados = await carregarDadosDashboard(projeto.id);
  const { metrics, graficos, alertas, proximosPagamentos } = dados;

  const saldoDisponivel = metrics.valorEntradas - metrics.valorPago;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Visão Geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumo financeiro e físico de <span className="font-medium">{projeto.nome}</span>
        </p>
      </div>

      {/* Cards financeiros principais */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Orçamento total" value={formatarMoeda(metrics.orcamentoTotalCentavos)} />
        <StatCard label="Total de entradas" value={formatarMoeda(metrics.valorEntradas)} tone="success" />
        <StatCard label="Total pago" value={formatarMoeda(metrics.valorPago)} tone="accent" />
        <StatCard label="Total comprometido (contratado)" value={formatarMoeda(metrics.valorContratado)} />
        <StatCard label="Total previsto" value={formatarMoeda(metrics.valorPrevisto)} />
        <StatCard
          label="Saldo disponível"
          value={formatarMoeda(saldoDisponivel)}
          tone={saldoDisponivel < 0 ? "danger" : "success"}
        />
        <StatCard
          label="Saldo projetado ao final"
          value={formatarMoeda(metrics.saldoProjetado)}
          tone={metrics.saldoProjetado < 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="% orçamento utilizado"
          value={formatarPercentual(metrics.percentualOrcamentoUtilizado)}
          tone={metrics.percentualOrcamentoUtilizado > 1 ? "danger" : "gold"}
        />
      </div>

      {/* Panorama da Reforma */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Panorama da Reforma</CardTitle>
            <CardSubtitle>Prazo e progresso consolidados</CardSubtitle>
          </div>
          <CalendarClock size={20} className="text-accent" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metrica label="Início previsto" valor={formatarData(projeto.dataInicioPrevista)} />
          <Metrica label="Término original" valor={formatarData(projeto.dataTerminoPrevista)} />
          <Metrica label="Previsão atual de término" valor={formatarData(metrics.terminoAtual)} />
          <Metrica
            label="Atraso / adiantamento"
            valor={`${metrics.diasAtrasoGeral >= 0 ? "+" : ""}${metrics.diasAtrasoGeral} dia(s)`}
            destaque={metrics.diasAtrasoGeral > 0 ? "danger" : "success"}
          />
        </div>

        <div className="mt-5 space-y-3">
          <BarraProgresso label="% do prazo consumido" valor={metrics.percentualPrazoConsumido} />
          <BarraProgresso label="% físico concluído" valor={metrics.progressoFisico} tone="secondary" />
          <BarraProgresso label="% financeiro consumido" valor={metrics.progressoFinanceiro} tone="accent" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <Metrica label="Dias restantes" valor={`${metrics.diasRestantes} dia(s)`} />
          <Metrica label="Pagamentos vencidos" valor={String(metrics.qtdVencidos)} destaque={metrics.qtdVencidos > 0 ? "danger" : undefined} />
          <Metrica label="Próx. 7 / 15 / 30 dias" valor={`${metrics.qtdProximos7} / ${metrics.qtdProximos15} / ${metrics.qtdProximos30}`} />
        </div>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Fluxo de caixa mensal</CardTitle>
          <CardSubtitle>Entradas x saídas por mês de vencimento</CardSubtitle>
          <div className="mt-3">
            <FluxoCaixaChart dados={graficos.fluxoCaixaMensal} />
          </div>
        </Card>
        <Card>
          <CardTitle>Evolução acumulada dos gastos</CardTitle>
          <CardSubtitle>Realizado acumulado x orçamento total</CardSubtitle>
          <div className="mt-3">
            <EvolucaoAcumuladaChart
              dados={graficos.evolucaoAcumulada}
              orcamentoTotalCentavos={metrics.orcamentoTotalCentavos}
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Gastos por ambiente</CardTitle>
          <div className="mt-3">
            {graficos.despesasPorAmbiente.length ? (
              <BarraHorizontal dados={graficos.despesasPorAmbiente.slice(0, 8)} />
            ) : (
              <EmptyState title="Sem despesas por ambiente ainda" />
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Gastos por categoria</CardTitle>
          <div className="mt-3">
            {graficos.despesasPorCategoria.length ? (
              <BarraHorizontal dados={graficos.despesasPorCategoria.slice(0, 8)} />
            ) : (
              <EmptyState title="Sem despesas por categoria ainda" />
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Gastos por fornecedor</CardTitle>
          <div className="mt-3">
            {graficos.despesasPorFornecedor.length ? (
              <BarraHorizontal dados={graficos.despesasPorFornecedor.slice(0, 8)} />
            ) : (
              <EmptyState title="Sem despesas por fornecedor ainda" />
            )}
          </div>
        </Card>
      </div>

      {/* Próximos pagamentos e alertas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            <CardTitle>Próximos pagamentos (30 dias)</CardTitle>
          </div>
          <div className="mt-3 space-y-2">
            {proximosPagamentos.length === 0 && (
              <EmptyState title="Nenhum pagamento previsto nos próximos 30 dias" />
            )}
            {proximosPagamentos.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{l.descricao}</p>
                  <p className="text-xs text-muted-foreground">{formatarData(l.dataVencimento)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{formatarMoeda(l.valorCentavos)}</span>
                  <Badge color={LANCAMENTO_STATUS_COLOR[l.status]}>{LANCAMENTO_STATUS[l.status]}</Badge>
                </div>
              </div>
            ))}
          </div>
          <Link href="/lancamentos" className="mt-3 inline-block text-sm text-accent hover:underline">
            Ver todos os lançamentos →
          </Link>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger" />
            <CardTitle>Alertas e pendências</CardTitle>
          </div>
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {alertas.length === 0 && <EmptyState title="Nenhum alerta no momento" description="Tudo em dia por aqui." />}
            {alertas.slice(0, 20).map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
                <Badge color={a.severidade === "alta" ? "danger" : "warning"}>
                  {a.severidade === "alta" ? "Alta" : "Média"}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">{a.detalhe}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metrica({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: "danger" | "success";
}) {
  const cor = destaque === "danger" ? "text-danger" : destaque === "success" ? "text-success" : "text-foreground";
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${cor}`}>{valor}</p>
    </div>
  );
}

function BarraProgresso({
  label,
  valor,
  tone = "accent",
}: {
  label: string;
  valor: number;
  tone?: "accent" | "secondary";
}) {
  const pct = Math.min(100, Math.max(0, valor * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{formatarPercentual(valor)}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className={`h-full rounded-full ${tone === "accent" ? "bg-accent" : "bg-secondary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
