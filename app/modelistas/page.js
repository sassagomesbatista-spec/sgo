import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { salvarModelistaAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function ModelistasPage() {
  const session = getSession();
  const isAdmin = session.role === 'admin';
  const modelistas = db.prepare('SELECT * FROM modelistas ORDER BY nome').all();
  const tabelas = isAdmin ? db.prepare('SELECT * FROM tabelas_preco ORDER BY nome').all() : [];

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="user" />
        </span>
        Modelistas
      </h1>
      {isAdmin && (
        <p className="subtitle">
          Vincular uma tabela de preço é opcional — sem ela, essa modelista continua só sendo
          registrada nas peças, sem valor calculado (como sempre foi).
        </p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              {isAdmin && <th>Tabela de Preço</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {modelistas.map((m) => (
              <tr key={m.id}>
                <td colSpan={isAdmin ? 3 : 2}>
                  <form action={salvarModelistaAction} className="inline-form">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="nome" defaultValue={m.nome} required />
                    {isAdmin && (
                      <select name="tabela_preco_id" defaultValue={m.tabela_preco_id || ''}>
                        <option value="">Sem valor calculado</option>
                        {tabelas.map((t) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    )}
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

      <h2>Nova Modelista</h2>
      <form action={salvarModelistaAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        {isAdmin && (
          <label>
            Tabela de Preço
            <select name="tabela_preco_id" defaultValue="">
              <option value="">Sem valor calculado</option>
              {tabelas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </label>
        )}
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>
    </div>
  );
}
