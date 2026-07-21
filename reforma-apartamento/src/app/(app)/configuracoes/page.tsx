import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/money";
import { calcularSaldoConta } from "@/lib/calculos";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, TextArea, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { atualizarProjeto, criarContaBancaria, atualizarContaBancaria, excluirContaBancaria } from "./actions";

function paraInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function ConfiguracoesPage() {
  const { projeto, sessao } = await getProjetoAtual();

  const contas = await prisma.contaBancaria.findMany({
    where: { projetoId: projeto.id, deletedAt: null },
    include: { lancamentos: { where: { deletedAt: null } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados gerais do projeto, orçamento, prazos e contas.</p>
      </div>

      <Card>
        <CardTitle>Conta</CardTitle>
        <div className="mt-3 space-y-1 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Nome</span>
            <span>{sessao.name}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted-foreground">E-mail</span>
            <span>{sessao.email}</span>
          </p>
        </div>
      </Card>

      <Card>
        <CardTitle>Projeto, orçamento e prazos</CardTitle>
        <CardSubtitle>
          Moeda: BRL (real brasileiro) · Fuso horário: America/Sao_Paulo — outras moedas/localizações poderão ser
          adicionadas futuramente.
        </CardSubtitle>
        <form action={atualizarProjeto} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Nome do projeto" className="md:col-span-2">
            <TextInput name="nome" defaultValue={projeto.nome} required />
          </Field>
          <Field label="Orçamento total (R$)">
            <TextInput
              name="orcamentoTotal"
              type="number"
              step="0.01"
              defaultValue={(projeto.orcamentoTotalCentavos / 100).toFixed(2)}
              required
            />
          </Field>
          <Field label="Reserva de contingência (%)">
            <TextInput
              name="reservaContingencia"
              type="number"
              step="0.1"
              min="0"
              max="100"
              defaultValue={projeto.reservaContingenciaPercent}
            />
          </Field>
          <Field label="Início previsto">
            <TextInput
              name="dataInicioPrevista"
              type="date"
              defaultValue={paraInputDate(projeto.dataInicioPrevista)}
              required
            />
          </Field>
          <Field label="Término original previsto">
            <TextInput
              name="dataTerminoPrevista"
              type="date"
              defaultValue={paraInputDate(projeto.dataTerminoPrevista)}
              required
            />
          </Field>
          <Field label="Término revisado (se houver atraso)">
            <TextInput
              name="dataTerminoRevisada"
              type="date"
              defaultValue={paraInputDate(projeto.dataTerminoRevisada)}
            />
          </Field>
          <div className="md:col-span-3">
            <SubmitButton>Salvar configurações</SubmitButton>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle>Contas bancárias</CardTitle>
        <CardSubtitle>
          Informe o saldo real da sua conta numa data de referência — o saldo atual é calculado somando as entradas
          e subtraindo as saídas já pagas vinculadas a essa conta a partir dessa data. Você não precisa lançar todo o
          histórico anterior pra ter o saldo certo.
        </CardSubtitle>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Nova conta bancária</summary>
          <form action={criarContaBancaria} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Nome da conta">
              <TextInput name="nome" required placeholder="Ex: Conta Corrente Itaú" />
            </Field>
            <Field label="Saldo inicial (R$)">
              <TextInput name="saldoInicial" type="number" step="0.01" defaultValue="0" required />
            </Field>
            <Field label="Data de referência do saldo">
              <TextInput name="dataSaldoInicial" type="date" required defaultValue={paraInputDate(new Date())} />
            </Field>
            <Field label="Observações" className="md:col-span-3">
              <TextArea name="observacoes" rows={2} />
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>Adicionar conta</SubmitButton>
            </div>
          </form>
        </details>

        {contas.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nenhuma conta bancária cadastrada" description="Adicione uma acima para integrar o saldo." />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {contas.map((conta) => {
              const saldoAtual = calcularSaldoConta(
                conta.saldoInicialCentavos,
                conta.dataSaldoInicial,
                conta.lancamentos
              );
              const atualizarComId = atualizarContaBancaria.bind(null, conta.id);
              const excluirComId = excluirContaBancaria.bind(null, conta.id);
              return (
                <div key={conta.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-foreground">{conta.nome}</p>
                    <ConfirmDeleteButton
                      action={excluirComId}
                      confirmMessage={`Excluir a conta "${conta.nome}"? Os lançamentos vinculados a ela ficam sem conta.`}
                    />
                  </div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                    {formatarMoeda(saldoAtual)}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo atual</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Saldo inicial de {formatarMoeda(conta.saldoInicialCentavos)} em{" "}
                    {paraInputDate(conta.dataSaldoInicial)} · {conta.lancamentos.length} lançamento(s) vinculado(s)
                  </p>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-accent">Editar</summary>
                    <form action={atualizarComId} className="mt-3 grid grid-cols-1 gap-3">
                      <Field label="Nome da conta">
                        <TextInput name="nome" defaultValue={conta.nome} required />
                      </Field>
                      <Field label="Saldo inicial (R$)">
                        <TextInput
                          name="saldoInicial"
                          type="number"
                          step="0.01"
                          defaultValue={(conta.saldoInicialCentavos / 100).toFixed(2)}
                          required
                        />
                      </Field>
                      <Field label="Data de referência do saldo">
                        <TextInput
                          name="dataSaldoInicial"
                          type="date"
                          defaultValue={paraInputDate(conta.dataSaldoInicial)}
                          required
                        />
                      </Field>
                      <Field label="Observações">
                        <TextArea name="observacoes" rows={2} defaultValue={conta.observacoes ?? ""} />
                      </Field>
                      <SubmitButton>Salvar</SubmitButton>
                    </form>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
