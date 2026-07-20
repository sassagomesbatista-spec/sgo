import { getProjetoAtual } from "@/lib/projeto";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Field, TextInput, SubmitButton } from "@/components/ui/form";
import { atualizarProjeto } from "./actions";

function paraInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function ConfiguracoesPage() {
  const { projeto, sessao } = await getProjetoAtual();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dados gerais do projeto, orçamento e prazos.</p>
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
    </div>
  );
}
