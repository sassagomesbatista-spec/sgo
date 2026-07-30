import { Field, TextInput, SelectInput, TextArea, SubmitButton } from "@/components/ui/form";

type FornecedorValores = {
  nome: string;
  tipo: string;
  empresa: string | null;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  dadosBancarios: string | null;
  pix: string | null;
  contatoPrincipal: string | null;
  especialidade: string | null;
  avaliacao: number | null;
  status: string;
  observacoes: string | null;
};

export function FornecedorForm({
  action,
  valores,
  modoEdicao,
}: {
  action: (formData: FormData) => Promise<void>;
  valores?: FornecedorValores;
  modoEdicao?: boolean;
}) {
  return (
    <form action={action} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field label="Nome">
        <TextInput name="nome" required defaultValue={valores?.nome ?? ""} />
      </Field>
      <Field label="Tipo">
        <SelectInput name="tipo" defaultValue={valores?.tipo ?? "empresa"}>
          <option value="empresa">Empresa</option>
          <option value="pessoa física">Pessoa física</option>
        </SelectInput>
      </Field>
      <Field label="Especialidade">
        <TextInput name="especialidade" defaultValue={valores?.especialidade ?? ""} />
      </Field>
      <Field label="Empresa">
        <TextInput name="empresa" defaultValue={valores?.empresa ?? ""} />
      </Field>
      <Field label="CPF/CNPJ">
        <TextInput name="documento" defaultValue={valores?.documento ?? ""} />
      </Field>
      <Field label="Status">
        <SelectInput name="status" defaultValue={valores?.status ?? "ativo"}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </SelectInput>
      </Field>
      <Field label="Telefone">
        <TextInput name="telefone" defaultValue={valores?.telefone ?? ""} />
      </Field>
      <Field label="E-mail">
        <TextInput name="email" type="email" defaultValue={valores?.email ?? ""} />
      </Field>
      <Field label="Contato principal">
        <TextInput name="contatoPrincipal" defaultValue={valores?.contatoPrincipal ?? ""} />
      </Field>
      <Field label="Endereço" className="md:col-span-3">
        <TextInput name="endereco" defaultValue={valores?.endereco ?? ""} />
      </Field>
      <Field label="Dados bancários">
        <TextInput name="dadosBancarios" defaultValue={valores?.dadosBancarios ?? ""} />
      </Field>
      <Field label="Chave Pix">
        <TextInput name="pix" defaultValue={valores?.pix ?? ""} />
      </Field>
      <Field label="Avaliação (1-5)">
        <TextInput name="avaliacao" type="number" min="1" max="5" defaultValue={valores?.avaliacao ?? ""} />
      </Field>
      <Field label="Observações" className="md:col-span-3">
        <TextArea name="observacoes" rows={2} defaultValue={valores?.observacoes ?? ""} />
      </Field>
      <div className="md:col-span-3">
        <SubmitButton>{modoEdicao ? "Salvar alterações" : "Adicionar fornecedor"}</SubmitButton>
      </div>
    </form>
  );
}
