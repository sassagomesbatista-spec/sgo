import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { salvarTipoPecaAction } from '@/app/actions';

export default function PrecosPage() {
  const session = getSession();
  if (session.role !== 'admin') redirect('/lancar');

  const tipos = db.prepare('SELECT * FROM tipos_peca ORDER BY nome').all();

  return (
    <div className="card">
      <h1>Regra de Preços</h1>
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
    </div>
  );
}
