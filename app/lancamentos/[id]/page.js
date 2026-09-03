import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { atualizarLancamentoAction, excluirLancamentoAction } from '@/app/actions';
import SelectOrNew from '@/app/SelectOrNew';
import Icon from '@/app/icons';
import ConfirmForm from '@/app/ConfirmForm';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function EditarLancamentoPage({ params }) {
  const session = getSession();
  const row = db.prepare('SELECT * FROM lancamentos WHERE id = ?').get(Number(params.id));
  if (!row) notFound();

  const isAdmin = session.role === 'admin';
  if (!isAdmin && row.mes_ano !== currentMonth()) {
    redirect('/lancamentos');
  }

  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const pilotistas = db.prepare('SELECT * FROM pilotistas ORDER BY nome').all();
  const clientes = db.prepare('SELECT nome FROM clientes ORDER BY nome').all().map((c) => c.nome);
  const modelistas = db.prepare('SELECT nome FROM modelistas ORDER BY nome').all().map((m) => m.nome);
  const tamanhos = db.prepare('SELECT nome FROM tamanhos ORDER BY nome').all().map((t) => t.nome);

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="list" />
        </span>
        Editar Peça
      </h1>
      <p className="subtitle">Ref. {row.referencia || row.id}</p>
      <form action={atualizarLancamentoAction} className="form-grid">
        <input type="hidden" name="id" value={row.id} />

        <div className="field-full form-section-label">Identificação</div>
        <label>
          Data
          <input type="date" name="data" defaultValue={row.data} required />
        </label>
        <label>
          Referência
          <input name="referencia" defaultValue={row.referencia || ''} />
        </label>
        <label>
          Cliente
          <SelectOrNew name="cliente" options={clientes} defaultValue={row.cliente || ''} />
        </label>
        <label>
          Descrição do Produto
          <input name="descricao_produto" defaultValue={row.descricao_produto || ''} />
        </label>

        <div className="field-full form-section-label">Peça</div>
        <label>
          Tipo de Peça
          <select name="tipo_peca_id" defaultValue={row.tipo_peca_id || ''} required>
            <option value="" disabled>
              Selecione...
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tamanho
          <SelectOrNew name="tamanho" options={tamanhos} defaultValue={row.tamanho || ''} />
        </label>
        <label>
          Nível
          <select name="nivel" defaultValue={row.nivel || ''} required>
            <option value="" disabled>
              Selecione...
            </option>
            <option value="Simples">Simples</option>
            <option value="Médio">Médio</option>
            <option value="Difícil">Difícil</option>
          </select>
        </label>
        <label>
          Pilotista
          <select name="pilotista_id" defaultValue={row.pilotista_id || ''} required>
            <option value="" disabled>
              Selecione...
            </option>
            {pilotistas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="field-full form-section-label">Produção</div>
        <label>
          Nome da Modelista
          <SelectOrNew name="nome_modelista" options={modelistas} defaultValue={row.nome_modelista || ''} />
        </label>
        <label>
          Aprovação
          <select name="aprovacao" defaultValue={row.aprovacao || 'Pendente'}>
            <option value="Pendente">Pendente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Reprovado">Reprovado</option>
          </select>
        </label>
        {isAdmin && (
          <label>
            Valor Pilotista (R$)
            <input type="number" step="0.01" name="valor" defaultValue={row.valor ?? ''} />
          </label>
        )}
        {isAdmin && (
          <label>
            Valor Modelista (R$)
            <input
              type="number"
              step="0.01"
              name="valor_modelista"
              defaultValue={row.valor_modelista ?? ''}
              placeholder="vazio = recalcula pela tabela dela, se tiver"
            />
          </label>
        )}
        <label className="field-full">
          Observações
          <textarea name="observacoes" rows={3} defaultValue={row.observacoes || ''}></textarea>
        </label>

        <button className="btn field-full" type="submit">
          Salvar Alterações
        </button>
      </form>

      <div className="danger-zone">
        <ConfirmForm
          action={excluirLancamentoAction}
          confirmMessage="Tem certeza que quer excluir esse lançamento? Essa ação não pode ser desfeita."
        >
          <input type="hidden" name="id" value={row.id} />
          <button className="btn-sm btn-danger" type="submit">
            Excluir Peça
          </button>
        </ConfirmForm>
      </div>
    </div>
  );
}
