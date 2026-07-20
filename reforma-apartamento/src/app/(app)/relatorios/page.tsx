import { Card, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Download } from "lucide-react";

const RELATORIOS = [
  { tipo: "resumo-financeiro", titulo: "Resumo financeiro geral", desc: "Orçamento, entradas, pago, contratado e saldo." },
  { tipo: "orcamento-vs-realizado", titulo: "Orçamento x realizado", desc: "Estimado, aprovado, contratado e pago por item." },
  { tipo: "despesas-por-ambiente", titulo: "Despesas por ambiente", desc: "Total de saídas agrupado por ambiente." },
  { tipo: "despesas-por-categoria", titulo: "Despesas por categoria", desc: "Total de saídas agrupado por categoria." },
  { tipo: "despesas-por-fornecedor", titulo: "Despesas por fornecedor", desc: "Total de saídas agrupado por fornecedor." },
  { tipo: "pagamentos-futuros", titulo: "Pagamentos futuros", desc: "Saídas com vencimento a partir de hoje." },
  { tipo: "pagamentos-vencidos", titulo: "Pagamentos vencidos", desc: "Lançamentos com status vencido." },
  { tipo: "despesas-sem-comprovante", titulo: "Despesas sem comprovante", desc: "Pagas sem anexo de comprovante." },
  { tipo: "contratos-saldos", titulo: "Contratos e saldos", desc: "Valor total, pago e saldo por contrato." },
  { tipo: "cronograma", titulo: "Cronograma planejado x realizado", desc: "Datas planejadas, reais e % concluído." },
  { tipo: "tarefas-atrasadas", titulo: "Tarefas atrasadas", desc: "Etapas em atraso e dias de atraso." },
  {
    tipo: "fornecedores-resumo",
    titulo: "Fornecedores (versão compartilhável)",
    desc: "Sem dados bancários — para enviar à arquiteta ou outros profissionais.",
  },
];

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Relatórios</h1>
        <p className="mt-1 text-sm text-muted-foreground">Exportações em CSV, prontas para abrir no Excel/Sheets.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RELATORIOS.map((r) => (
          <Card key={r.tipo}>
            <CardTitle>{r.titulo}</CardTitle>
            <CardSubtitle>{r.desc}</CardSubtitle>
            <a
              href={`/api/relatorios/${r.tipo}`}
              className="mt-3 inline-flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <Download size={14} /> Baixar CSV
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
