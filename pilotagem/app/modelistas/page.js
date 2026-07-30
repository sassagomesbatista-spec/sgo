import db from '@/lib/db';
import { salvarModelistaAction } from '@/app/actions';
import Icon from '@/app/icons';

export default function ModelistasPage() {
  const modelistas = db.prepare('SELECT * FROM modelistas ORDER BY nome').all();

  return (
    <div className="card">
      <h1>
        <span className="card-icon">
          <Icon name="user" />
        </span>
        Modelistas
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
            {modelistas.map((m) => (
              <tr key={m.id}>
                <td colSpan={2}>
                  <form action={salvarModelistaAction} className="inline-form">
                    <input type="hidden" name="id" value={m.id} />
                    <input name="nome" defaultValue={m.nome} required />
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
        <button className="btn" type="submit">
          Adicionar
        </button>
      </form>
    </div>
  );
}
