import db from '@/lib/db';
import { getSession, homeFor } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { salvarClienteAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function ClientesPage() {
  const session = getSession();
  if (session.role === 'pilotista') redirect(homeFor(session.role));
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY nome').all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="users" />
        </span>
        Clientes
      </h1>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td colSpan={2}>
                  <form action={salvarClienteAction} className="inline-form">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="nome" defaultValue={c.nome} required />
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

      <h2>Novo Cliente</h2>
      <form action={salvarClienteAction} className="form">
        <label>
          Nome
          <input name="nome" required />
        </label>
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>
    </div>
  );
}
