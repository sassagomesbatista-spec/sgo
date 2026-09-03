import Link from 'next/link';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { salvarTipoPecaAction, criarTabelaPrecoAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function PrecosPage() {
  const session = getSession();
  if (session.role !== 'admin') redirect('/lancar');

  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();
  const tabelas = db
    .prepare(
      `SELECT tp.*,
        (SELECT COUNT(*) FROM pilotistas WHERE tabela_preco_id = tp.id) AS n_pilotistas,
        (SELECT COUNT(*) FROM modelistas WHERE tabela_preco_id = tp.id) AS n_modelistas
       FROM tabelas_preco tp ORDER BY tp.nome`
    )
    .all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="dollar" />
        </span>
        Regra de Preços
      </h1>
      <p className="subtitle">Valores usados para calcular automaticamente cada lançamento</p>

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
            {tipos.map((t) => (
              <tr key={t.id}>
                <td colSpan={5}>
                  <form action={salvarTipoPecaAction} className="inline-form">
                    <input type="hidden" name="id" value={t.id} />
                    <input name="nome" defaultValue={t.nome} required />
                    <input
                      type="number"
                      step="0.01"
                      name="preco_simples"
                      defaultValue={t.preco_simples ?? ''}
                      placeholder="R$"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="preco_medio"
                      defaultValue={t.preco_medio ?? ''}
                      placeholder="R$"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="preco_dificil"
                      defaultValue={t.preco_dificil ?? ''}
                      placeholder="R$"
                    />
                    <button className="btn-sm" type="submit">
                      Salvar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Novo Tipo de Peça</h2>
      <form action={salvarTipoPecaAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        <label>
          Preço Simples (R$)
          <input type="number" step="0.01" name="preco_simples" />
        </label>
        <label>
          Preço Médio (R$)
          <input type="number" step="0.01" name="preco_medio" />
        </label>
        <label>
          Preço Difícil (R$)
          <input type="number" step="0.01" name="preco_dificil" />
        </label>
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>

      <h2>Tabelas de Preço por Modelista/Pilotista</h2>
      <p className="subtitle">
        Além da regra padrão acima, dá pra criar uma tabela distinta pra uma modelista ou
        pilotista específica — depois é só vincular ela em Modelistas/Pilotistas. Quem não
        tiver tabela vinculada continua usando a Regra de Preços padrão normalmente.
      </p>

      {tabelas.length > 0 && (
        <ul className="ranking" style={{ marginBottom: 20 }}>
          {tabelas.map((t) => (
            <li key={t.id}>
              <div className="ranking-row">
                <Link href={`/precos/tabela/${t.id}`}>{t.nome}</Link>
                <span style={{ color: 'var(--text-light)', fontSize: 13 }}>
                  {t.n_pilotistas > 0 && `${t.n_pilotistas} pilotista(s)`}
                  {t.n_pilotistas > 0 && t.n_modelistas > 0 && ' · '}
                  {t.n_modelistas > 0 && `${t.n_modelistas} modelista(s)`}
                  {t.n_pilotistas === 0 && t.n_modelistas === 0 && 'sem ninguém vinculada ainda'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {tabelas.length === 0 && <p>Nenhuma tabela própria criada ainda.</p>}

      <form action={criarTabelaPrecoAction} className="form">
        <label>
          Nome da tabela (ex: nome da modelista/pilotista)
          <input name="nome" required placeholder="ex: Fulana" />
        </label>
        <button className="btn" type="submit">
          + Nova Tabela
        </button>
      </form>
    </div>
  );
}
