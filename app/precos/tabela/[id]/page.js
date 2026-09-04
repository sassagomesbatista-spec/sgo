import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import {
  salvarTabelaPrecoItemAction,
  renomearTabelaPrecoAction,
  excluirTabelaPrecoAction,
  vincularTabelaPrecoAction,
} from '@/app/actions';
import ConfirmForm from '@/app/ConfirmForm';
import Icon from '@/app/icons';

export default function TabelaPrecoPage({ params }) {
  const session = getSession();
  if (session.role !== 'admin') redirect('/lancar');

  const tabela = db.prepare('SELECT * FROM tabelas_preco WHERE id = ?').get(Number(params.id));
  if (!tabela) notFound();

  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const itens = db
    .prepare('SELECT * FROM tabela_preco_itens WHERE tabela_id = ?')
    .all(tabela.id);
  const itemPorTipo = Object.fromEntries(itens.map((i) => [i.tipo_peca_id, i]));

  const todosPilotistas = db.prepare('SELECT * FROM pilotistas ORDER BY nome').all();
  const todosModelistas = db.prepare('SELECT * FROM modelistas ORDER BY nome').all();
  const nomesVinculados = [
    ...todosPilotistas.filter((p) => p.tabela_preco_id === tabela.id).map((p) => p.nome),
    ...todosModelistas.filter((m) => m.tabela_preco_id === tabela.id).map((m) => m.nome),
  ];

  return (
    <div className="card">
      <p>
        <Link href="/precos">← Todas as tabelas</Link>
      </p>
      <h1>
        <span className="card-icon">
          <Icon name="dollar" />
        </span>
        {tabela.nome}
      </h1>
      <p className="subtitle">
        Valores próprios dessa modelista/pilotista. Campo vazio usa o valor da Regra de Preços
        padrão pra aquele tipo de peça/nível.
      </p>

      <div
        style={{
          background: 'var(--surface, #faf8f5)',
          border: '1px solid var(--border, #e5ded4)',
          borderRadius: 12,
          padding: '16px 18px',
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Quem usa essa tabela</h2>
        <p className="subtitle" style={{ marginTop: -4 }}>
          Marca quem deve usar os preços daqui em vez da Regra padrão. Já salva ao clicar.
        </p>
        {nomesVinculados.length > 0 && (
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Vinculada a: {nomesVinculados.join(', ')}</p>
        )}
        {todosPilotistas.length === 0 && todosModelistas.length === 0 && (
          <p className="subtitle">Nenhuma pilotista/modelista cadastrada ainda.</p>
        )}
        <form action={vincularTabelaPrecoAction} className="inline-form" style={{ flexWrap: 'wrap', gap: 16 }}>
          <input type="hidden" name="tabela_id" value={tabela.id} />
          {todosPilotistas.length > 0 && (
            <div>
              <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-light)', marginBottom: 4 }}>
                Pilotistas
              </p>
              {todosPilotistas.map((p) => (
                <label key={p.id} className="checkbox" style={{ display: 'block', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    name="pilotista_ids"
                    value={p.id}
                    defaultChecked={p.tabela_preco_id === tabela.id}
                  />{' '}
                  {p.nome}
                  {p.tabela_preco_id && p.tabela_preco_id !== tabela.id && (
                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}> (em outra tabela)</span>
                  )}
                </label>
              ))}
            </div>
          )}
          {todosModelistas.length > 0 && (
            <div>
              <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-light)', marginBottom: 4 }}>
                Modelistas
              </p>
              {todosModelistas.map((m) => (
                <label key={m.id} className="checkbox" style={{ display: 'block', marginBottom: 4 }}>
                  <input
                    type="checkbox"
                    name="modelista_ids"
                    value={m.id}
                    defaultChecked={m.tabela_preco_id === tabela.id}
                  />{' '}
                  {m.nome}
                  {m.tabela_preco_id && m.tabela_preco_id !== tabela.id && (
                    <span style={{ fontSize: 11, color: 'var(--text-light)' }}> (em outra tabela)</span>
                  )}
                </label>
              ))}
            </div>
          )}
          {(todosPilotistas.length > 0 || todosModelistas.length > 0) && (
            <button className="btn-sm" type="submit" style={{ alignSelf: 'flex-start' }}>
              Salvar Vínculos
            </button>
          )}
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo de Peça</th>
              <th>Simples</th>
              <th>Médio</th>
              <th>Difícil</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => {
              const item = itemPorTipo[t.id];
              return (
                <tr key={t.id}>
                  <td colSpan={5}>
                    <form action={salvarTabelaPrecoItemAction} className="inline-form">
                      <input type="hidden" name="tabela_id" value={tabela.id} />
                      <input type="hidden" name="tipo_peca_id" value={t.id} />
                      <span style={{ minWidth: 140 }}>{t.nome}</span>
                      <input
                        type="number"
                        step="0.01"
                        name="preco_simples"
                        defaultValue={item?.preco_simples ?? ''}
                        placeholder={t.preco_simples != null ? `padrão: ${t.preco_simples}` : 'R$'}
                      />
                      <input
                        type="number"
                        step="0.01"
                        name="preco_medio"
                        defaultValue={item?.preco_medio ?? ''}
                        placeholder={t.preco_medio != null ? `padrão: ${t.preco_medio}` : 'R$'}
                      />
                      <input
                        type="number"
                        step="0.01"
                        name="preco_dificil"
                        defaultValue={item?.preco_dificil ?? ''}
                        placeholder={t.preco_dificil != null ? `padrão: ${t.preco_dificil}` : 'R$'}
                      />
                      <button className="btn-sm" type="submit">
                        Salvar
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Renomear</h2>
      <form action={renomearTabelaPrecoAction} className="form">
        <input type="hidden" name="id" value={tabela.id} />
        <label>
          Nome
          <input name="nome" defaultValue={tabela.nome} required />
        </label>
        <button className="btn" type="submit">
          Salvar Nome
        </button>
      </form>

      <div className="danger-zone">
        <ConfirmForm
          action={excluirTabelaPrecoAction}
          confirmMessage={`Excluir a tabela "${tabela.nome}"? Só funciona se nenhuma modelista/pilotista estiver usando ela.`}
        >
          <input type="hidden" name="id" value={tabela.id} />
          <button className="btn-sm btn-danger" type="submit">
            Excluir Tabela
          </button>
        </ConfirmForm>
      </div>
    </div>
  );
}
