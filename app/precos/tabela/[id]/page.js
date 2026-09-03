import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import {
  salvarTabelaPrecoItemAction,
  renomearTabelaPrecoAction,
  excluirTabelaPrecoAction,
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

  const pilotistas = db
    .prepare('SELECT nome FROM pilotistas WHERE tabela_preco_id = ? ORDER BY nome')
    .all(tabela.id);
  const modelistas = db
    .prepare('SELECT nome FROM modelistas WHERE tabela_preco_id = ? ORDER BY nome')
    .all(tabela.id);

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

      {(pilotistas.length > 0 || modelistas.length > 0) && (
        <p className="subtitle">
          Vinculada a:{' '}
          {[...pilotistas.map((p) => p.nome), ...modelistas.map((m) => m.nome)].join(', ')}
        </p>
      )}

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
