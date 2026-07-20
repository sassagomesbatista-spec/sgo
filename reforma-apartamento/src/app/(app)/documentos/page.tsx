import { getProjetoAtual } from "@/lib/projeto";
import { prisma } from "@/lib/prisma";
import { formatarData } from "@/lib/money";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Field, TextInput, SelectInput, SubmitButton } from "@/components/ui/form";
import { ConfirmDeleteButton } from "@/components/ui/confirm-delete-button";
import { FileText } from "lucide-react";
import { criarDocumento, excluirDocumento } from "./actions";

const TIPOS_DOCUMENTO = [
  "contrato",
  "proposta",
  "orcamento",
  "nota_fiscal",
  "recibo",
  "comprovante",
  "planta",
  "projeto",
  "manual",
  "garantia",
  "foto",
  "ata",
  "autorizacao",
  "condominio",
];

export default async function DocumentosPage() {
  const { projeto } = await getProjetoAtual();

  const [documentos, ambientes, fornecedores] = await Promise.all([
    prisma.documento.findMany({
      where: { projetoId: projeto.id, deletedAt: null },
      include: { ambiente: true, fornecedor: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ambiente.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { ordem: "asc" } }),
    prisma.fornecedor.findMany({ where: { projetoId: projeto.id, deletedAt: null }, orderBy: { nome: "asc" } }),
  ]);

  const hoje = new Date();
  const em30Dias = new Date(hoje);
  em30Dias.setDate(em30Dias.getDate() + 30);
  const vencendo = documentos.filter((d) => d.dataValidade && d.dataValidade <= em30Dias && d.dataValidade >= hoje);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Documentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Central de contratos, notas, comprovantes e projetos.</p>
      </div>

      {vencendo.length > 0 && (
        <Card>
          <CardTitle>Vencendo nos próximos 30 dias</CardTitle>
          <div className="mt-2 space-y-1">
            {vencendo.map((d) => (
              <p key={d.id} className="text-sm text-warning-fg">
                {d.nome} — vence em {formatarData(d.dataValidade)}
              </p>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">+ Novo documento</summary>
          <form action={criarDocumento} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" encType="multipart/form-data">
            <Field label="Nome" className="md:col-span-2">
              <TextInput name="nome" required />
            </Field>
            <Field label="Tipo">
              <SelectInput name="tipo" defaultValue="contrato">
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Ambiente relacionado">
              <SelectInput name="ambienteId" defaultValue="">
                <option value="">Nenhum</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Fornecedor relacionado">
              <SelectInput name="fornecedorId" defaultValue="">
                <option value="">Nenhum</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Responsável">
              <TextInput name="responsavel" />
            </Field>
            <Field label="Data de validade (opcional)">
              <TextInput name="dataValidade" type="date" />
            </Field>
            <Field label="Tags">
              <TextInput name="tags" placeholder="separadas por vírgula" />
            </Field>
            <Field label="Arquivo" className="md:col-span-2">
              <input type="file" name="arquivo" required className="block w-full text-sm text-muted-foreground" />
            </Field>
            <div className="md:col-span-3">
              <SubmitButton>Enviar documento</SubmitButton>
            </div>
          </form>
        </details>
      </Card>

      {documentos.length === 0 ? (
        <EmptyState title="Nenhum documento enviado ainda" />
      ) : (
        <Card>
          <CardTitle>Documentos ({documentos.length})</CardTitle>
          <div className="mt-3 divide-y divide-border">
            {documentos.map((d) => {
              const excluirComId = excluirDocumento.bind(null, d.id);
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={16} className="shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <a href={d.url} target="_blank" className="truncate text-sm font-medium text-accent hover:underline">
                        {d.nome}
                      </a>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.tipo} · v{d.versao} · {d.ambiente?.nome ?? d.fornecedor?.nome ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge color={d.statusAprovacao === "aprovado" ? "success" : "neutral"}>{d.statusAprovacao}</Badge>
                    <ConfirmDeleteButton action={excluirComId} confirmMessage={`Excluir "${d.nome}"?`} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
