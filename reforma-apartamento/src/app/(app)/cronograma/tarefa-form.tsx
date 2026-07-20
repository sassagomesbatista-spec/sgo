import { Field, TextInput, SelectInput, TextArea, SubmitButton } from "@/components/ui/form";
import { TAREFA_STATUS } from "@/lib/status";

type TarefaValores = {
  titulo: string;
  descricao: string | null;
  ambienteId: string | null;
  categoriaId: string | null;
  responsavel: string | null;
  fornecedorId: string | null;
  dataInicioPlanejada: Date;
  dataTerminoPlanejada: Date;
  dataInicioReal: Date | null;
  dataTerminoReal: Date | null;
  percentualConcluido: number;
  status: string;
  prioridade: string;
  custoPrevistoCentavos: number;
  custoRealizadoCentavos: number;
  ehMarco: boolean;
  observacoes: string | null;
};

function paraInputDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function TarefaForm({
  action,
  ambientes,
  categorias,
  fornecedores,
  todasTarefas,
  valores,
  tarefaId,
  dependenciasAtuais,
  modoEdicao,
}: {
  action: (formData: FormData) => Promise<void>;
  ambientes: { id: string; nome: string }[];
  categorias: { id: string; nome: string }[];
  fornecedores: { id: string; nome: string }[];
  todasTarefas: { id: string; titulo: string }[];
  valores?: TarefaValores;
  tarefaId?: string;
  dependenciasAtuais?: string[];
  modoEdicao?: boolean;
}) {
  return (
    <form action={action} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field label="Título" className="md:col-span-2">
        <TextInput name="titulo" required defaultValue={valores?.titulo ?? ""} />
      </Field>
      <Field label="Prioridade">
        <SelectInput name="prioridade" defaultValue={valores?.prioridade ?? "media"}>
          <option value="alta">Alta</option>
          <option value="media">Média</option>
          <option value="baixa">Baixa</option>
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
      <Field label="Responsável">
        <TextInput name="responsavel" defaultValue={valores?.responsavel ?? ""} />
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
      <Field label="Status">
        <SelectInput name="status" defaultValue={valores?.status ?? "nao_iniciado"}>
          {Object.entries(TAREFA_STATUS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="% concluído">
        <TextInput
          name="percentualConcluido"
          type="number"
          min="0"
          max="100"
          defaultValue={valores?.percentualConcluido ?? 0}
        />
      </Field>
      <Field label="Início planejado">
        <TextInput
          name="dataInicioPlanejada"
          type="date"
          required
          defaultValue={paraInputDate(valores?.dataInicioPlanejada) || undefined}
        />
      </Field>
      <Field label="Término planejado">
        <TextInput
          name="dataTerminoPlanejada"
          type="date"
          required
          defaultValue={paraInputDate(valores?.dataTerminoPlanejada) || undefined}
        />
      </Field>
      <Field label="Início real">
        <TextInput name="dataInicioReal" type="date" defaultValue={paraInputDate(valores?.dataInicioReal)} />
      </Field>
      <Field label="Término real">
        <TextInput name="dataTerminoReal" type="date" defaultValue={paraInputDate(valores?.dataTerminoReal)} />
      </Field>
      <Field label="Custo previsto (R$)">
        <TextInput
          name="custoPrevisto"
          type="number"
          step="0.01"
          defaultValue={valores ? (valores.custoPrevistoCentavos / 100).toFixed(2) : "0"}
        />
      </Field>
      <Field label="Custo realizado (R$)">
        <TextInput
          name="custoRealizado"
          type="number"
          step="0.01"
          defaultValue={valores ? (valores.custoRealizadoCentavos / 100).toFixed(2) : "0"}
        />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
        <input type="checkbox" name="ehMarco" defaultChecked={valores?.ehMarco ?? false} />
        Marco importante
      </label>
      <Field label="Depende de (segurar Ctrl/Cmd para múltiplos)" className="md:col-span-3">
        <SelectInput name="dependeDe" multiple defaultValue={dependenciasAtuais ?? []} className="h-28">
          {todasTarefas
            .filter((t) => t.id !== tarefaId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
        </SelectInput>
      </Field>
      <Field label="Descrição" className="md:col-span-3">
        <TextArea name="descricao" rows={2} defaultValue={valores?.descricao ?? ""} />
      </Field>
      <Field label="Observações" className="md:col-span-3">
        <TextArea name="observacoes" rows={2} defaultValue={valores?.observacoes ?? ""} />
      </Field>
      <div className="md:col-span-3">
        <SubmitButton>{modoEdicao ? "Salvar alterações" : "Adicionar tarefa"}</SubmitButton>
      </div>
    </form>
  );
}
